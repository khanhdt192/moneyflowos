export const formatMoney = (value: number) => {
  if (value === null || value === undefined) return "0đ";
  return value.toLocaleString("vi-VN") + "đ";
};

export const formatNumber = (value: number) => {
  if (value === null || value === undefined) return "0";
  return value.toLocaleString("vi-VN");
};

export const parseNumber = (value: string) => {
  return Number(value.replace(/,/g, ""));
};
