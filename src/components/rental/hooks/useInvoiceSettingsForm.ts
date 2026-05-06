import { useState } from "react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";

export function useInvoiceSettingsForm() {
  const state = useFinance();
  const actions = useFinanceActions();
  const settings = state.rental.settings;
  const invoiceSettings = state.rental.invoiceSettings;

  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccount, setBankAccount] = useState(settings.bankAccount);
  const [bankHolder, setBankHolder] = useState(settings.bankHolder);
  const [bankQrUrl, setBankQrUrl] = useState(settings.bankQrUrl);
  const [bankNote, setBankNote] = useState(settings.bankNoteTemplate);
  const [copied, setCopied] = useState<string | null>(null);

  const [propertyName, setPropertyName] = useState(invoiceSettings.propertyName);
  const [address, setAddress] = useState(invoiceSettings.address);
  const [phone, setPhone] = useState(invoiceSettings.contactPhone);
  const [footer, setFooter] = useState(invoiceSettings.footerNote);

  const resetFromStore = () => {
    setBankName(settings.bankName);
    setBankAccount(settings.bankAccount);
    setBankHolder(settings.bankHolder);
    setBankQrUrl(settings.bankQrUrl);
    setBankNote(settings.bankNoteTemplate);
    setPropertyName(invoiceSettings.propertyName);
    setAddress(invoiceSettings.address);
    setPhone(invoiceSettings.contactPhone);
    setFooter(invoiceSettings.footerNote);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const savePayment = () => {
    actions.updateRentalSettings({
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankHolder: bankHolder.trim(),
      bankQrUrl: bankQrUrl.trim(),
      bankNoteTemplate: bankNote.trim() || "Phong {room} T{month}/{year}",
    });
    toast.success("Đã lưu thông tin thanh toán");
  };

  const saveInvoice = () => {
    actions.updateInvoiceSettings({
      propertyName: propertyName.trim(),
      address: address.trim(),
      contactPhone: phone.trim(),
      footerNote: footer.trim() || "Cảm ơn quý khách đã thanh toán đúng hạn.",
      logoUrl: invoiceSettings.logoUrl,
    });
    toast.success("Đã lưu thông tin hóa đơn");
  };

  const previewNote = bankNote
    .replace("{room}", "201")
    .replace("{month}", "05")
    .replace("{year}", "2026");

  return {
    values: {
      bankName,
      bankAccount,
      bankHolder,
      bankQrUrl,
      bankNote,
      copied,
      propertyName,
      address,
      phone,
      footer,
    },
    setters: {
      setBankName,
      setBankAccount,
      setBankHolder,
      setBankQrUrl,
      setBankNote,
      setCopied,
      setPropertyName,
      setAddress,
      setPhone,
      setFooter,
    },
    previewNote,
    copy,
    savePayment,
    saveInvoice,
    resetFromStore,
  };
}
