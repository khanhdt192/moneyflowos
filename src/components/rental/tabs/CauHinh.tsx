import { useState } from "react";
import { Save, Info } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";

/* ─────────────────────────────────────────────────────────────
   Cấu hình chi phí — two cards: shared 201-305 / tầng 1
───────────────────────────────────────────────────────────── */

export function CauHinh() {
  const state = useFinance();
  const actions = useFinanceActions();
  const s = state.rental.settings;

  /* ── Shared config state ───────────────────────────── */
  const [elecRate, setElecRate] = useState(String(s.defaultElectricityRate));
  const [waterRate, setWaterRate] = useState(String(s.waterRatePerM3));
  const [wifi, setWifi] = useState(String(s.wifiPerRoom));
  const [cleaning, setCleaning] = useState(String(s.cleaningPerRoom));
  const [other, setOther] = useState(String(s.otherPerRoom));
  const [otherName, setOtherName] = useState(s.otherName || "Phụ phí");

  /* ── Tầng 1 config state ───────────────────────────── */
  const [t1Elec, setT1Elec] = useState(String(s.t1ElectricityBill));
  const [t1HasWifi, setT1HasWifi] = useState(s.t1HasWifi);
  const [t1Wifi, setT1Wifi] = useState(String(s.t1WifiPerRoom));
  const [t1Cleaning, setT1Cleaning] = useState(String(s.t1Cleaning));

  /* ── Save handlers ─────────────────────────────────── */
  const saveShared = () => {
    actions.updateRentalSettings({
      defaultElectricityRate: Number(elecRate) || 0,
      waterRatePerM3: Number(waterRate) || 0,
      wifiPerRoom: Number(wifi) || 0,
      cleaningPerRoom: Number(cleaning) || 0,
      otherPerRoom: Number(other) || 0,
      otherName: otherName.trim() || "Phụ phí",
    });
    toast.success("Đã lưu cấu hình phòng 201 – 305");
  };

  const saveT1 = () => {
    actions.updateRentalSettings({
      t1ElectricityBill: Number(t1Elec) || 0,
      t1HasWifi,
      t1WifiPerRoom: Number(t1Wifi) || 0,
      t1Cleaning: Number(t1Cleaning) || 0,
    });
    toast.success("Đã lưu cấu hình Tầng 1");
  };

  return (
    <div className="space-y-6">
      {/* Detection note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Phòng được nhận diện là <strong>Tầng 1</strong> khi tên phòng chứa "tầng 1" hoặc trường
          tầng = 1. Tất cả phòng còn lại áp dụng cấu hình chung 201–305.
        </span>
      </div>

      {/* Two-column grid on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Card A: Shared 201-305 ─────────────────── */}
        <Card
          title="🏢 Cấu hình chung — phòng 201 – 305"
          description="Áp dụng cho tất cả phòng từ 201 đến 305"
        >
          <Field
            label="⚡ Điện (đ / kWh)"
            value={elecRate}
            onChange={setElecRate}
            hint="Thường 3.500 – 4.500 đ/kWh"
          />
          <Field
            label="💧 Nước (đ / m³)"
            value={waterRate}
            onChange={setWaterRate}
            hint="Mặc định 24.000 đ/m³ — tính theo số m³ ghi ở tab Ghi số"
          />
          <Field
            label="📶 Wifi (đ / phòng / tháng)"
            value={wifi}
            onChange={setWifi}
            hint="VD: 70.000 — mỗi phòng trả cố định khoản này"
          />
          <Field
            label="🗑️ Vệ sinh / Rác (đ / phòng / tháng)"
            value={cleaning}
            onChange={setCleaning}
            hint="VD: 30.000 — mỗi phòng trả cố định khoản này"
          />

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              ➕ Tên phụ phí khác
            </label>
            <input
              type="text"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder="Phụ phí"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <Field
              label="Số tiền (đ / phòng / tháng)"
              value={other}
              onChange={setOther}
              hint={`VD: 100.000 — mỗi phòng trả khoản "${otherName || "Phụ phí"}" này`}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground mb-1">Tổng phí cố định / phòng / tháng</div>
            <SumRow label="Wifi" v={Number(wifi) || 0} />
            <SumRow label="Vệ sinh" v={Number(cleaning) || 0} />
            <SumRow label={otherName || "Phụ phí"} v={Number(other) || 0} />
            <div className="border-t border-border pt-1 mt-1">
              <SumRow
                label="Tổng (chưa kể điện + nước)"
                v={(Number(wifi) || 0) + (Number(cleaning) || 0) + (Number(other) || 0)}
                bold
              />
            </div>
          </div>

          <SaveBtn onClick={saveShared} />
        </Card>

        {/* ── Card B: Tầng 1 ─────────────────────────── */}
        <Card
          title="🏠 Cấu hình riêng — Tầng 1"
          description="Áp dụng cho phòng có tên chứa 'tầng 1' hoặc tầng = 1"
        >
          {/* Electricity: manual bill */}
          <div>
            <Field
              label="⚡ Tiền điện tháng này (đ)"
              value={t1Elec}
              onChange={setT1Elec}
              hint="Nhập số tiền trên hoá đơn điện chính phủ — không tính theo kWh"
            />
            <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Tầng 1 dùng đồng hồ điện riêng — nhập số tiền thực tế mỗi tháng tại đây.
            </div>
          </div>

          {/* Water: inherited */}
          <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs">
            <div className="font-medium text-foreground mb-1">💧 Nước</div>
            <p className="text-muted-foreground">
              Dùng chung giá nước với cấu hình 201–305:{" "}
              <span className="font-semibold text-foreground">
                {(Number(waterRate) || 0).toLocaleString("vi-VN")} đ/m³
              </span>
            </p>
            <p className="mt-1 text-muted-foreground/70">
              Ghi số m³ tiêu thụ ở tab Ghi số — hệ thống tự tính tiền.
            </p>
          </div>

          {/* Wifi: optional */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">📶 Wifi</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground">Có wifi</span>
                <button
                  type="button"
                  onClick={() => setT1HasWifi((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    t1HasWifi ? "bg-foreground" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${
                      t1HasWifi ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            </div>
            {t1HasWifi ? (
              <Field
                label="Phí wifi (đ / tháng)"
                value={t1Wifi}
                onChange={setT1Wifi}
                hint="Nhập giá riêng cho Tầng 1 (có thể khác phòng trên)"
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Tắt = không tính phí wifi cho Tầng 1 (khách dùng mạng riêng).
              </p>
            )}
          </div>

          {/* Cleaning */}
          <Field
            label="🗑️ Vệ sinh / Rác (đ / tháng)"
            value={t1Cleaning}
            onChange={setT1Cleaning}
            hint="Phí vệ sinh riêng cho Tầng 1"
          />

          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground mb-1">Tổng phí cố định Tầng 1 / tháng</div>
            <SumRow label="Điện (hóa đơn)" v={Number(t1Elec) || 0} />
            <SumRow label="Wifi" v={t1HasWifi ? Number(t1Wifi) || 0 : 0} />
            <SumRow label="Vệ sinh" v={Number(t1Cleaning) || 0} />
            <div className="border-t border-border pt-1 mt-1">
              <SumRow
                label="Tổng (chưa kể thuê + nước)"
                v={
                  (Number(t1Elec) || 0) +
                  (t1HasWifi ? Number(t1Wifi) || 0 : 0) +
                  (Number(t1Cleaning) || 0)
                }
                bold
              />
            </div>
          </div>

          <SaveBtn onClick={saveT1} />
        </Card>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="num mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-right outline-none focus:ring-2 focus:ring-ring/40"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SumRow({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-foreground" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{v.toLocaleString("vi-VN")} đ</span>
    </div>
  );
}

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-auto flex items-center gap-2 self-start rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
    >
      <Save className="h-3.5 w-3.5" />
      Lưu cấu hình
    </button>
  );
}
