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
