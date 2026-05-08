import { useEffect, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMoney } from "@/utils/format";
import { depositService, type RentalDepositForTab } from "@/services/deposit.service";
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

function SettlementSummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
        emphasized ? "bg-amber-50 text-amber-800" : "bg-muted/30"
      }`}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          emphasized ? "text-amber-800" : "text-foreground"
        }`}
      >
        {formatMoney(value)}
      </span>
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
  deposit: initialDeposit,
  open,
  onOpenChange,
  onDepositUpdated,
}: {
  deposit: RentalDepositForTab | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepositUpdated?: (deposit: RentalDepositForTab) => void;
}) {
  const [currentDeposit, setCurrentDeposit] = useState<RentalDepositForTab | null>(initialDeposit);
  const [transactions, setTransactions] = useState<RentalDepositTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [settlementNote, setSettlementNote] = useState("");
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentDeposit(initialDeposit);
    setSettlementNote("");
    setSettlementError(null);
  }, [initialDeposit]);

  useEffect(() => {
    if (!open || !currentDeposit?.id) {
      setTransactions([]);
      setTransactionError(null);
      return;
    }

    let cancelled = false;
    const depositId = currentDeposit.id;

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
  }, [currentDeposit?.id, open]);

  if (!currentDeposit) return null;

  const deposit = currentDeposit;
  const summary = depositTransactionService.calculateDepositSummary(transactions, deposit.amount);
  const canSettle =
    deposit.status === "pending_settlement" &&
    summary.remainingHeld > 0 &&
    !loadingTransactions &&
    !transactionError &&
    !settling;

  async function handleFullRefundSettlement() {
    if (settling) return;

    if (deposit.status !== "pending_settlement") {
      setSettlementError("Chỉ quyết toán khoản cọc đang chờ quyết toán.");
      return;
    }

    if (summary.remainingHeld <= 0) {
      setSettlementError("Khoản cọc không còn số tiền đang giữ để hoàn.");
      return;
    }

    setSettling(true);
    setSettlementError(null);

    try {
      const updatedDeposit = await depositService.settlePendingDepositFullRefund(
        deposit.id,
        settlementNote,
      );
      setCurrentDeposit(updatedDeposit);
      onDepositUpdated?.(updatedDeposit);

      try {
        const refreshedTransactions = await depositTransactionService.getDepositTransactions(
          deposit.id,
        );
        setTransactions(refreshedTransactions);
      } catch (refreshError) {
        console.error("[deposit-detail] transaction refresh failed", refreshError);
        setTransactionError("Đã quyết toán cọc nhưng chưa tải lại được lịch sử giao dịch.");
      }

      toast.success("Đã hoàn toàn bộ tiền cọc và quyết toán.");
    } catch (err) {
      console.error("[deposit-detail] settlement failed", err);
      const message = err instanceof Error ? err.message : "Không thể quyết toán tiền cọc.";
      setSettlementError(message);
      toast.error(message);
    } finally {
      setSettling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto [&>button]:hidden">
        <DialogHeader className="-mx-6 -mt-6 mb-2 sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-2 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DialogTitle className="min-w-0 truncate text-base font-semibold text-foreground">
                  {deposit.room_name} • {deposit.tenant_full_name} • Tiền cọc
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
                  <div className="space-y-1">
                    <StatusBadge status={deposit.status} />
                    <div className="text-xs font-normal text-muted-foreground">
                      {getLifecycleDescription(deposit.status)}
                    </div>
                  </div>
                </InfoRow>
                <InfoRow label="Ngày thu">{formatDate(deposit.collected_at)}</InfoRow>
                <InfoRow label="Ngày trả phòng">{formatDate(deposit.vacated_at)}</InfoRow>
                <InfoRow label="Ngày quyết toán">{formatDate(deposit.settled_at)}</InfoRow>
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
            <SectionCard title="Tác vụ tiền cọc">
              {deposit.status === "pending_settlement" ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Quyết toán cọc</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Luồng này chỉ hoàn toàn bộ số tiền còn giữ và đánh dấu cọc đã quyết toán.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <SettlementSummaryRow label="Cọc ban đầu" value={summary.totalDeposited} />
                    <SettlementSummaryRow label="Đã hoàn" value={summary.totalRefunded} />
                    <SettlementSummaryRow label="Đã trừ công nợ" value={summary.totalOffset} />
                    <SettlementSummaryRow label="Đã giữ lại" value={summary.totalForfeit} />
                    <SettlementSummaryRow label="Còn giữ" value={summary.remainingHeld} emphasized />
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ghi chú quyết toán
                    </span>
                    <textarea
                      value={settlementNote}
                      onChange={(event) => setSettlementNote(event.target.value)}
                      disabled={settling}
                      rows={4}
                      placeholder="Nhập ghi chú hoàn cọc (nếu có)"
                      className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  {settlementError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {settlementError}
                    </div>
                  )}

                  {summary.remainingHeld <= 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Không còn số tiền đang giữ để hoàn, nên chưa thể thực hiện tác vụ này.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleFullRefundSettlement()}
                    disabled={!canSettle}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {settling && <Loader2 className="h-4 w-4 animate-spin" />}
                    {settling ? "Đang quyết toán..." : "Hoàn toàn bộ & quyết toán"}
                  </button>
                </div>
              ) : deposit.status === "active" ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">Cọc vẫn đang hoạt động.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chỉ có thể quyết toán sau khi trả phòng và khoản cọc chuyển sang trạng thái chờ quyết toán.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Cọc đã quyết toán.</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Ngày quyết toán</span>
                      <span className="font-medium text-foreground">{formatDate(deposit.settled_at)}</span>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Ghi chú quyết toán</div>
                      <p className="mt-1 whitespace-pre-wrap font-medium text-foreground">
                        {deposit.settlement_note?.trim() || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { STATUS_CONFIG as DEPOSIT_STATUS_CONFIG, formatDate as formatDepositDate };
