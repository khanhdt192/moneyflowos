export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          currency: string;
          active_month: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          currency?: string;
          active_month?: string | null;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          currency?: string;
          active_month?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense" | "saving" | "investment";
          category: string;
          amount: number;
          note: string | null;
          transaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "income" | "expense" | "saving" | "investment";
          category: string;
          amount: number;
          note?: string | null;
          transaction_date?: string;
        };
        Update: {
          type?: "income" | "expense" | "saving" | "investment";
          category?: string;
          amount?: number;
          note?: string | null;
          transaction_date?: string;
        };
        Relationships: [];
      };
      budget_items: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          category: "income" | "needs" | "wants" | "savings";
          name: string;
          amount: number;
          sort: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          category: "income" | "needs" | "wants" | "savings";
          name: string;
          amount?: number;
          sort?: number;
        };
        Update: {
          month?: string;
          category?: "income" | "needs" | "wants" | "savings";
          name?: string;
          amount?: number;
          sort?: number;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          emoji: string;
          target: number;
          saved: number;
          monthly_contribution: number;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          emoji?: string;
          target: number;
          saved?: number;
          monthly_contribution?: number;
          color?: string;
        };
        Update: {
          name?: string;
          emoji?: string;
          target?: number;
          saved?: number;
          monthly_contribution?: number;
          color?: string;
        };
        Relationships: [];
      };
      rental_rooms: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          rent: number;
          occupied: boolean;
          tenant: string | null;
          floor: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          rent?: number;
          occupied?: boolean;
          tenant?: string | null;
          floor?: number | null;
        };
        Update: {
          name?: string;
          rent?: number;
          occupied?: boolean;
          tenant?: string | null;
          floor?: number | null;
        };
        Relationships: [];
      };
      rental_settings: {
        Row: {
          user_id: string;
          default_electricity_rate: number;
          water_total: number;
          wifi_total: number;
          cleaning_total: number;
          other_total: number;
          allocation_rule: "equal_occupied" | "by_occupants" | "by_weight";
          water_rate_per_m3: number;
          wifi_per_room: number;
          cleaning_per_room: number;
          other_per_room: number;
          other_name: string;
          t1_electricity_bill: number;
          t1_has_wifi: boolean;
          t1_wifi_per_room: number;
          t1_cleaning: number;
          t1_other_name: string;
          t1_other_per_room: number;
          bank_name: string;
          bank_account: string;
          bank_holder: string;
          bank_qr_url: string;
          bank_note_template: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          default_electricity_rate?: number;
          water_total?: number;
          wifi_total?: number;
          cleaning_total?: number;
          other_total?: number;
          allocation_rule?: "equal_occupied" | "by_occupants" | "by_weight";
          water_rate_per_m3?: number;
          wifi_per_room?: number;
          cleaning_per_room?: number;
          other_per_room?: number;
          other_name?: string;
          t1_electricity_bill?: number;
          t1_has_wifi?: boolean;
          t1_wifi_per_room?: number;
          t1_cleaning?: number;
          t1_other_name?: string;
          t1_other_per_room?: number;
          bank_name?: string;
          bank_account?: string;
          bank_holder?: string;
          bank_qr_url?: string;
          bank_note_template?: string;
        };
        Update: {
          default_electricity_rate?: number;
          water_total?: number;
          wifi_total?: number;
          cleaning_total?: number;
          other_total?: number;
          allocation_rule?: "equal_occupied" | "by_occupants" | "by_weight";
          water_rate_per_m3?: number;
          wifi_per_room?: number;
          cleaning_per_room?: number;
          other_per_room?: number;
          other_name?: string;
          t1_electricity_bill?: number;
          t1_has_wifi?: boolean;
          t1_wifi_per_room?: number;
          t1_cleaning?: number;
          t1_other_name?: string;
          t1_other_per_room?: number;
          bank_name?: string;
          bank_account?: string;
          bank_holder?: string;
          bank_qr_url?: string;
          bank_note_template?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rental_billing_cycles: {
        Row: { id: string; user_id: string; month: number; year: number; status: "draft" | "finalized"; closed_at: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; month: number; year: number; status?: "draft" | "finalized"; closed_at?: string | null; };
        Update: { month?: number; year?: number; status?: "draft" | "finalized"; closed_at?: string | null; };
        Relationships: [];
      };
      rental_room_bills: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          cycle_id: string;
          rent_amount: number;
          electricity_amount: number;
          water_amount: number;
          wifi_amount: number;
          cleaning_amount: number;
          other_amount: number;
          total_amount: number;
          paid_amount: number;
          status: "draft" | "confirmed" | "partial_paid" | "paid" | "cancelled";
          confirmed_at: string | null;
          paid_at: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id: string;
          cycle_id: string;
          rent_amount?: number;
          electricity_amount?: number;
          water_amount?: number;
          wifi_amount?: number;
          cleaning_amount?: number;
          other_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          status?: "draft" | "confirmed" | "partial_paid" | "paid" | "cancelled";
          confirmed_at?: string | null;
          paid_at?: string | null;
          note?: string | null;
        };
        Update: {
          rent_amount?: number;
          electricity_amount?: number;
          water_amount?: number;
          wifi_amount?: number;
          cleaning_amount?: number;
          other_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          status?: "draft" | "confirmed" | "partial_paid" | "paid" | "cancelled";
          confirmed_at?: string | null;
          paid_at?: string | null;
          note?: string | null;
        };
        Relationships: [];
      };
      rental_electricity_readings: {
        Row: { id: string; user_id: string; room_id: string; cycle_id: string; start_index: number; end_index: number; consumption_kwh: number; water_m3: number; created_at: string; };
        Insert: { id?: string; user_id: string; room_id: string; cycle_id: string; start_index?: number; end_index?: number; water_m3?: number; };
        Update: { start_index?: number; end_index?: number; water_m3?: number; };
        Relationships: [];
      };
      rental_payments: {
        Row: {
          id: string;
          user_id: string;
          bill_id: string;
          room_id: string;
          amount: number;
          payment_method: string;
          note: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bill_id: string;
          room_id: string;
          amount: number;
          payment_method?: string;
          note?: string | null;
          paid_at?: string;
        };
        Update: {
          amount?: number;
          payment_method?: string;
          note?: string | null;
          paid_at?: string;
        };
        Relationships: [];
      };
      invoice_settings: {
        Row: {
          user_id: string;
          property_name: string;
          address: string;
          contact_phone: string;
          logo_url: string;
          footer_note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          property_name?: string;
          address?: string;
          contact_phone?: string;
          logo_url?: string;
          footer_note?: string;
        };
        Update: {
          property_name?: string;
          address?: string;
          contact_phone?: string;
          logo_url?: string;
          footer_note?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      monthly_summary: {
        Row: {
          user_id: string;
          month: string;
          total_income: number;
          total_expense: number;
          total_saving: number;
          total_investment: number;
          transaction_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export const Constants = {
  public: { Enums: {} },
} as const;
