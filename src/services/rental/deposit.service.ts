import { supabase } from "@/integrations/supabase/client";

export type DepositTransactionType = "create" | "refund" | "offset" | "forfeit";

export type RentalDepositTransaction = {
  id: string;
  deposit_id: string;
  transaction_type: DepositTransactionType;
  amount: number;
  note: string | null;
  created_at: string;
};

export type CreateDepositTransactionInput = {
  depositId: string;
  transactionType: DepositTransactionType;
  amount: number;
  note?: string;
};

export type DepositSummary = {
  totalDeposited: number;
  totalRefunded: number;
  totalOffset: number;
  totalForfeit: number;
  remainingHeld: number;
};

const TRANSACTION_TYPE_LABELS: Record<DepositTransactionType, string> = {
  create: "Tạo cọc",
  refund: "Hoàn cọc",
  offset: "Trừ công nợ",
  forfeit: "Giữ lại",
};

function normalizeMoney(value: number | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function absoluteMoney(value: number | null | undefined): number {
  return Math.abs(normalizeMoney(value));
}

export function getDepositTransactionLabel(type: DepositTransactionType): string {
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function getDepositTransactionSignedAmount(transaction: Pick<RentalDepositTransaction, "transaction_type" | "amount">): number {
  const amount = absoluteMoney(transaction.amount);
  return transaction.transaction_type === "create" ? amount : -amount;
}

export function calculateDepositSummary(
  transactions: RentalDepositTransaction[],
  depositAmount: number,
): DepositSummary {
  const snapshotAmount = absoluteMoney(depositAmount);

  if (!transactions.length) {
    return {
      totalDeposited: snapshotAmount,
      totalRefunded: 0,
      totalOffset: 0,
      totalForfeit: 0,
      remainingHeld: snapshotAmount,
    };
  }

  const summary = transactions.reduce(
    (acc, transaction) => {
      const amount = absoluteMoney(transaction.amount);

      if (transaction.transaction_type === "create") acc.totalDeposited += amount;
      if (transaction.transaction_type === "refund") acc.totalRefunded += amount;
      if (transaction.transaction_type === "offset") acc.totalOffset += amount;
      if (transaction.transaction_type === "forfeit") acc.totalForfeit += amount;

      return acc;
    },
    {
      totalDeposited: 0,
      totalRefunded: 0,
      totalOffset: 0,
      totalForfeit: 0,
    },
  );

  const remainingHeld = Math.max(
    summary.totalDeposited - summary.totalRefunded - summary.totalOffset - summary.totalForfeit,
    0,
  );

  return {
    ...summary,
    remainingHeld,
  };
}

export const depositTransactionService = {
  async getDepositTransactions(depositId: string): Promise<RentalDepositTransaction[]> {
    if (!depositId) return [];

    const { data, error } = await (supabase as any)
      .from("rental_deposit_transactions")
      .select("*")
      .eq("deposit_id", depositId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RentalDepositTransaction[];
  },

  async createDepositTransaction(input: CreateDepositTransactionInput): Promise<RentalDepositTransaction> {
    const { data, error } = await (supabase as any)
      .from("rental_deposit_transactions")
      .insert({
        deposit_id: input.depositId,
        transaction_type: input.transactionType,
        amount: input.amount,
        note: input.note ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as RentalDepositTransaction;
  },

  calculateDepositSummary,
  getDepositTransactionLabel,
  getDepositTransactionSignedAmount,
};
