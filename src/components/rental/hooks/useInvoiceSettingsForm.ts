import { useState } from "react";
import { toast } from "sonner";
import { useFinance } from "@/lib/finance-store";
import { buildPaymentNotePreview, invoiceSettingsService } from "@/services/rental/invoice-settings.service";

export function useInvoiceSettingsForm() {
  const state = useFinance();
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
    const result = invoiceSettingsService.savePaymentSettings({
      bankName,
      bankAccount,
      bankHolder,
      bankQrUrl,
      bankNote,
    });
    toast.success(result.successMessage);
  };

  const saveInvoice = () => {
    const result = invoiceSettingsService.saveInvoiceSettings({
      propertyName,
      address,
      phone,
      footer,
      logoUrl: invoiceSettings.logoUrl,
    });
    toast.success(result.successMessage);
  };

  const previewNote = buildPaymentNotePreview(bankNote);

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
