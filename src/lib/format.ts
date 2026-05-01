import { formatMoney as formatMoneyValue, formatNumber } from "@/utils/format";

export function formatMoney(value: number): string {
  return formatMoneyValue(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000)
    return formatNumber(value / 1_000_000_000).replace(/,00$/, "") + " tỷ đ";
  if (Math.abs(value) >= 1_000_000)
    return (value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }).replace(/,0$/, "") + " tr đ";
  if (Math.abs(value) >= 1_000)
    return Math.round(value / 1_000).toLocaleString("vi-VN") + "k đ";
  return Math.round(value).toLocaleString("vi-VN") + " đ";
}

export function greet(name: string): string {
  const h = new Date().getHours();
  if (h < 11) return `Chào buổi sáng, ${name}`;
  if (h < 14) return `Chào buổi trưa, ${name}`;
  if (h < 18) return `Chào buổi chiều, ${name}`;
  return `Chào buổi tối, ${name}`;
}
