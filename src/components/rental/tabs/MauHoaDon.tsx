import type { ReactNode } from "react";
import { CheckCircle, Copy, Save } from "lucide-react";
import { useInvoiceSettingsForm } from "../hooks/useInvoiceSettingsForm";

export function MauHoaDon() {
  const { values, setters, previewNote, copy, savePayment, saveInvoice } = useInvoiceSettingsForm();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ConfigCard title="🏦 Chuyển khoản" desc="Thông tin hiển thị trong hóa đơn và màn hình thu tiền">
        <CTextField label="Tên ngân hàng" value={values.bankName} onChange={setters.setBankName} placeholder="VD: MB Bank, VietcomBank…" />
        <CTextField label="Số tài khoản" value={values.bankAccount} onChange={setters.setBankAccount} placeholder="VD: 0987654321" mono />
        <CTextField label="Chủ tài khoản" value={values.bankHolder} onChange={setters.setBankHolder} placeholder="NGUYEN VAN A" />
        <CTextField
          label="URL ảnh QR code"
          value={values.bankQrUrl}
          onChange={setters.setBankQrUrl}
          placeholder="https://…"
          hint="Dán URL ảnh QR ngân hàng — VietQR hoặc Imgur/CDN"
        />

        <div>
          <label className="text-xs font-medium text-muted-foreground">Mẫu nội dung chuyển khoản</label>
          <input
            value={values.bankNote}
            onChange={(e) => setters.setBankNote(e.target.value)}
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

        {(values.bankAccount || values.bankQrUrl) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
            {values.bankName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ngân hàng</span>
                <span className="font-medium">{values.bankName}</span>
              </div>
            )}
            {values.bankAccount && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Số TK</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{values.bankAccount}</span>
                  <button
                    type="button"
                    onClick={() => copy(values.bankAccount, "stk")}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border border-border hover:bg-muted/40"
                  >
                    {values.copied === "stk" ? <CheckCircle className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {values.copied === "stk" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {values.bankHolder && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Chủ TK</span>
                <span className="font-medium">{values.bankHolder}</span>
              </div>
            )}
            {values.bankNote && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nội dung CK</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{previewNote}</span>
                  <button
                    type="button"
                    onClick={() => copy(previewNote, "note")}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border border-border hover:bg-muted/40"
                  >
                    {values.copied === "note" ? <CheckCircle className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {values.copied === "note" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {values.bankQrUrl && (
              <div className="flex justify-center pt-2">
                <img src={values.bankQrUrl} alt="QR Preview" className="h-36 w-36 rounded-xl border border-border object-contain shadow-sm" />
              </div>
            )}
          </div>
        )}

        <SaveBtn onClick={savePayment} />
      </ConfigCard>

      <ConfigCard title="📄 Mẫu hóa đơn" desc="Thông tin xuất hiện ở đầu mỗi tờ hóa đơn PDF">
        <CTextField label="Tên nhà trọ" value={values.propertyName} onChange={setters.setPropertyName} placeholder="VD: Nhà trọ Hoàng Gia" />
        <CTextField label="Địa chỉ" value={values.address} onChange={setters.setAddress} placeholder="VD: 123 Nguyễn Văn A, Q.1, TP.HCM" />
        <CTextField label="SĐT liên hệ" value={values.phone} onChange={setters.setPhone} placeholder="VD: 0901 234 567" />
        <div>
          <label className="text-xs font-medium text-muted-foreground">Lời cảm ơn cuối hóa đơn</label>
          <textarea
            value={values.footer}
            onChange={(e) => setters.setFooter(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            placeholder="Cảm ơn quý khách đã thanh toán đúng hạn."
          />
        </div>

        {(values.propertyName || values.address || values.phone) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview đầu hóa đơn</p>
            <p className="text-sm font-bold">{values.propertyName || "(Tên nhà trọ)"}</p>
            {values.address && <p className="text-sm text-muted-foreground">{values.address}</p>}
            {values.phone && <p className="text-sm text-muted-foreground">SĐT: {values.phone}</p>}
            {values.footer && (
              <p className="mt-2 text-xs text-muted-foreground italic border-t border-border pt-2">
                &ldquo;{values.footer}&rdquo;
              </p>
            )}
          </div>
        )}

        <SaveBtn onClick={saveInvoice} />
      </ConfigCard>
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

function CTextField({ label, value, onChange, placeholder, hint, mono }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
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
