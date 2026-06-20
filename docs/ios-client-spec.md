# GDM Send — iOS client spec

Spec for an iOS app that lets users send files to the Gaviso agency. The app is a thin client over the existing web platform's public REST API. **No server-side changes are required.**

- Web platform: <https://gdmsend.gaviso.agency> (this repo: `gaviso/gdm-send-web`)
- Suggested iOS repo: `gaviso/gdm-send-ios`
- Min iOS: 16.0 · Swift 5.9+ · SwiftUI · no third-party deps

---

## API contract

The web exposes a small public REST API for the upload flow. None of these endpoints require auth.

### 1. Create transfer

`POST /api/transfers`

Request body:

```json
{
  "sender_name": "Jane Smith",
  "sender_email": "jane@company.com",
  "subject": "Newsletter materials",
  "message": "Hi, this is for the newsletter this month.",
  "files": [
    { "filename": "logo.png", "file_size": 12345, "mime_type": "image/png" },
    { "filename": "copy.docx", "file_size": 56789, "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  ]
}
```

Validation (server-side):
- `sender_name`, `sender_email`, `subject`, `message` all required (non-empty)
- `files[]` required, total size ≤ 5 GB (5,368,709,120 bytes)

Response (200):

```json
{
  "id": "c0cb2b12-156c-44c8-badc-e1bd33cbdf0d",
  "files": [
    {
      "id": "0a1b2c3d-...",
      "filename": "logo.png",
      "storage_path": "c0cb2b12-.../0a1b2c3d-...-logo.png",
      "mime_type": "image/png"
    }
  ]
}
```

### 2. Get a presigned upload URL (per file)

`POST /api/uploads/presign`

Request body:

```json
{
  "transfer_id": "c0cb2b12-...",
  "file_id": "0a1b2c3d-...",
  "storage_path": "c0cb2b12-.../0a1b2c3d-...-logo.png",
  "content_type": "image/png"
}
```

Response (200):

```json
{ "url": "https://gdm-send.s3.us-west-001.backblazeb2.com/...?X-Amz-..." }
```

The URL is a presigned **S3 PUT** to Backblaze B2. Upload bytes directly from the device:

```
PUT <url>
Content-Type: <content_type>     (must match what was sent in the presign request)
<file bytes>
```

The B2 bucket already has CORS rules for the web origin — native iOS apps don't preflight, so this works without changes.

### 3. Mark the transfer as received

`PATCH /api/transfers/{id}`

Request body:

```json
{ "status": "received" }
```

Response: 200 with `{ "success": true }`. Call this once **all** files have uploaded successfully.

> Status lifecycle: `uploading` → `received` (set by client when uploads finish) → `downloaded` (set automatically server-side when admin first downloads) → `expired` / `deleted` (server-managed).

---

## Suggested Swift architecture

### Project layout

```
GDMSendiOS/
  App/                  — SwiftUI entry, navigation
  Features/Upload/      — file picker, form, progress views
  Networking/
    GDMSendClient.swift
    UploadCoordinator.swift   — URLSession background config
    Models.swift
    Errors.swift
  Config/Environment.swift
```

### Environment

```swift
struct GDMEnvironment {
    let apiBaseURL: URL        // https://gdmsend.gaviso.agency
    let maxFileSize: Int64     // 5_368_709_120
    let maxTransferSize: Int64

    static let production = GDMEnvironment(
        apiBaseURL: URL(string: "https://gdmsend.gaviso.agency")!,
        maxFileSize: 5_368_709_120,
        maxTransferSize: 5_368_709_120
    )
}
```

### Models (mirror the API shapes)

```swift
struct FileSpec: Codable {
    let filename: String
    let fileSize: Int64
    let mimeType: String
    enum CodingKeys: String, CodingKey {
        case filename, fileSize = "file_size", mimeType = "mime_type"
    }
}

struct CreateTransferRequest: Encodable {
    let senderName: String
    let senderEmail: String
    let subject: String
    let message: String
    let files: [FileSpec]
    enum CodingKeys: String, CodingKey {
        case senderName = "sender_name", senderEmail = "sender_email",
             subject, message, files
    }
}

struct CreateTransferResponse: Decodable {
    let id: String
    let files: [TransferFileRecord]
}

struct TransferFileRecord: Decodable {
    let id: String
    let filename: String
    let storagePath: String
    let mimeType: String
    enum CodingKeys: String, CodingKey {
        case id, filename, storagePath = "storage_path", mimeType = "mime_type"
    }
}

struct PresignRequest: Encodable {
    let transferId: String
    let fileId: String
    let storagePath: String
    let contentType: String
    enum CodingKeys: String, CodingKey {
        case transferId = "transfer_id", fileId = "file_id",
             storagePath = "storage_path", contentType = "content_type"
    }
}

struct PresignResponse: Decodable { let url: URL }
```

