export interface TimesheetRecord {
  id: number;
  event_name: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  hourly_rate: number;
  total_amount?: number;
}

export interface EventItem {
  id: number;
  client_name: string;
  venue: string;
  address?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
}

export interface EventFormData {
  client_name: string;
  venue: string;
  address: string;
  event_date: string;
  start_time: string;
  end_time: string;
}

export interface Stats {
  totalEvents: number;
  activeEvents: number;
  teamMembers: number;
  totalHours: number;
  totalBilling: number;
}

export interface BillingSummaryItem {
  staff_name: string;
  total_hours: number;
  rate: number;
  total_amount: number;
}

export interface BillingResponse {
  staff?: BillingSummaryItem[];
}

export interface ReportComputedData {
  totalHours: number;
  totalEvents: number;
  totalBilling: number;
  averageHoursPerDay: number;
  topEvents: { name: string; hours: number }[];
  monthlyTrend: { month: string; hours: number }[];
}

export interface AuthUser {
  username: string;
  role: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
