import type { ReactNode } from "react";
import { Info, Save } from "lucide-react";
import { useRentalSettingsForm } from "../hooks/useRentalSettingsForm";
import { formatMoney, formatNumber, parseNumber } from "@/utils/format";

export function ChiPhiKhac() {
  const { settings, values, setters, summary, saveShared, saveT1 } = useRentalSettingsForm();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Phòng được nhận diện là <strong>Tầng 1</strong> khi tên phòng chứa "tầng 1" hoặc trường tầng = 1.
          Tất cả phòng còn lại áp dụng cấu hình 201–305.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ConfigCard title="🏢 Cấu hình chung — phòng 201 – 305" desc="Áp dụng cho tất cả phòng từ 201 đến 305">
          <CField label="⚡ Điện (đ / kWh)" value={values.elecRate} onChange={setters.setElecRate} hint="Thường 3.500 – 4.500 đ/kWh" />
          <CField label="💧 Nước (đ / m³)" value={values.waterRate} onChange={setters.setWaterRate} hint="Mặc định 24.000 đ/m³" />
          <CField label="📶 Wifi (đ / phòng / tháng)" value={values.wifi} onChange={setters.setWifi} hint="VD: 70.000 — mỗi phòng trả cố định khoản này" />
          <CField label="🗑️ Vệ sinh / Rác (đ / phòng / tháng)" value={values.cleaning} onChange={setters.setCleaning} hint="VD: 30.000 — mỗi phòng trả cố định khoản này" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">➕ Tên phụ phí khác</label>
            <input
              type="text"
              value={values.otherName}
              onChange={(e) => setters.setOtherName(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <CField
              label="Số tiền (đ / phòng / tháng)"
              value={values.other}
              onChange={setters.setOther}
              hint={`VD: 100.000 — mỗi phòng trả khoản "${values.otherName || "Phụ phí"}" này`}
            />
          </div>
          <SumBox>
            <SumRow label="Wifi" v={Number(values.wifi) || 0} />
            <SumRow label="Vệ sinh" v={Number(values.cleaning) || 0} />
            <SumRow label={values.otherName || "Phụ phí"} v={Number(values.other) || 0} />
            <div className="border-t border-border pt-1">
              <SumRow label="Tổng cố định / phòng" v={summary.sharedFixedTotal} bold />
            </div>
          </SumBox>
          <SaveBtn onClick={saveShared} />
        </ConfigCard>

        <ConfigCard title="🏠 Cấu hình riêng — Tầng 1" desc="Áp dụng cho phòng có tên chứa 'tầng 1' hoặc tầng = 1">
          <div>
            <CField
              label="⚡ Tiền điện tháng này (đ)"
              value={values.t1Elec}
              onChange={setters.setT1Elec}
              hint="Nhập số tiền trên hóa đơn điện chính phủ — không tính theo kWh"
            />
            <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Tầng 1 dùng đồng hồ điện riêng — nhập số tiền thực tế mỗi tháng.
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs">
            <div className="font-medium text-foreground mb-1">💧 Nước</div>
            <p className="text-muted-foreground">
              Dùng chung giá nước 201–305:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(Number(settings.waterRatePerM3))} đ/m³
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">📶 Wifi</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground">Có wifi</span>
                <button
                  type="button"
                  onClick={() => setters.setT1HasWifi((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${values.t1HasWifi ? "bg-foreground" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${values.t1HasWifi ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
            {values.t1HasWifi ? (
              <CField label="Phí wifi (đ / tháng)" value={values.t1Wifi} onChange={setters.setT1Wifi} hint="Giá riêng cho Tầng 1" />
            ) : (
              <p className="text-xs text-muted-foreground italic">Tắt = không tính phí wifi (khách dùng mạng riêng).</p>
            )}
          </div>
          <CField label="🗑️ Vệ sinh / Rác (đ / tháng)" value={values.t1Cleaning} onChange={setters.setT1Cleaning} hint="Phí vệ sinh riêng cho Tầng 1" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">➕ Tên phụ phí khác</label>
            <input
              type="text"
              value={values.t1OtherName}
              onChange={(e) => setters.setT1OtherName(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <CField label="Số tiền (đ / tháng)" value={values.t1Other} onChange={setters.setT1Other} />
          </div>
          <SumBox>
            <SumRow label="Điện (hóa đơn)" v={Number(values.t1Elec) || 0} />
            <SumRow label="Wifi" v={values.t1HasWifi ? Number(values.t1Wifi) || 0 : 0} />
            <SumRow label="Vệ sinh" v={Number(values.t1Cleaning) || 0} />
            <SumRow label={values.t1OtherName || "Phụ phí"} v={Number(values.t1Other) || 0} />
            <div className="border-t border-border pt-1">
              <SumRow label="Tổng cố định (chưa kể thuê + nước)" v={summary.t1FixedTotal} bold />
            </div>
          </SumBox>
          <SaveBtn onClick={saveT1} />
        </ConfigCard>
      </div>
    </div>
  );
}

function ConfigCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function CField({ label, value, onChange, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value ? formatNumber(parseNumber(value)) : ""}
        onChange={(e) => onChange(String(parseNumber(e.target.value.replace(/[^\d,]/g, ""))))}
        className="num mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-right outline-none focus:ring-2 focus:ring-ring/40"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SumBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
      <div className="font-medium text-foreground mb-1">Tóm tắt</div>
      {children}
    </div>
  );
}

function SumRow({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-foreground" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatMoney(v)}</span>
    </div>
  );
}

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-auto flex items-center gap-2 self-start rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
    >
      <Save className="h-3.5 w-3.5" />
      Lưu cấu hình
    </button>
  );
}
