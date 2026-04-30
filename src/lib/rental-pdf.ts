import type { RentalRoom, RentalRoomBill, RentalSettings, InvoiceSettings } from "./finance-types";

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtDate(d = new Date()) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function noteFromTemplate(tpl: string, room: string, month: number, year: number) {
  return tpl
    .replace("{room}", room)
    .replace("{month}", String(month).padStart(2, "0"))
    .replace("{year}", String(year));
}

export interface PdfInvoiceInput {
  room: RentalRoom;
  bill: RentalRoomBill;
  month: number;
  year: number;
  settings: RentalSettings;
  invoiceSettings: InvoiceSettings;
}

function invoicePageHtml(input: PdfInvoiceInput): string {
  const { room, bill, month, year, settings, invoiceSettings } = input;
  const remaining = Math.max(0, bill.totalAmount - bill.paidAmount);

  const chargeRows = [
    { label: "Tiền thuê phòng", amount: bill.rentAmount },
    { label: "Tiền điện", amount: bill.electricityAmount },
    { label: "Tiền nước", amount: bill.waterAmount },
    { label: "Tiền wifi", amount: bill.wifiAmount },
    { label: "Vệ sinh / Rác", amount: bill.cleaningAmount },
    { label: settings.otherName || "Phụ phí", amount: bill.otherAmount },
  ].filter((r) => r.amount > 0);

  const rows = chargeRows
    .map(
      (r) => `
      <tr>
        <td>${r.label}</td>
        <td class="amt">${fmt(r.amount)}</td>
      </tr>`,
    )
    .join("");

  const bankSection =
    settings.bankName || settings.bankAccount || settings.bankHolder
      ? `<div class="section">
          <div class="section-title">Thông tin chuyển khoản</div>
          ${settings.bankName ? `<p>🏦 ${settings.bankName}</p>` : ""}
          ${settings.bankAccount ? `<p>STK: <strong>${settings.bankAccount}</strong></p>` : ""}
          ${settings.bankHolder ? `<p>Chủ TK: ${settings.bankHolder}</p>` : ""}
          ${settings.bankNoteTemplate ? `<p>Nội dung CK: ${noteFromTemplate(settings.bankNoteTemplate, room.name, month, year)}</p>` : ""}
        </div>`
      : "";

  return `
    <div class="invoice-page">
      <div class="header">
        ${invoiceSettings.propertyName ? `<div class="prop-name">${invoiceSettings.propertyName}</div>` : ""}
        ${invoiceSettings.address ? `<div class="prop-sub">${invoiceSettings.address}</div>` : ""}
        ${invoiceSettings.contactPhone ? `<div class="prop-sub">SĐT: ${invoiceSettings.contactPhone}</div>` : ""}
      </div>

      <h1>PHIẾU THANH TOÁN TIỀN PHÒNG</h1>
      <p class="sub">Kỳ thanh toán: Tháng ${String(month).padStart(2, "0")}/${year} &nbsp;|&nbsp; Ngày xuất: ${fmtDate()}</p>

      <hr/>

      <div class="section">
        <div class="section-title">Thông tin khách thuê</div>
        <p><strong>Phòng:</strong> ${room.name}</p>
        ${room.tenant ? `<p><strong>Khách thuê:</strong> ${room.tenant}</p>` : ""}
      </div>

      <table>
        <thead>
          <tr><th>Hạng mục</th><th class="amt">Số tiền</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="total"><td>TỔNG CỘNG</td><td class="amt">${fmt(bill.totalAmount)}</td></tr>
          ${bill.paidAmount > 0 ? `<tr class="paid"><td>Đã thanh toán</td><td class="amt">${fmt(bill.paidAmount)}</td></tr>` : ""}
          ${remaining > 0 ? `<tr class="due"><td>Còn phải trả</td><td class="amt">${fmt(remaining)}</td></tr>` : ""}
        </tfoot>
      </table>

      ${bankSection}

      <div class="footer">
        ${invoiceSettings.footerNote || "Cảm ơn quý khách đã thanh toán đúng hạn."}
      </div>
    </div>`;
}

const PRINT_CSS = `
  @charset "UTF-8";
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 13px; color: #111; }
  .invoice-page { max-width: 680px; margin: 32px auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-after: always; }
  .invoice-page:last-child { page-break-after: auto; }
  .header { margin-bottom: 12px; }
  .prop-name { font-size: 15px; font-weight: 700; }
  .prop-sub { font-size: 12px; color: #555; margin-top: 2px; }
  h1 { font-size: 16px; font-weight: 700; text-align: center; margin-top: 8px; letter-spacing: 0.02em; }
  .sub { text-align: center; color: #555; font-size: 12px; margin-top: 4px; margin-bottom: 16px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
  .section { margin: 14px 0; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin-bottom: 6px; }
  .section p { margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  thead tr { background: #111; color: #fff; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f1f1f1; }
  th { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tfoot tr { border-top: 2px solid #e5e7eb; }
  .total td { font-weight: 700; font-size: 14px; padding-top: 10px; }
  .paid td { color: #059669; }
  .due td { color: #dc2626; font-weight: 700; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; }
  .footer { margin-top: 24px; text-align: center; color: #888; font-style: italic; font-size: 12px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .invoice-page { border: none; margin: 0; padding: 20px; }
  }
`;

function openPrintWindow(invoicesHtml: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    alert("Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép pop-up để xuất PDF.");
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hóa đơn</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${invoicesHtml}
  <script>
    window.onload = function() { window.print(); };
  <\/script>
</body>
</html>`);
  win.document.close();
}

export function exportSingleInvoice(input: PdfInvoiceInput): void {
  openPrintWindow(invoicePageHtml(input));
}

export function exportAllInvoices(inputs: PdfInvoiceInput[]): void {
  if (inputs.length === 0) return;
  openPrintWindow(inputs.map(invoicePageHtml).join("\n"));
}
