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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-xl">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-0 sm:py-2 max-sm:flex-col max-sm:gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground sm:text-right">{children}</div>
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
  const [settlementMode, setSettlementMode] = useState<"full" | "partial">("full");
  const [partialRefundAmount, setPartialRefundAmount] = useState("");
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentDeposit(initialDeposit);
    setSettlementNote("");
    setSettlementMode("full");
    setPartialRefundAmount("");
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
  const partialRefundValue = partialRefundAmount.trim() === "" ? NaN : Number(partialRefundAmount);
  const partialForfeitAmount = Number.isFinite(partialRefundValue)
    ? Math.max(summary.remainingHeld - partialRefundValue, 0)
    : 0;
  const partialRefundError = (() => {
    if (settlementMode !== "partial" || partialRefundAmount.trim() === "") return null;
    if (!Number.isFinite(partialRefundValue)) return "Số tiền hoàn khách không hợp lệ.";
    if (partialRefundValue <= 0) return "Số tiền hoàn khách phải lớn hơn 0.";
    if (partialRefundValue === summary.remainingHeld) {
      return "Nếu hoàn toàn bộ số tiền đang giữ, hãy dùng luồng Hoàn toàn bộ.";
    }
    if (partialRefundValue > summary.remainingHeld) {
      return "Số tiền hoàn khách không được lớn hơn số tiền đang giữ.";
    }
    return null;
  })();
  const canSettle =
    deposit.status === "pending_settlement" &&
    summary.remainingHeld > 0 &&
    !loadingTransactions &&
    !transactionError &&
    !settling;
  const canPartialSettle =
    canSettle &&
    settlementMode === "partial" &&
    partialRefundAmount.trim() !== "" &&
    !partialRefundError &&
    partialRefundValue > 0 &&
    partialRefundValue < summary.remainingHeld;

  async function refreshDepositAndTransactions(depositId: string, fallbackDeposit: RentalDepositForTab) {
    const freshDeposit = await depositService.getDepositForTabById(depositId);
    const nextDeposit = freshDeposit ?? fallbackDeposit;
    setCurrentDeposit(nextDeposit);
    onDepositUpdated?.(nextDeposit);

    const refreshedTransactions = await depositTransactionService.getDepositTransactions(depositId);
    setTransactions(refreshedTransactions);
  }

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
      await refreshDepositAndTransactions(deposit.id, updatedDeposit);

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

  async function handlePartialRefundSettlement() {
    if (settling) return;

    if (deposit.status !== "pending_settlement") {
      setSettlementError("Chỉ quyết toán khoản cọc đang chờ quyết toán.");
      return;
    }

    if (summary.remainingHeld <= 0) {
      setSettlementError("Khoản cọc không còn số tiền đang giữ để quyết toán.");
      return;
    }

    if (partialRefundError) {
      setSettlementError(partialRefundError);
      return;
    }

    if (!Number.isFinite(partialRefundValue) || partialRefundValue <= 0) {
      setSettlementError("Số tiền hoàn khách phải lớn hơn 0.");
      return;
    }

    if (partialRefundValue >= summary.remainingHeld) {
      setSettlementError(
        "Số tiền hoàn phải nhỏ hơn số tiền đang giữ. Nếu hoàn toàn bộ, hãy dùng luồng Hoàn toàn bộ.",
      );
      return;
    }

    setSettling(true);
    setSettlementError(null);

    try {
      const updatedDeposit = await depositService.settlePendingDepositPartialRefund(
        deposit.id,
        partialRefundValue,
        settlementNote,
      );
      await refreshDepositAndTransactions(deposit.id, updatedDeposit);

      toast.success("Đã quyết toán cọc bằng hoàn một phần.");
    } catch (err) {
      console.error("[deposit-detail] partial settlement failed", err);
      const message = err instanceof Error ? err.message : "Không thể quyết toán tiền cọc.";
      setSettlementError(message);
      toast.error(message);
    } finally {
      setSettling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto max-h-[92dvh] w-full max-w-none translate-y-0 overflow-y-auto rounded-t-3xl p-4 [&>button]:hidden sm:bottom-auto sm:top-[50%] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-5xl sm:translate-y-[-50%] sm:rounded-xl sm:p-6">
        <DialogHeader className="-mx-4 -mt-4 mb-2 sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 text-left backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DialogTitle className="min-w-0 text-base font-semibold text-foreground sm:truncate">
                  <span className="sm:hidden">Tiền cọc · {deposit.tenant_full_name}</span>
                  <span className="hidden sm:inline">{deposit.room_name} • {deposit.tenant_full_name} • Tiền cọc</span>
                </DialogTitle>
                <StatusBadge status={deposit.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {deposit.room_name} · {deposit.tenant_phone || "Chưa có SĐT"}
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

        <div className="grid gap-4 pt-3 sm:gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 sm:space-y-5">
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
                <InfoRow label="Đã hoàn">
                  <span className="tabular-nums">{formatMoney(summary.totalRefunded)}</span>
                </InfoRow>
                <InfoRow label="Còn giữ">
                  <span className="font-semibold tabular-nums text-amber-700">
                    {formatMoney(summary.remainingHeld)}
                  </span>
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

          <div className="space-y-4 sm:space-y-5 lg:sticky lg:top-14 lg:self-start">
            <SectionCard title="Tác vụ tiền cọc">
              {deposit.status === "pending_settlement" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSettlementMode("full");
                        setSettlementError(null);
                      }}
                      disabled={settling}
                      className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        settlementMode === "full"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Hoàn toàn bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSettlementMode("partial");
                        setSettlementError(null);
                      }}
                      disabled={settling}
                      className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        settlementMode === "partial"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Hoàn một phần
                    </button>
                  </div>

                  {settlementMode === "partial" && (
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Số tiền hoàn khách
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={partialRefundAmount}
                        onChange={(event) => {
                          setPartialRefundAmount(event.target.value);
                          setSettlementError(null);
                        }}
                        disabled={settling}
                        placeholder="Nhập số tiền hoàn"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  )}

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ghi chú quyết toán
                    </span>
                    <textarea
                      value={settlementNote}
                      onChange={(event) => setSettlementNote(event.target.value)}
                      disabled={settling}
                      rows={settlementMode === "partial" ? 3 : 4}
                      placeholder={
                        settlementMode === "partial"
                          ? "Nhập ghi chú quyết toán (nếu có)"
                          : "Nhập ghi chú hoàn cọc (nếu có)"
                      }
                      className="min-h-20 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  {settlementMode === "partial" && (
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3 py-1">
                        <span className="text-muted-foreground">Hoàn khách:</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {Number.isFinite(partialRefundValue) && partialRefundValue > 0
                            ? formatMoney(partialRefundValue)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-1">
                        <span className="text-muted-foreground">Giữ lại:</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {Number.isFinite(partialRefundValue) && partialRefundValue > 0
                            ? formatMoney(partialForfeitAmount)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  {partialRefundError && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {partialRefundError}
                    </div>
                  )}

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

                  {settlementMode === "full" ? (
                    <button
                      type="button"
                      onClick={() => void handleFullRefundSettlement()}
                      disabled={!canSettle}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {settling && <Loader2 className="h-4 w-4 animate-spin" />}
                      {settling ? "Đang quyết toán..." : "Hoàn toàn bộ & quyết toán"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handlePartialRefundSettlement()}
                      disabled={!canPartialSettle}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {settling && <Loader2 className="h-4 w-4 animate-spin" />}
                      {settling ? "Đang quyết toán..." : "Quyết toán một phần"}
                    </button>
                  )}
                </div>
              ) : deposit.status === "active" ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">Cọc vẫn đang hoạt động.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chỉ có thể quyết toán sau khi trả phòng và khoản cọc chuyển sang trạng thái chờ quyết toán.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">Cọc đã quyết toán.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Khoản cọc này đã xử lý xong, không còn tác vụ quyết toán tiếp theo.
                  </p>
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
