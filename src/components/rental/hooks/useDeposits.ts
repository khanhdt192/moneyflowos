import { useCallback, useEffect, useState } from "react";
import { depositService, type RentalDepositForTab } from "@/services/deposit.service";

export function useDeposits() {
  const [deposits, setDeposits] = useState<RentalDepositForTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await depositService.listDepositsForTab();
      setDeposits(rows);
    } catch (err) {
      console.error("[deposits-tab] load failed", err);
      setError("Không tải được danh sách tiền cọc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const rows = await depositService.listDepositsForTab();
        if (!cancelled) setDeposits(rows);
      } catch (err) {
        console.error("[deposits-tab] load failed", err);
        if (!cancelled) setError("Không tải được danh sách tiền cọc. Vui lòng thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { deposits, loading, error, refresh };
}
