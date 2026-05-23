export interface RegistryRecord {
  sro_name?: string;
  reg_year?: string;
  reg_date?: string;
  deed_type?: string;
  book_no?: string;
  token_no: string;
  docket_no?: string;
  from_page?: string;
  to_page?: string;
  chargeable_value?: string;
  presenter?: string;
  pres_date?: string;
  serial_no?: string;
  deed_category?: string;
  procedure?: string;
  property_type?: string;
  plot_no?: string;
  khata_no?: string;
  tauji_no?: string;
  extent_dec?: string;
  circle?: string;
  village?: string;
  land_type?: string;
  b_east?: string;
  b_west?: string;
  b_north?: string;
  b_south?: string;
  mvr_rate?: string;
  urban_rural?: string;
  executant?: string;
  executant_addr?: string;
  claimant?: string;
  claimant_addr?: string;
  scrapedAt?: string;
}

export interface GlobalConfig {
  ocrApis: string[];
  chatIds: string[];
  lastChecked?: string;
  lastCheckedStatus?: "success" | "failed";
  lastCheckedCount?: number;
  totalFound?: number;
}

export interface BotUser {
  chatId: string;
  username: string;
  blocked: boolean;
  notifyEnabled: boolean;
  approved?: boolean; // Admin approval state
  templates: string[]; // List of template IDs assigned to this user
  msgType: "new" | "all"; // 'new' = only notify if new record, 'all' = send all records daily as PDF
  assignedFields?: { [key: string]: string }; // Custom field template adjustments
}

export interface MsgTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

export interface LiveLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export interface Stats {
  lastChecked: string;
  lastCheckedStatus: string;
  lastCheckedCount: number;
  totalRecords: number;
  totalSubscribers: number;
  uptime: string;
}
