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
      rental_settings: {
        Row: {
          user_id: string;
          default_electricity_rate: number;
          water_total: number;
          wifi_total: number;
          cleaning_total: number;
          other_total: number;
          allocation_rule: "equal_occupied" | "by_occupants" | "by_weight";
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
        };
        Update: {
          default_electricity_rate?: number;
          water_total?: number;
          wifi_total?: number;
          cleaning_total?: number;
          other_total?: number;
          allocation_rule?: "equal_occupied" | "by_occupants" | "by_weight";
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
        Row: { id: string; user_id: string; room_id: string; cycle_id: string; rent_amount: number; electricity_amount: number; water_amount: number; wifi_amount: number; cleaning_amount: number; other_amount: number; total_amount: number; paid_amount: number; note: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; room_id: string; cycle_id: string; rent_amount?: number; electricity_amount?: number; water_amount?: number; wifi_amount?: number; cleaning_amount?: number; other_amount?: number; total_amount?: number; paid_amount?: number; note?: string | null; };
        Update: { rent_amount?: number; electricity_amount?: number; water_amount?: number; wifi_amount?: number; cleaning_amount?: number; other_amount?: number; total_amount?: number; paid_amount?: number; note?: string | null; };
        Relationships: [];
      };
      rental_electricity_readings: {
        Row: { id: string; user_id: string; room_id: string; cycle_id: string; start_index: number; end_index: number; consumption_kwh: number; created_at: string; };
        Insert: { id?: string; user_id: string; room_id: string; cycle_id: string; start_index?: number; end_index?: number; };
        Update: { start_index?: number; end_index?: number; };
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          rent?: number;
          occupied?: boolean;
          tenant?: string | null;
        };
        Update: {
          name?: string;
          rent?: number;
          occupied?: boolean;
          tenant?: string | null;
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
