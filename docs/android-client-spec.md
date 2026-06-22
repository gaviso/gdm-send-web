# GDM Send — Android client spec

Spec for an Android app that lets users send files to the Gaviso agency. The app is a thin client over the existing web platform's public REST API. **No server-side changes are required.**

- Web platform: <https://gdmsend.gaviso.agency> (this repo: `gaviso/gdm-send-web`)
- Suggested Android repo: `gaviso/gdm-send-android`
- Min Android: API 26 (Android 8.0) · Kotlin 1.9+ · Jetpack Compose · Material 3
- Mirrors the iOS client at <https://github.com/gaviso/gdm-send-ios> — same feature set, same package identifier (`agency.gaviso.send`)

---

## API contract

Identical to the iOS spec — the API is platform-neutral. See [`docs/ios-client-spec.md`](./ios-client-spec.md) for the canonical request/response shapes. Repeated here for convenience:

### 1. Create transfer

`POST /api/transfers`

```json
{
  "sender_name": "Jane Smith",
  "sender_email": "jane@company.com",
  "subject": "Newsletter materials",
  "message": "Hi, this is for the newsletter this month.",
  "files": [
    { "filename": "logo.png", "file_size": 12345, "mime_type": "image/png" }
  ]
}
```

Server-side validation:
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

### 2. Presigned upload URL (per file)

`POST /api/uploads/presign`

```json
{
  "transfer_id": "c0cb2b12-...",
  "file_id": "0a1b2c3d-...",
  "storage_path": "c0cb2b12-.../0a1b2c3d-...-logo.png",
  "content_type": "image/png"
}
```

Response: `{ "url": "<presigned Backblaze B2 S3 PUT URL>" }`

Upload bytes directly:

```
PUT <url>
Content-Type: <content_type>     (must match what was sent in the presign request)
<file bytes>
```

The B2 bucket has permissive CORS that accepts requests from native mobile clients (no preflight).

### 3. Mark transfer received

`PATCH /api/transfers/{id}` with `{ "status": "received" }`. Call once all files have uploaded successfully.

> Status lifecycle: `uploading` → `received` (client) → `downloaded` (server-managed) → `expired` / `deleted` (server-managed).

---

## Suggested Kotlin architecture

### Module / package layout

```
app/src/main/kotlin/agency/gaviso/send/
  GDMSendApp.kt              — Application class, WorkManager init
  MainActivity.kt            — Single activity, Compose host
  ui/
    upload/                  — UploadScreen, ProgressScreen, SuccessScreen, FileChip
    settings/                — SettingsScreen, AppearanceMode
    theme/                   — Material 3 theme + extension colors
    splash/                  — SplashScreen overlay
  data/
    GDMSendClient.kt         — REST client (transfers, presign, mark-received)
    Models.kt                — Serializable request/response types
    Errors.kt                — Sealed class for error categories
    SenderPreferences.kt     — DataStore-backed name/email persistence
    PickedFileImporter.kt    — copies SAF / Photo Picker URIs into cacheDir/uploads
  upload/
    UploadWorker.kt          — CoroutineWorker that performs the PUT to B2
    UploadCoordinator.kt     — schedules WorkManager chains, exposes progress
  Environment.kt             — base URL, size limits
```

### Environment

```kotlin
object GDMEnvironment {
    const val API_BASE_URL = "https://gdmsend.gaviso.agency"
    const val MAX_TRANSFER_SIZE: Long = 5_368_709_120L
}
```

### Models

Use `kotlinx.serialization` for JSON.

```kotlin
@Serializable
data class FileSpec(
    val filename: String,
    @SerialName("file_size") val fileSize: Long,
    @SerialName("mime_type") val mimeType: String,
)

@Serializable
data class CreateTransferRequest(
    @SerialName("sender_name")  val senderName: String,
    @SerialName("sender_email") val senderEmail: String,
    val subject: String,
    val message: String,
    val files: List<FileSpec>,
)

@Serializable
data class TransferFileRecord(
    val id: String,
    val filename: String,
    @SerialName("storage_path") val storagePath: String,
    @SerialName("mime_type")    val mimeType: String,
)

@Serializable
data class CreateTransferResponse(
    val id: String,
    val files: List<TransferFileRecord>,
)

@Serializable
data class PresignRequest(
    @SerialName("transfer_id")  val transferId: String,
    @SerialName("file_id")      val fileId: String,
    @SerialName("storage_path") val storagePath: String,
    @SerialName("content_type") val contentType: String,
)

@Serializable
data class PresignResponse(val url: String)
```

