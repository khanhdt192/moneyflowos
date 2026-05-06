import { financeStore } from "@/lib/finance-store";
import type { RentalSettings } from "@/lib/finance-types";

export type SharedRentalSettingsFormValues = {
  elecRate: string;
  waterRate: string;
  wifi: string;
  cleaning: string;
  other: string;
  otherName: string;
};

export type FirstFloorRentalSettingsFormValues = {
  t1Elec: string;
  t1HasWifi: boolean;
  t1Wifi: string;
  t1Cleaning: string;
  t1OtherName: string;
  t1Other: string;
};

export type RentalSettingsSaveResult = {
  successMessage: string;
};

function toNumberOrZero(value: string): number {
  return Number(value) || 0;
}

function buildSharedRoomSettingsPayload(values: SharedRentalSettingsFormValues): Partial<RentalSettings> {
  return {
    defaultElectricityRate: toNumberOrZero(values.elecRate),
    waterRatePerM3: toNumberOrZero(values.waterRate),
    wifiPerRoom: toNumberOrZero(values.wifi),
    cleaningPerRoom: toNumberOrZero(values.cleaning),
    otherPerRoom: toNumberOrZero(values.other),
    otherName: values.otherName.trim() || "Phụ phí",
  };
}

function buildFirstFloorSettingsPayload(values: FirstFloorRentalSettingsFormValues): Partial<RentalSettings> {
  return {
    t1ElectricityBill: toNumberOrZero(values.t1Elec),
    t1HasWifi: values.t1HasWifi,
    t1WifiPerRoom: toNumberOrZero(values.t1Wifi),
    t1Cleaning: toNumberOrZero(values.t1Cleaning),
    t1OtherName: values.t1OtherName.trim() || "Phụ phí",
    t1OtherPerRoom: toNumberOrZero(values.t1Other),
  };
}

export const rentalSettingsService = {
  saveSharedRoomSettings(values: SharedRentalSettingsFormValues): RentalSettingsSaveResult {
    financeStore.updateRentalSettings(buildSharedRoomSettingsPayload(values));

    return {
      successMessage: "Đã lưu cấu hình phòng 201 – 305",
    };
  },

  saveFirstFloorSettings(values: FirstFloorRentalSettingsFormValues): RentalSettingsSaveResult {
    financeStore.updateRentalSettings(buildFirstFloorSettingsPayload(values));

    return {
      successMessage: "Đã lưu cấu hình Tầng 1",
    };
  },
};
