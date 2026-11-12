export interface Task {
  id: string;
  sheetId: string;
  type: string;
  createdAt?: any;
  updatedAt?: any;
  [colKey: string]: any;
}

export interface FilterSortState {
  sortCol: string | null;
  sortDir: 'asc' | 'desc' | null;
  filters: Record<string, string[]>;
}
