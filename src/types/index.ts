export type TransferStatus =
  | "uploading"
  | "received"
  | "downloaded"
  | "expired"
  | "deleted";

export interface Transfer {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  message: string;
  total_size: number;
  file_count: number;
  status: TransferStatus;
  created_at: string;
  expires_at: string;
  download_count?: number;
}

export interface TransferFile {
  id: string;
  transfer_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export interface TransferWithFiles extends Transfer {
  files: TransferFile[];
}

export interface AppSettings {
  max_file_size: number;
  max_transfer_size: number;
  transfer_expiry_days: number;
  notification_email: string;
  auto_delete_expired: boolean;
}

export interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export interface CreateTransferPayload {
  sender_name: string;
  sender_email: string;
  subject: string;
  message: string;
  files: { filename: string; file_size: number; mime_type: string }[];
}
