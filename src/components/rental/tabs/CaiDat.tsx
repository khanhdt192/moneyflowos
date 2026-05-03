import { useState } from "react";
import { Save, Copy, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { formatMoney, formatNumber, parseNumber } from "@/utils/format";

type Section = "chiphi" | "thanhtoan";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "chiphi",    label: "Chi phí khác" },
  { id: "thanhtoan", label: "Mẫu hóa đơn" },
];

export function CaiDat({
  initialSection,
  hideSectionTabs = true,
}: {
  initialSection?: Section;
  hideSectionTabs?: boolean;
}) {
  const [section, setSection] = useState<Section>(initialSection ?? "chiphi");

  return (
    <div className="space-y-6">
      {!hideSectionTabs && (
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-all ${
                section === s.id
                  ? "bg-white font-semibold text-foreground shadow-sm"
                  : "font-medium text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {section === "chiphi"    && <SectionChiPhi />}
      {section === "thanhtoan" && <SectionThanhToanHoaDon />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Chi phí — dual config (201-305 + Tầng 1)
══════════════════════════════════════════════════════ */
function SectionChiPhi() {
  const state = useFinance();
  const actions = useFinanceActions();
  const s = state.rental.settings;

  const [elecRate, setElecRate]   = useState(String(s.defaultElectricityRate));
  const [waterRate, setWaterRate] = useState(String(s.waterRatePerM3));
  const [wifi, setWifi]           = useState(String(s.wifiPerRoom));
  const [cleaning, setCleaning]   = useState(String(s.cleaningPerRoom));
  const [other, setOther]         = useState(String(s.otherPerRoom));
  const [otherName, setOtherName] = useState(s.otherName || "Phụ phí");

  const [t1Elec, setT1Elec]           = useState(String(s.t1ElectricityBill));
  const [t1HasWifi, setT1HasWifi]     = useState(s.t1HasWifi);
  const [t1Wifi, setT1Wifi]           = useState(String(s.t1WifiPerRoom));
  const [t1Cleaning, setT1Cleaning]   = useState(String(s.t1Cleaning));
  const [t1OtherName, setT1OtherName] = useState(s.t1OtherName || "Phụ phí");
  const [t1Other, setT1Other]         = useState(String(s.t1OtherPerRoom));

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
      t1OtherName: t1OtherName.trim() || "Phụ phí",
      t1OtherPerRoom: Number(t1Other) || 0,
    });
    toast.success("Đã lưu cấu hình Tầng 1");
  };

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
        {/* Card A: 201-305 */}
        <ConfigCard title="🏢 Cấu hình chung — phòng 201 – 305" desc="Áp dụng cho tất cả phòng từ 201 đến 305">
          <CField label="⚡ Điện (đ / kWh)" value={elecRate} onChange={setElecRate} hint="Thường 3.500 – 4.500 đ/kWh" />
          <CField label="💧 Nước (đ / m³)" value={waterRate} onChange={setWaterRate} hint="Mặc định 24.000 đ/m³" />
          <CField label="📶 Wifi (đ / phòng / tháng)" value={wifi} onChange={setWifi} hint="VD: 70.000 — mỗi phòng trả cố định khoản này" />
          <CField label="🗑️ Vệ sinh / Rác (đ / phòng / tháng)" value={cleaning} onChange={setCleaning} hint="VD: 30.000 — mỗi phòng trả cố định khoản này" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">➕ Tên phụ phí khác</label>
            <input type="text" value={otherName} onChange={(e) => setOtherName(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            <CField label="Số tiền (đ / phòng / tháng)" value={other} onChange={setOther}
              hint={`VD: 100.000 — mỗi phòng trả khoản "${otherName || "Phụ phí"}" này`} />
          </div>
          <SumBox>
            <SumRow label="Wifi" v={Number(wifi) || 0} />
            <SumRow label="Vệ sinh" v={Number(cleaning) || 0} />
            <SumRow label={otherName || "Phụ phí"} v={Number(other) || 0} />
            <div className="border-t border-border pt-1">
              <SumRow label="Tổng cố định / phòng"
                v={(Number(wifi)||0)+(Number(cleaning)||0)+(Number(other)||0)} bold />
            </div>
          </SumBox>
          <SaveBtn onClick={saveShared} />
        </ConfigCard>

        {/* Card B: Tầng 1 */}
        <ConfigCard title="🏠 Cấu hình riêng — Tầng 1" desc="Áp dụng cho phòng có tên chứa 'tầng 1' hoặc tầng = 1">
          <div>
            <CField label="⚡ Tiền điện tháng này (đ)" value={t1Elec} onChange={setT1Elec}
              hint="Nhập số tiền trên hóa đơn điện chính phủ — không tính theo kWh" />
            <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Tầng 1 dùng đồng hồ điện riêng — nhập số tiền thực tế mỗi tháng.
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs">
            <div className="font-medium text-foreground mb-1">💧 Nước</div>
            <p className="text-muted-foreground">
              Dùng chung giá nước 201–305:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(Number(s.waterRatePerM3))} đ/m³
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">📶 Wifi</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground">Có wifi</span>
                <button type="button" onClick={() => setT1HasWifi((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${t1HasWifi ? "bg-foreground" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${t1HasWifi ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
            {t1HasWifi
              ? <CField label="Phí wifi (đ / tháng)" value={t1Wifi} onChange={setT1Wifi} hint="Giá riêng cho Tầng 1" />
              : <p className="text-xs text-muted-foreground italic">Tắt = không tính phí wifi (khách dùng mạng riêng).</p>}
          </div>
          <CField label="🗑️ Vệ sinh / Rác (đ / tháng)" value={t1Cleaning} onChange={setT1Cleaning} hint="Phí vệ sinh riêng cho Tầng 1" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">➕ Tên phụ phí khác</label>
            <input type="text" value={t1OtherName} onChange={(e) => setT1OtherName(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            <CField label="Số tiền (đ / tháng)" value={t1Other} onChange={setT1Other} />
          </div>
          <SumBox>
            <SumRow label="Điện (hóa đơn)" v={Number(t1Elec) || 0} />
            <SumRow label="Wifi" v={t1HasWifi ? Number(t1Wifi) || 0 : 0} />
            <SumRow label="Vệ sinh" v={Number(t1Cleaning) || 0} />
            <SumRow label={t1OtherName || "Phụ phí"} v={Number(t1Other) || 0} />
            <div className="border-t border-border pt-1">
              <SumRow label="Tổng cố định (chưa kể thuê + nước)"
                v={(Number(t1Elec)||0)+(t1HasWifi?Number(t1Wifi)||0:0)+(Number(t1Cleaning)||0)+(Number(t1Other)||0)} bold />
            </div>
          </SumBox>
          <SaveBtn onClick={saveT1} />
        </ConfigCard>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Thanh toán & hóa đơn — merged 2-column section
══════════════════════════════════════════════════════ */
function SectionThanhToanHoaDon() {
  const state   = useFinance();
  const actions = useFinanceActions();
  const s  = state.rental.settings;
  const iv = state.rental.invoiceSettings;

  /* ── Payment state ── */
  const [bankName,    setBankName]    = useState(s.bankName);
  const [bankAccount, setBankAccount] = useState(s.bankAccount);
  const [bankHolder,  setBankHolder]  = useState(s.bankHolder);
  const [bankQrUrl,   setBankQrUrl]   = useState(s.bankQrUrl);
  const [bankNote,    setBankNote]    = useState(s.bankNoteTemplate);
  const [copied, setCopied]           = useState<string | null>(null);

  /* ── Invoice state ── */
  const [propertyName, setPropertyName] = useState(iv.propertyName);
  const [address, setAddress]           = useState(iv.address);
  const [phone, setPhone]               = useState(iv.contactPhone);
  const [footer, setFooter]             = useState(iv.footerNote);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const savePayment = () => {
    actions.updateRentalSettings({
      bankName:         bankName.trim(),
      bankAccount:      bankAccount.trim(),
      bankHolder:       bankHolder.trim(),
      bankQrUrl:        bankQrUrl.trim(),
      bankNoteTemplate: bankNote.trim() || "Phong {room} T{month}/{year}",
    });
    toast.success("Đã lưu thông tin thanh toán");
  };

  const saveInvoice = () => {
    actions.updateInvoiceSettings({
      propertyName: propertyName.trim(),
      address:      address.trim(),
      contactPhone: phone.trim(),
      footerNote:   footer.trim() || "Cảm ơn quý khách đã thanh toán đúng hạn.",
      logoUrl:      iv.logoUrl,
    });
    toast.success("Đã lưu thông tin hóa đơn");
  };

  const previewNote = bankNote
    .replace("{room}", "201")
    .replace("{month}", "05")
    .replace("{year}", "2026");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── LEFT: Chuyển khoản ── */}
      <ConfigCard title="🏦 Chuyển khoản" desc="Thông tin hiển thị trong hóa đơn và màn hình thu tiền">
        <CTextField label="Tên ngân hàng" value={bankName} onChange={setBankName}
          placeholder="VD: MB Bank, VietcomBank…" />
        <CTextField label="Số tài khoản" value={bankAccount} onChange={setBankAccount}
          placeholder="VD: 0987654321" mono />
        <CTextField label="Chủ tài khoản" value={bankHolder} onChange={setBankHolder}
          placeholder="NGUYEN VAN A" />
        <CTextField label="URL ảnh QR code" value={bankQrUrl} onChange={setBankQrUrl}
          placeholder="https://…"
          hint="Dán URL ảnh QR ngân hàng — VietQR hoặc Imgur/CDN" />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Mẫu nội dung chuyển khoản</label>
          <input
            value={bankNote}
            onChange={(e) => setBankNote(e.target.value)}
            placeholder="Phong {room} T{month}/{year}"
            className="mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Dùng{" "}
            <code className="rounded bg-muted px-1">{"{room}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{month}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{year}"}</code>{" "}
            làm biến.
          </p>
        </div>

        {/* Inline preview */}
        {(bankAccount || bankQrUrl) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
            {bankName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ngân hàng</span>
                <span className="font-medium">{bankName}</span>
              </div>
            )}
            {bankAccount && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Số TK</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{bankAccount}</span>
                  <button type="button" onClick={() => copy(bankAccount, "stk")}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border border-border hover:bg-muted/40">
                    {copied === "stk"
                      ? <CheckCircle className="h-3 w-3 text-emerald-600" />
                      : <Copy className="h-3 w-3" />}
                    {copied === "stk" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {bankHolder && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Chủ TK</span>
                <span className="font-medium">{bankHolder}</span>
              </div>
            )}
            {bankNote && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nội dung CK</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{previewNote}</span>
                  <button type="button" onClick={() => copy(previewNote, "note")}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border border-border hover:bg-muted/40">
                    {copied === "note"
                      ? <CheckCircle className="h-3 w-3 text-emerald-600" />
                      : <Copy className="h-3 w-3" />}
                    {copied === "note" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {bankQrUrl && (
              <div className="flex justify-center pt-2">
                <img src={bankQrUrl} alt="QR Preview"
                  className="h-36 w-36 rounded-xl border border-border object-contain shadow-sm" />
              </div>
            )}
          </div>
        )}

        <SaveBtn onClick={savePayment} />
      </ConfigCard>

      {/* ── RIGHT: Mẫu hóa đơn ── */}
      <ConfigCard title="📄 Mẫu hóa đơn" desc="Thông tin xuất hiện ở đầu mỗi tờ hóa đơn PDF">
        <CTextField label="Tên nhà trọ" value={propertyName} onChange={setPropertyName}
          placeholder="VD: Nhà trọ Hoàng Gia" />
        <CTextField label="Địa chỉ" value={address} onChange={setAddress}
          placeholder="VD: 123 Nguyễn Văn A, Q.1, TP.HCM" />
        <CTextField label="SĐT liên hệ" value={phone} onChange={setPhone}
          placeholder="VD: 0901 234 567" />
        <div>
          <label className="text-xs font-medium text-muted-foreground">Lời cảm ơn cuối hóa đơn</label>
          <textarea
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            placeholder="Cảm ơn quý khách đã thanh toán đúng hạn."
          />
        </div>

        {/* Inline preview */}
        {(propertyName || address || phone) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview đầu hóa đơn</p>
            <p className="text-sm font-bold">{propertyName || "(Tên nhà trọ)"}</p>
            {address && <p className="text-sm text-muted-foreground">{address}</p>}
            {phone   && <p className="text-sm text-muted-foreground">SĐT: {phone}</p>}
            {footer  && (
              <p className="mt-2 text-xs text-muted-foreground italic border-t border-border pt-2">
                &ldquo;{footer}&rdquo;
              </p>
            )}
          </div>
        )}

        <SaveBtn onClick={saveInvoice} />
      </ConfigCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Shared sub-components
══════════════════════════════════════════════════════ */

function ConfigCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
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
  label: string; value: string; onChange: (v: string) => void; hint?: string;
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

function CTextField({ label, value, onChange, placeholder, hint, mono }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${mono ? "font-mono" : ""}`}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SumBox({ children }: { children: React.ReactNode }) {
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