### Errors

```kotlin
sealed class GDMSendError(message: String) : Exception(message) {
    data class Validation(val msg: String) : GDMSendError(msg)
    data class Network(val cause: Throwable) : GDMSendError(cause.localizedMessage ?: "Network error")
    data class Server(val status: Int, val msg: String?) : GDMSendError("Server ($status): ${msg ?: "error"}")
    data class UploadFailed(val filename: String, val cause: Throwable?) :
        GDMSendError("Upload failed for $filename")
    data class Decoding(val cause: Throwable) : GDMSendError("Couldn't read server response")

    val category: String get() = when (this) {
        is Validation -> "Validation"
        is Network -> "Network"
        is Server, is Decoding -> "Server"
        is UploadFailed -> "Upload"
    }
}
```

### Client

Use **OkHttp** for HTTP (well-supported, used by AndroidX libraries internally, treated as de facto standard). Wrap in a single class:

```kotlin
class GDMSendClient(
    private val client: OkHttpClient = OkHttpClient(),
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    suspend fun createTransfer(req: CreateTransferRequest): CreateTransferResponse =
        postJson("/api/transfers", req)

    suspend fun presign(req: PresignRequest): PresignResponse =
        postJson("/api/uploads/presign", req)

    suspend fun markReceived(transferId: String) {
        val body = json.encodeToString(mapOf("status" to "received")).toRequestBody(JSON_MIME)
        val request = Request.Builder()
            .url("${GDMEnvironment.API_BASE_URL}/api/transfers/$transferId")
            .patch(body)
            .build()
        execute<JsonObject>(request)  // ignore the body
    }

    private suspend inline fun <reified T : Any, reified R : Any> postJson(path: String, body: T): R {
        val req = Request.Builder()
            .url("${GDMEnvironment.API_BASE_URL}$path")
            .post(json.encodeToString(body).toRequestBody(JSON_MIME))
            .build()
        return execute(req)
    }

    private suspend inline fun <reified R : Any> execute(request: Request): R = withContext(Dispatchers.IO) {
        try {
            client.newCall(request).execute().use { response ->
                val text = response.body?.string() ?: ""
                if (!response.isSuccessful) {
                    throw GDMSendError.Server(response.code, text.take(500))
                }
                json.decodeFromString<R>(text)
            }
        } catch (e: GDMSendError) { throw e }
        catch (e: IOException) { throw GDMSendError.Network(e) }
        catch (e: SerializationException) { throw GDMSendError.Decoding(e) }
    }

    companion object {
        val JSON_MIME = "application/json; charset=utf-8".toMediaType()
    }
}
```

### Background uploads

iOS uses a background `URLSession`. The Android equivalent is **WorkManager + ForegroundService** so multi-GB transfers survive app suspension and screen lock.

```kotlin
class UploadWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val fileUri    = inputData.getString(KEY_FILE_URI)?.toUri() ?: return Result.failure()
        val presigned  = inputData.getString(KEY_PRESIGNED_URL) ?: return Result.failure()
        val mime       = inputData.getString(KEY_MIME) ?: "application/octet-stream"
        val displayName = inputData.getString(KEY_FILENAME) ?: "file"

        setForeground(uploadingForegroundInfo(displayName))

        return try {
            val body = StreamingRequestBody(applicationContext.contentResolver, fileUri, mime) { sent, total ->
                setProgressAsync(workDataOf(KEY_PROGRESS to (sent.toDouble() / total.toDouble())))
            }
            val request = Request.Builder().url(presigned).put(body).build()
            OkHttpClient().newCall(request).execute().use { resp ->
                if (resp.isSuccessful) Result.success()
                else Result.failure(workDataOf(KEY_ERROR to "HTTP ${resp.code}"))
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val KEY_FILE_URI = "file_uri"
        const val KEY_PRESIGNED_URL = "presigned_url"
        const val KEY_MIME = "content_type"
        const val KEY_FILENAME = "filename"
        const val KEY_PROGRESS = "progress"
        const val KEY_ERROR = "error"
    }
}
```

Coordinate the chain from a ViewModel (or a coordinator class):

