export interface ModelItem {
  id: number;
  display_name: string;
  description: string;
  category: string;
  model_name: string;
  endpoint: string;
  tags: string[];
  status: string;
  new_tag: boolean;
  created_at: string;
  updated_at: string;
  owner: string;
  manufacturer: string;
  icon_url: string;
  background_url: string;
  sort: number;
}

export interface Category {
  category: string;
  api_count: number;
}

export interface InputParam {
  field_name: string;
  field_type: string;
  field_label: string;
  field_value: unknown;
  sort: number;
  field_tooltip?: string;
  variable_type: string;
  variable_name: string;
  required?: boolean;
  field_options?: Record<string, unknown>;
  billing_dim?: boolean;
  auto_fill_value?: unknown;
}

export interface PriceTableCellValue {
  variable_name: string;
  value_str?: string;
  amount?: number;
  unit_key?: string;
  unit_name?: string;
}

export interface PriceTableColumn {
  variable_name: string;
  field_label: string;
}

export interface PriceTableData {
  columns: PriceTableColumn[];
  cells?: PriceTableCellValue[][];
  simple_price_text?: string;
  additional_table?: string;
}

export interface BenefitInfo {
  rpd: number;
  rph: number;
  rpm: number;
}

export interface ModelPrice {
  price_table?: PriceTableData;
  benefit?: BenefitInfo;
}

export interface TaskResponse {
  request_id: string;
  status: string;
  message?: string;
  error_msg?: string;
  error_detail?: string;
  logs?: string;
  outputs?: Record<string, string[]>;
  created_at?: string;
  executed_at?: string;
  ended_at?: string;
  cost_times?: Record<string, number>;
}

export interface ModelDetail {
  id: number;
  display_name: string;
  description: string;
  category: string;
  model_name: string;
  endpoint: string;
  tags: string[];
  status: string;
  new_tag: boolean;
  created_at: string;
  updated_at: string;
  owner: string;
  manufacturer: string;
  icon_url: string;
  background_url: string;
  sort: number;
  related_categories: { id: number; category: string; endpoint: string }[];
  input_params: InputParam[];
  outputs_example: Record<string, string[]>;
  billing_unit: string;
  billing_price?: number;
  billing_price_total?: number;
  billing_price_desc?: string;
}
