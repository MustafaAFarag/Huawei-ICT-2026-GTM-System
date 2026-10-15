export type ImportOutcome = {
  row: number;
  state: string;
  id?: string;
  message?: string;
  change?: "added" | "changed" | "unchanged";
  changes?: { field: string; before: unknown; after: unknown }[];
};
export type ImportHistoryEntry = {
  id: string;
  filename: string | null;
  version: number;
  previousId: string | null;
  rowCount: number | null;
  createdAt: string;
  status: "processing" | "interrupted" | "completed";
  legacy: boolean;
  counts: {
    added: number;
    changed: number;
    unchanged: number;
    duplicate: number;
    invalid: number;
    retry: number;
  };
};
export type ImportHistoryDetail = ImportHistoryEntry & {
  outcomes: ImportOutcome[];
};
export type ImportHistoryPage = {
  batches: ImportHistoryEntry[];
  nextCursor: string | null;
};
