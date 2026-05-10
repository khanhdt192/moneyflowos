import type { RentalDepositForTab } from "@/services/deposit.service";
import { formatMoney } from "@/utils/format";
import { DEPOSIT_STATUS_CONFIG, formatDepositDate } from "./TienCocDetailModal";

type LifecycleGroup = {
  status: RentalDepositForTab["status"];
  title: string;
  description: string;
};

const LIFECYCLE_GROUPS: LifecycleGroup[] = [
  {
    status: "pending_settlement",
    title: "Chờ quyết toán",
    description: "Đã trả phòng, cần xử lý hoàn hoặc giữ lại cọc.",
  },
  {
    status: "active",
    title: "Đang giữ",
    description: "Cọc đang giữ cho lượt ở hiện tại.",
  },
  {
    status: "settled",
    title: "Đã quyết toán",
    description: "Khoản cọc đã xử lý xong.",
  },
];

function StatusBadge({ status }: { status: RentalDepositForTab["status"] }) {
  const config = DEPOSIT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function getLifecycleClue(deposit: RentalDepositForTab): string {
  if (deposit.status === "pending_settlement") {
    return `Trả phòng: ${formatDepositDate(deposit.vacated_at)}`;
  }

  if (deposit.status === "settled") {
    return `Quyết toán: ${formatDepositDate(deposit.settled_at)}`;
  }

  return `Ngày thu: ${formatDepositDate(deposit.collected_at)}`;
}

export function TienCocMobileCards({
  deposits,
  loading,
  onSelectDeposit,
}: {
  deposits: RentalDepositForTab[];
  loading: boolean;
  onSelectDeposit: (deposit: RentalDepositForTab) => void;
}) {
  return (
    <div className="space-y-4 md:hidden">
      {loading && deposits.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
          Đang tải danh sách tiền cọc...
        </div>
      )}

      {!loading && deposits.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có khoản cọc nào.
        </div>
      )}

      {LIFECYCLE_GROUPS.map((group) => {
        const groupDeposits = deposits.filter((deposit) => deposit.status === group.status);
        if (groupDeposits.length === 0) return null;

        return (
          <section key={group.status} className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {groupDeposits.length}
              </span>
            </div>

            <div className="space-y-3">
              {groupDeposits.map((deposit) => (
                <article
                  key={deposit.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold text-foreground">
                        {deposit.tenant_full_name}
                      </h4>
                      {deposit.tenant_phone && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{deposit.tenant_phone}</p>
                      )}
                    </div>
                    <StatusBadge status={deposit.status} />
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl bg-muted/25 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Phòng</span>
                      <span className="font-medium text-foreground">{deposit.room_name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Đã cọc</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(deposit.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Mốc vòng đời</span>
                      <span className="text-right font-medium text-foreground">
                        {getLifecycleClue(deposit)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectDeposit(deposit)}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    Chi tiết
                  </button>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
