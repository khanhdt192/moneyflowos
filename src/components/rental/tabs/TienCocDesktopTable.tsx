import { Eye } from "lucide-react";
import type { RentalDepositForTab } from "@/services/deposit.service";
import { formatMoney } from "@/utils/format";
import { DEPOSIT_STATUS_CONFIG, formatDepositDate } from "./TienCocDetailModal";

function StatusBadge({ status }: { status: RentalDepositForTab["status"] }) {
  const config = DEPOSIT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function TienCocDesktopTable({
  deposits,
  loading,
  onSelectDeposit,
}: {
  deposits: RentalDepositForTab[];
  loading: boolean;
  onSelectDeposit: (deposit: RentalDepositForTab) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border shadow-sm md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Người thuê</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đã cọc</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày thu</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày trả phòng</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading && deposits.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                Đang tải danh sách tiền cọc...
              </td>
            </tr>
          )}

          {!loading && deposits.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                Chưa có khoản cọc nào.
              </td>
            </tr>
          )}

          {deposits.map((deposit) => (
            <tr
              key={deposit.id}
              onClick={() => onSelectDeposit(deposit)}
              className="cursor-pointer bg-card transition-all hover:bg-muted/20 hover:shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.45)]"
            >
              <td className="px-4 py-3">
                <div className="leading-tight">
                  <div className="font-medium text-foreground">{deposit.tenant_full_name}</div>
                  {deposit.tenant_phone && (
                    <div className="mt-1 text-xs text-muted-foreground">{deposit.tenant_phone}</div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{deposit.room_name}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{formatMoney(deposit.amount)}</td>
              <td className="px-4 py-3 text-center"><StatusBadge status={deposit.status} /></td>
              <td className="px-4 py-3 text-muted-foreground">{formatDepositDate(deposit.collected_at)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDepositDate(deposit.vacated_at)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDeposit(deposit);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Xem chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