```kotlin
suspend fun send(
    files: List<PickedFile>,
    sender: Sender,
    subject: String,
    message: String,
): String = withContext(Dispatchers.IO) {
    val created = client.createTransfer(CreateTransferRequest(
        senderName = sender.name, senderEmail = sender.email,
        subject = subject, message = message,
        files = files.map { FileSpec(it.filename, it.size, it.mime) }
    ))

    // Parallel presign + upload per file
    coroutineScope {
        files.zip(created.files).map { (picked, record) ->
            async {
                val presigned = client.presign(PresignRequest(
                    transferId  = created.id,
                    fileId      = record.id,
                    storagePath = record.storagePath,
                    contentType = record.mimeType,
                ))
                val req = OneTimeWorkRequestBuilder<UploadWorker>()
                    .setInputData(workDataOf(
                        UploadWorker.KEY_FILE_URI      to picked.uri.toString(),
                        UploadWorker.KEY_PRESIGNED_URL to presigned.url,
                        UploadWorker.KEY_MIME          to record.mimeType,
                        UploadWorker.KEY_FILENAME      to picked.filename,
                    ))
                    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .build()
                workManager.enqueue(req).result.await()
                workManager.awaitTerminal(req.id)  // small helper that observes WorkInfo until success/failure
            }
        }.awaitAll()
    }

    client.markReceived(created.id)
    created.id
}
```

> Progress reporting per file is via `setProgressAsync` from inside the Worker, observed via `workManager.getWorkInfoByIdFlow(id)` in the ViewModel.

---

## File picking

| Source | API |
|---|---|
| Photo library | `ActivityResultContracts.PickMultipleVisualMedia()` (Android 13+ Photo Picker, backports to API 19 via `androidx.activity:activity-compose:1.7+`) |
| Files (anywhere) | `ActivityResultContracts.OpenMultipleDocuments()` (SAF) |

Both return `Uri`s. Copy each into `context.cacheDir/uploads/<uuid>/<filename>` so the upload Worker has a stable, persistable file URI even if the system reclaims the picker's temp Uri.

```kotlin
fun importFile(uri: Uri): PickedFile {
    val id = UUID.randomUUID()
    val (name, size, mime) = queryMetadata(uri)
    val dest = File(context.cacheDir, "uploads/$id/$name").apply { parentFile?.mkdirs() }
    context.contentResolver.openInputStream(uri)?.use { input ->
        dest.outputStream().use { input.copyTo(it) }
    }
    return PickedFile(
        id = id,
        uri = Uri.fromFile(dest),
        filename = name,
        size = size,
        mime = mime ?: "application/octet-stream",
    )
}
```

Single-button UX: present a Material `DropdownMenu` with **Photo library** and **Files** options (matches the iOS `Menu` pattern).

---

## Sender persistence

Use `androidx.datastore:datastore-preferences`. Same keys as iOS for consistency:

```kotlin
val Context.senderDataStore by preferencesDataStore(name = "sender")

object SenderPreferences {
    val NAME  = stringPreferencesKey("GDMSend.senderName")
    val EMAIL = stringPreferencesKey("GDMSend.senderEmail")
}
```

Read on ViewModel init, write on each text change. Persists through `reset()` after a successful send.

---

## Settings

Match the iOS Settings sheet exactly:

- **Appearance** — System / Light / Dark, applied via `MaterialTheme` driven by `DataStore`-backed preference
- **Support** — Email row that fires `Intent.ACTION_SENDTO` to `mailto:help@gaviso.agency`
- **Footer** — app icon, app name, version (from `BuildConfig.VERSION_NAME`), `© <currentYear> Gaviso Digital Marketing, LLC`

Surface via a gear icon in the top app bar of the compose (upload) screen, hidden during upload / success.

---

## Validation checklist

- File picker uses `OpenMultipleDocuments` (files) and `PickMultipleVisualMedia` (photos)
- Each picked Uri is copied into `cacheDir/uploads/<uuid>/<filename>` before upload begins
- Reject early when `sum(files.size) > MAX_TRANSFER_SIZE`
- WorkManager Worker runs as expedited foreground service for the upload duration
- Per-file progress reported via `setProgressAsync` and surfaced in Compose state
- Specific error UX: Validation / Network / Server / Upload categories
- Keyboard dismisses on tap outside text fields and on scroll
- Sender name/email auto-restore on launch from DataStore

---

## Out of scope for v1

- Auth (upload endpoints are public)
- Push notifications when files are received or downloaded
- Share intent target ("Send to GDM Send" from other apps)
- Deep linking / opening a transfer ID directly
- Tablet-optimized layouts
- Wear OS / Android Auto

These can be layered on later; v1 should focus on a fast, reliable pick-fill-send loop matching the iOS experience.
