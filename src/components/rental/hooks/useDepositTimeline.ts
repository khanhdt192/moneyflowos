import { useCallback, useEffect, useState } from "react";
import {
  depositTransactionService,
  type RentalDepositTransaction,
} from "@/services/rental/deposit.service";

export function useDepositTimeline(depositId?: string | null) {
  const [transactions, setTransactions] = useState<RentalDepositTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!depositId) {
      setTransactions([]);
      setError(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const data = await depositTransactionService.getDepositTransactions(depositId);
      setTransactions(data);
      return data;
    } catch (err) {
      setError(err);
      setTransactions([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [depositId]);

  useEffect(() => {
    void refresh().catch((err) => {
      console.error("[useDepositTimeline] load failed", err);
    });
  }, [refresh]);

  return {
    transactions,
    loading,
    error,
    refresh,
  };
}
