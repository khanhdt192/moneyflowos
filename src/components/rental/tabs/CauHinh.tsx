import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";

export function CauHinh() {
  const state = useFinance();
  const actions = useFinanceActions();
  const settings = state.rental.settings;

  const [elecRate, setElecRate] = useState(String(settings.defaultElectricityRate));
  const [waterRate, setWaterRate] = useState(String(settings.waterRatePerM3));
  const [wifi, setWifi] = useState(String(settings.wifiTotal));
  const [cleaning, setCleaning] = useState(String(settings.cleaningTotal));
  const [other, setOther] = useState(String(settings.otherTotal));

  const handleSave = () => {
    actions.updateRentalSettings({
      defaultElectricityRate: Number(elecRate) || 0,
      waterRatePerM3: Number(waterRate) || 0,
      wifiTotal: Number(wifi) || 0,
      cleaningTotal: Number(cleaning) || 0,
      otherTotal: Number(other) || 0,
    });
    toast.success("Đã lưu cấu hình");
  };

  return (
    <div className="max-w-xl space-y-6">
      <Section title="⚡ Điện" description="Giá điện mặc định áp dụng cho tất cả phòng (trừ phòng cài đặt riêng)">
        <Field
          label="Giá điện mặc định (đ/kWh)"
          value={elecRate}
          onChange={setElecRate}
          hint="Thường là 3.500 – 4.500 đ/kWh"
        />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <strong>Lưu ý:</strong> Phòng tầng 1 dùng đồng hồ chính phủ riêng — có thể cài đặt giá riêng trong thông tin phòng.
          Các phòng 201–305 mặc định dùng giá trên.
        </div>
      </Section>

      <Section title="💧 Nước" description="Giá nước tính theo m³ — mỗi phòng trả theo lượng tiêu thụ thực tế nhập ở tab Ghi số">
        <Field
          label="Giá nước (đ / m³)"
          value={waterRate}
          onChange={setWaterRate}
          hint="Mặc định 24.000 đ/m³ — tiền nước = số m³ nhập × giá này"
        />
      </Section>

      <Section title="📶 Wifi" description="Chi phí wifi hàng tháng — chia đều cho các phòng (trừ phòng tầng 1 nếu có)">
        <Field
          label="Tổng tiền wifi / tháng (đ)"
          value={wifi}
          onChange={setWifi}
          hint="VD: 70.000 × số phòng có wifi"
        />
      </Section>

      <Section title="🗑️ Vệ sinh / Rác" description="Chi phí vệ sinh chung hàng tháng">
        <Field
          label="Tổng phí vệ sinh / tháng (đ)"
          value={cleaning}
          onChange={setCleaning}
          hint="VD: tầng 1 = 50.000, các phòng khác = 30.000"
        />
      </Section>

      <Section title="➕ Phụ phí khác" description="Các chi phí phát sinh khác — chia đều">
        <Field
          label="Phụ phí khác / tháng (đ)"
          value={other}
          onChange={setOther}
          hint="Tuỳ chọn"
        />
      </Section>

      <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <div className="font-semibold text-foreground text-sm mb-2">📊 Tóm tắt hiện tại</div>
        <SummaryRow label="Điện mặc định" value={`${(Number(elecRate) || 0).toLocaleString("vi-VN")} đ/kWh`} />
        <SummaryRow label="Nước" value={`${(Number(waterRate) || 0).toLocaleString("vi-VN")} đ/m³`} />
        <SummaryRow label="Wifi (chung)" value={`${(Number(wifi) || 0).toLocaleString("vi-VN")} đ/tháng`} />
        <SummaryRow label="Vệ sinh (chung)" value={`${(Number(cleaning) || 0).toLocaleString("vi-VN")} đ/tháng`} />
        <SummaryRow label="Phụ phí (chung)" value={`${(Number(other) || 0).toLocaleString("vi-VN")} đ/tháng`} />
        <div className="border-t border-border pt-2 mt-2">
          <SummaryRow
            label="Phí chung / tháng (wifi + vệ sinh + khác)"
            value={`${((Number(wifi) || 0) + (Number(cleaning) || 0) + (Number(other) || 0)).toLocaleString("vi-VN")} đ`}
            bold
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
      >
        <Save className="h-4 w-4" />
        Lưu cấu hình
      </button>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
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

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-foreground" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
