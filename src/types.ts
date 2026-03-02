export interface Position {
  id: string;
  col_id: string;
  row_idx: number;
  status: 'free' | 'partial' | 'occupied';
  has_ns: boolean;
  has_sub: boolean;
  is_a_rank: boolean;
  notification_id?: string;
  part_group?: string;
  notif_type?: string;
  user_name?: string;
  timestamp?: string;
}

export interface ColumnRule {
  col_id: string;
  enabled: number; // 0 or 1
  priority: number;
  capacity: number;
  allow_ns: number;
  allow_sub: number;
  allow_otc: number;
  allow_exera2: number;
  allow_exera3: number;
}

export interface StoreResponse {
  success: boolean;
  position?: string;
  message?: string;
}

export interface PickResponse {
  success: boolean;
  position?: string;
  message?: string;
}
