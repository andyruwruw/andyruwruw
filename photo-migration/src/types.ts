/** Shared domain types + status vocabularies. */

export type JobStatus =
  | "created"
  | "scanning"
  | "scanned"
  | "running"
  | "paused"
  | "waiting_for_input"
  | "completed"
  | "failed";

export type ItemStatus =
  | "pending"
  | "needs_review"
  | "ready"
  | "uploading"
  | "uploaded"
  | "failed"
  | "skipped";

export type QuestionKind = "year" | "location";
export type QuestionStatus = "open" | "answered";

export interface Job {
  id: number;
  name: string;
  root_folder_id: string;
  status: JobStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  job_id: number;
  drive_id: string;
  name: string;
  resolved_year: number | null;
  resolved_lat: number | null;
  resolved_lng: number | null;
  year_status: "unknown" | "confident" | "answered" | "skipped";
  location_status: "unknown" | "answered" | "none";
}

export interface Item {
  id: number;
  job_id: number;
  folder_id: number;
  drive_id: string;
  name: string;
  mime_type: string;
  status: ItemStatus;
  media_item_id: string | null;
  stamped: number;
  error: string | null;
  updated_at: string;
}

export interface Question {
  id: number;
  job_id: number;
  folder_id: number;
  kind: QuestionKind;
  prompt: string;
  blocking: number;
  status: QuestionStatus;
  answer: string | null;
  created_at: string;
  answered_at: string | null;
  folder_name?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parentName: string;
}

export interface AnswerPayload {
  year?: number;
  skip?: boolean;
  lat?: number;
  lng?: number;
  none?: boolean;
}
