// frontend/src/types/api.ts

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    detail?: Record<string, unknown>;
  };
}

export interface JobStatus {
  job_id: string;
  stato: 'in_elaborazione' | 'completato' | 'errore';
  progress?: number;
  download_url?: string;
  filename?: string;
  expires_at?: string;
  error_message?: string;
}