### Errors

```swift
enum GDMSendError: Error {
    case validation(String)               // size, mime, missing field
    case network(URLError)
    case server(status: Int, message: String?)
    case uploadFailed(filename: String, underlying: Error?)
    case decoding(Error)
}
```

### Client

```swift
actor GDMSendClient {
    let env: GDMEnvironment
    private let session: URLSession = .shared

    init(env: GDMEnvironment = .production) { self.env = env }

    // 1. Create the transfer record
    func createTransfer(_ req: CreateTransferRequest) async throws -> CreateTransferResponse {
        try await postJSON("/api/transfers", body: req)
    }

    // 2. Get a presigned upload URL for one file
    func presign(_ req: PresignRequest) async throws -> PresignResponse {
        try await postJSON("/api/uploads/presign", body: req)
    }

    // 3. Mark the transfer as received once all files are uploaded
    func markReceived(transferId: String) async throws {
        var req = URLRequest(url: env.apiBaseURL.appending(path: "/api/transfers/\(transferId)"))
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["status": "received"])
        try await sendVoid(req)
    }

    // Implement helpers: postJSON<T: Decodable>(...), sendVoid(...), error mapping from non-2xx
}
```

### Background upload coordinator

Uploads go **directly to B2 from the device** via the presigned URL. Use a background `URLSession` so a multi-GB upload survives app suspension or device sleep:

```swift
final class UploadCoordinator: NSObject, URLSessionTaskDelegate, URLSessionDataDelegate {
    static let shared = UploadCoordinator()

    var backgroundCompletionHandler: (() -> Void)?

    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.background(withIdentifier: "agency.gaviso.gdmsend.upload")
        cfg.isDiscretionary = false
        cfg.sessionSendsLaunchEvents = true
        return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
    }()

    func upload(fileURL: URL, to presignedURL: URL, contentType: String) -> URLSessionUploadTask {
        var req = URLRequest(url: presignedURL)
        req.httpMethod = "PUT"
        req.setValue(contentType, forHTTPHeaderField: "Content-Type")
        let task = session.uploadTask(with: req, fromFile: fileURL)
        task.resume()
        return task
    }

    // Implement URLSessionTaskDelegate progress, completion, and resume on relaunch
}
```

Wire the background relaunch hook in `AppDelegate` (or `UIApplicationDelegateAdaptor` from SwiftUI):

```swift
func application(_ application: UIApplication,
                 handleEventsForBackgroundURLSession identifier: String,
                 completionHandler: @escaping () -> Void) {
    UploadCoordinator.shared.backgroundCompletionHandler = completionHandler
}
```

### End-to-end flow

```swift
func send(files: [PickedFile],
          from sender: Sender,
          subject: String,
          message: String) async throws {
    // 1. Create the transfer
    let create = try await client.createTransfer(.init(
        senderName: sender.name, senderEmail: sender.email,
        subject: subject, message: message,
        files: files.map { FileSpec(filename: $0.name, fileSize: $0.size, mimeType: $0.mime) }
    ))

    // 2. Per file: presign + upload (parallel, background-capable)
    try await withThrowingTaskGroup(of: Void.self) { group in
        for (picked, record) in zip(files, create.files) {
            group.addTask {
                let presigned = try await self.client.presign(.init(
                    transferId: create.id,
                    fileId: record.id,
                    storagePath: record.storagePath,
                    contentType: record.mimeType
                ))
                try await UploadCoordinator.shared.uploadAndAwait(
                    fileURL: picked.url,
                    to: presigned.url,
                    contentType: record.mimeType
                )
            }
        }
        try await group.waitForAll()
    }

    // 3. Mark received
    try await client.markReceived(transferId: create.id)
}
```

---

## Validation checklist

- File picker uses `UIDocumentPickerViewController` (multi-select, `asCopy: true` so the file ends up in a sandbox URL the background session can read after suspension)
- Reject early when `sum(files.size) > env.maxTransferSize`
- Show per-file progress from `URLSessionTaskDelegate` callbacks
- Persist in-flight transfer state to disk (e.g. `UserDefaults` or a small JSON file under Application Support) so the coordinator can resume after relaunch
- Specific error UX: validation vs network vs server

---

## What is out of scope for v1

- Auth (the upload endpoints are public)
- Push notifications when files are received/downloaded
- Sharing extension
- Deep linking / receiving transfer IDs

These can be layered on later; v1 should focus on a fast, reliable pick-fill-send loop.
