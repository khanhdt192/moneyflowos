import { useState } from "react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";

export function useRentalSettingsForm() {
  const state = useFinance();
  const actions = useFinanceActions();
  const settings = state.rental.settings;

  const [elecRate, setElecRate] = useState(String(settings.defaultElectricityRate));
  const [waterRate, setWaterRate] = useState(String(settings.waterRatePerM3));
  const [wifi, setWifi] = useState(String(settings.wifiPerRoom));
  const [cleaning, setCleaning] = useState(String(settings.cleaningPerRoom));
  const [other, setOther] = useState(String(settings.otherPerRoom));
  const [otherName, setOtherName] = useState(settings.otherName || "Phụ phí");

  const [t1Elec, setT1Elec] = useState(String(settings.t1ElectricityBill));
  const [t1HasWifi, setT1HasWifi] = useState(settings.t1HasWifi);
  const [t1Wifi, setT1Wifi] = useState(String(settings.t1WifiPerRoom));
  const [t1Cleaning, setT1Cleaning] = useState(String(settings.t1Cleaning));
  const [t1OtherName, setT1OtherName] = useState(settings.t1OtherName || "Phụ phí");
  const [t1Other, setT1Other] = useState(String(settings.t1OtherPerRoom));

  const resetFromStore = () => {
    setElecRate(String(settings.defaultElectricityRate));
    setWaterRate(String(settings.waterRatePerM3));
    setWifi(String(settings.wifiPerRoom));
    setCleaning(String(settings.cleaningPerRoom));
    setOther(String(settings.otherPerRoom));
    setOtherName(settings.otherName || "Phụ phí");
    setT1Elec(String(settings.t1ElectricityBill));
    setT1HasWifi(settings.t1HasWifi);
    setT1Wifi(String(settings.t1WifiPerRoom));
    setT1Cleaning(String(settings.t1Cleaning));
    setT1OtherName(settings.t1OtherName || "Phụ phí");
    setT1Other(String(settings.t1OtherPerRoom));
  };

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

  const sharedFixedTotal = (Number(wifi) || 0) + (Number(cleaning) || 0) + (Number(other) || 0);
  const t1FixedTotal =
    (Number(t1Elec) || 0) +
    (t1HasWifi ? Number(t1Wifi) || 0 : 0) +
    (Number(t1Cleaning) || 0) +
    (Number(t1Other) || 0);

  return {
    settings,
    values: {
      elecRate,
      waterRate,
      wifi,
      cleaning,
      other,
      otherName,
      t1Elec,
      t1HasWifi,
      t1Wifi,
      t1Cleaning,
      t1OtherName,
      t1Other,
    },
    setters: {
      setElecRate,
      setWaterRate,
      setWifi,
      setCleaning,
      setOther,
      setOtherName,
      setT1Elec,
      setT1HasWifi,
      setT1Wifi,
      setT1Cleaning,
      setT1OtherName,
      setT1Other,
    },
    summary: {
      sharedFixedTotal,
      t1FixedTotal,
    },
    saveShared,
    saveT1,
    resetFromStore,
  };
}
