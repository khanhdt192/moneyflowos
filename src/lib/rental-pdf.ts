import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RentalRoom, RentalRoomBill, RentalSettings, InvoiceSettings } from "./finance-types";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function formatDate(d = new Date()) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function buildNoteTemplate(template: string, roomName: string, month: number, year: number) {
  return template
    .replace("{room}", roomName)
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
  otherName?: string;
}

function addInvoicePage(doc: jsPDF, input: PdfInvoiceInput) {
  const { room, bill, month, year, settings, invoiceSettings } = input;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // ── Header ─────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PHIEU THANH TOAN TIEN PHONG", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Ky thanh toan: Thang ${String(month).padStart(2, "0")}/${year}`, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text(`Ngay xuat: ${formatDate()}`, pageWidth / 2, y, { align: "center" });
  y += 12;

  // ── Property info ───────────────────────────────────────
  if (invoiceSettings.propertyName || invoiceSettings.address || invoiceSettings.contactPhone) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("THONG TIN NHA TRO", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (invoiceSettings.propertyName) { doc.text(invoiceSettings.propertyName, margin, y); y += 5; }
    if (invoiceSettings.address)      { doc.text(invoiceSettings.address, margin, y); y += 5; }
    if (invoiceSettings.contactPhone) { doc.text(`SDT: ${invoiceSettings.contactPhone}`, margin, y); y += 5; }
    y += 4;
  }

  // ── Divider ─────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Tenant info ─────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("THONG TIN KHACH THUE", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Phong: ${room.name}`, margin, y);
  y += 5;
  if (room.tenant) {
    doc.text(`Khach thue: ${room.tenant}`, margin, y);
    y += 5;
  }
  y += 4;

  // ── Charge table ─────────────────────────────────────────
  const rows: [string, string][] = [
    ["Tien thue phong", formatVND(bill.rentAmount)],
  ];
  if (bill.electricityAmount > 0) rows.push(["Tien dien", formatVND(bill.electricityAmount)]);
  if (bill.waterAmount > 0)       rows.push(["Tien nuoc", formatVND(bill.waterAmount)]);
  if (bill.wifiAmount > 0)        rows.push(["Tien wifi", formatVND(bill.wifiAmount)]);
  if (bill.cleaningAmount > 0)    rows.push(["Ve sinh / Rac", formatVND(bill.cleaningAmount)]);
  if (bill.otherAmount > 0) {
    const name = settings.otherName || "Phu phi";
    rows.push([name, formatVND(bill.otherAmount)]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Hang muc", "So tien"]],
    body: rows,
    foot: [
      ["TONG CONG", formatVND(bill.totalAmount)],
      ["DA THANH TOAN", formatVND(bill.paidAmount)],
      ["CON THIEU", formatVND(Math.max(0, bill.totalAmount - bill.paidAmount))],
    ],
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold", fontSize: 10 },
    footStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: margin, right: margin },
    theme: "striped",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Payment box ─────────────────────────────────────────
  if (settings.bankName || settings.bankAccount || settings.bankHolder) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("THONG TIN CHUYEN KHOAN", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (settings.bankName)    { doc.text(`Ngan hang: ${settings.bankName}`, margin, y); y += 5; }
    if (settings.bankAccount) { doc.text(`STK: ${settings.bankAccount}`, margin, y); y += 5; }
    if (settings.bankHolder)  { doc.text(`Chu TK: ${settings.bankHolder}`, margin, y); y += 5; }
    if (settings.bankNoteTemplate) {
      const note = buildNoteTemplate(settings.bankNoteTemplate, room.name, month, year);
      doc.text(`Noi dung CK: ${note}`, margin, y); y += 5;
    }
    y += 4;
  }

  // ── Footer ──────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const footer = invoiceSettings.footerNote || "Cam on quy khach da thanh toan dung han.";
  doc.text(footer, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

/** Export a single room invoice as a PDF download */
export function exportSingleInvoice(input: PdfInvoiceInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addInvoicePage(doc, input);
  const filename = `HoaDon_${input.room.name.replace(/\s+/g, "_")}_T${String(input.month).padStart(2, "0")}_${input.year}.pdf`;
  doc.save(filename);
}

/** Export all rooms as a multi-page PDF */
export function exportAllInvoices(inputs: PdfInvoiceInput[]): void {
  if (inputs.length === 0) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  inputs.forEach((input, i) => {
    if (i > 0) doc.addPage();
    addInvoicePage(doc, input);
  });
  const [first] = inputs;
  doc.save(`HoaDon_TatCa_T${String(first.month).padStart(2, "0")}_${first.year}.pdf`);
}
