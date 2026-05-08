import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMoney } from "@/utils/format";
import type { RentalDepositForTab } from "@/services/deposit.service";
import {
  depositTransactionService,
  type RentalDepositTransaction,
} from "@/services/rental/deposit.service";

const STATUS_CONFIG: Record<RentalDepositForTab["status"], { label: string; className: string }> = {
  active: { label: "Đang giữ", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending_settlement: {
    label: "Chờ quyết toán",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  settled: { label: "Đã quyết toán", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: RentalDepositForTab["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function DateBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{formatDate(value)}</div>
    </div>
  );
}

function signedAmount(transaction: RentalDepositTransaction): string {
  const amount = depositTransactionService.getDepositTransactionSignedAmount(transaction);
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(amount))}`;
}

function getLifecycleDescription(status: RentalDepositForTab["status"]): string {
  if (status === "active") return "Cọc hiện tại của lượt ở hiện tại";
  if (status === "pending_settlement") return "Đã trả phòng, chờ quyết toán";
  return "Đã xử lý xong";
}

export function TienCocDetailModal({
  deposit,
  open,
  onOpenChange,
}: {
  deposit: RentalDepositForTab | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [transactions, setTransactions] = useState<RentalDepositTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !deposit?.id) {
      setTransactions([]);
      setTransactionError(null);
      return;
    }

    let cancelled = false;
    const depositId = deposit.id;

    async function loadTransactions() {
      setLoadingTransactions(true);
      setTransactionError(null);

      try {
        const rows = await depositTransactionService.getDepositTransactions(depositId);
        if (!cancelled) setTransactions(rows);
      } catch (err) {
        console.error("[deposit-detail] transaction load failed", err);
        if (!cancelled) setTransactionError("Không tải được giao dịch cọc.");
      } finally {
        if (!cancelled) setLoadingTransactions(false);
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [deposit?.id, open]);

  if (!deposit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto [&>button]:hidden">
        <DialogHeader className="-mx-6 -mt-6 mb-2 sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-2 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DialogTitle className="min-w-0 truncate text-base font-semibold text-foreground">
                  Phòng {deposit.room_name} • {deposit.tenant_full_name} • Tiền cọc
                </DialogTitle>
                <StatusBadge status={deposit.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {deposit.tenant_phone || "Chưa có SĐT"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Đóng chi tiết tiền cọc"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="grid gap-5 pt-3 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <SectionCard title="Thông tin cọc">
              <div>
                <InfoRow label="Người thuê">
                  <div>{deposit.tenant_full_name}</div>
                  {deposit.tenant_phone && (
                    <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                      {deposit.tenant_phone}
                    </div>
                  )}
                </InfoRow>
                <InfoRow label="Phòng">{deposit.room_name}</InfoRow>
                <InfoRow label="Đã cọc">
                  <span className="tabular-nums">{formatMoney(deposit.amount)}</span>
                </InfoRow>
                <InfoRow label="Trạng thái">
                  <StatusBadge status={deposit.status} />
                </InfoRow>
                <InfoRow label="Ngày thu">{formatDate(deposit.collected_at)}</InfoRow>
                <InfoRow label="Ngày trả phòng">{formatDate(deposit.vacated_at)}</InfoRow>
                <InfoRow label="Ngày quyết toán">{formatDate(deposit.settled_at)}</InfoRow>
              </div>
            </SectionCard>

            <SectionCard title="Lịch sử giao dịch cọc">
              {loadingTransactions ? (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  Đang tải giao dịch cọc...
                </div>
              ) : transactionError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {transactionError}
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  Chưa có giao dịch cọc.
                </div>
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
                  {transactions.map((transaction) => {
                    const amount =
                      depositTransactionService.getDepositTransactionSignedAmount(transaction);
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-start justify-between gap-4 px-3 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {depositTransactionService.getDepositTransactionLabel(
                              transaction.transaction_type,
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateTime(transaction.created_at)}
                          </div>
                          {transaction.note && (
                            <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                              {transaction.note}
                            </div>
                          )}
                        </div>
                        <div
                          className={`shrink-0 font-semibold tabular-nums ${
                            amount < 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {signedAmount(transaction)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-5 lg:sticky lg:top-14 lg:self-start">
            <SectionCard title="Trạng thái & vòng đời">
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Trạng thái</span>
                    <StatusBadge status={deposit.status} />
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    {getLifecycleDescription(deposit.status)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <DateBlock label="Ngày thu" value={deposit.collected_at} />
                  <DateBlock label="Ngày trả phòng" value={deposit.vacated_at} />
                  <DateBlock label="Ngày quyết toán" value={deposit.settled_at} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Ghi chú">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Ghi chú cọc</div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">
                    {deposit.note?.trim() || "—"}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Ghi chú quyết toán
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">
                    {deposit.settlement_note?.trim() || "—"}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Tiện ích">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
              >
                Đóng
              </button>
            </SectionCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { STATUS_CONFIG as DEPOSIT_STATUS_CONFIG, formatDate as formatDepositDate };
