import { useMemo } from "react";
import {
  calculateDepositSummary,
  type RentalDepositTransaction,
} from "@/services/rental/deposit.service";

export function useDepositSummary(
  transactions: RentalDepositTransaction[],
  depositAmount: number | null | undefined,
) {
  return useMemo(
    () => calculateDepositSummary(transactions, depositAmount ?? 0),
    [transactions, depositAmount],
  );
}
