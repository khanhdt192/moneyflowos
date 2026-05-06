import { financeStore } from "@/lib/finance-store";
import type { InvoiceSettings, RentalSettings } from "@/lib/finance-types";

export type PaymentSettingsFormValues = {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankQrUrl: string;
  bankNote: string;
};

export type InvoiceSettingsFormValues = {
  propertyName: string;
  address: string;
  phone: string;
  footer: string;
  logoUrl: string;
};

export type InvoiceSettingsSaveResult = {
  successMessage: string;
};

function buildPaymentSettingsPayload(values: PaymentSettingsFormValues): Partial<RentalSettings> {
  return {
    bankName: values.bankName.trim(),
    bankAccount: values.bankAccount.trim(),
    bankHolder: values.bankHolder.trim(),
    bankQrUrl: values.bankQrUrl.trim(),
    bankNoteTemplate: values.bankNote.trim() || "Phong {room} T{month}/{year}",
  };
}

function buildInvoiceSettingsPayload(values: InvoiceSettingsFormValues): Partial<InvoiceSettings> {
  return {
    propertyName: values.propertyName.trim(),
    address: values.address.trim(),
    contactPhone: values.phone.trim(),
    footerNote: values.footer.trim() || "Cảm ơn quý khách đã thanh toán đúng hạn.",
    logoUrl: values.logoUrl,
  };
}

export function buildPaymentNotePreview(template: string): string {
  return template
    .replace("{room}", "201")
    .replace("{month}", "05")
    .replace("{year}", "2026");
}

export const invoiceSettingsService = {
  savePaymentSettings(values: PaymentSettingsFormValues): InvoiceSettingsSaveResult {
    financeStore.updateRentalSettings(buildPaymentSettingsPayload(values));

    return {
      successMessage: "Đã lưu thông tin thanh toán",
    };
  },

  saveInvoiceSettings(values: InvoiceSettingsFormValues): InvoiceSettingsSaveResult {
    financeStore.updateInvoiceSettings(buildInvoiceSettingsPayload(values));

    return {
      successMessage: "Đã lưu thông tin hóa đơn",
    };
  },
};
