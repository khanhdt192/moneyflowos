import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useDeposits } from "@/components/rental/hooks/useDeposits";
import type { RentalDepositForTab } from "@/services/deposit.service";
import { TienCocDesktopTable } from "./TienCocDesktopTable";
import { TienCocDetailModal } from "./TienCocDetailModal";
import { TienCocMobileCards } from "./TienCocMobileCards";

export function TienCoc() {
  const { deposits, loading, error, refresh } = useDeposits();
  const [selectedDeposit, setSelectedDeposit] = useState<RentalDepositForTab | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {deposits.length} khoản cọc · quản lý theo vòng đời người thuê
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bao gồm cọc đang giữ, chờ quyết toán và đã quyết toán.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Tải lại
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <TienCocMobileCards
        deposits={deposits}
        loading={loading}
        onSelectDeposit={setSelectedDeposit}
      />
      <TienCocDesktopTable
        deposits={deposits}
        loading={loading}
        onSelectDeposit={setSelectedDeposit}
      />

      <TienCocDetailModal
        deposit={selectedDeposit}
        open={Boolean(selectedDeposit)}
        onOpenChange={(open) => {
          if (!open) setSelectedDeposit(null);
        }}
        onDepositUpdated={(updatedDeposit) => {
          setSelectedDeposit(updatedDeposit);
          void refresh();
        }}
      />
    </div>
  );
}
