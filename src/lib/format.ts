export function formatVND(value: number): string {
  const rounded = Math.round(value);
  return rounded.toLocaleString("vi-VN") + " ₫";
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000)
    return (value / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + " tỷ ₫";
  if (Math.abs(value) >= 1_000_000)
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + " tr ₫";
  if (Math.abs(value) >= 1_000)
    return (value / 1_000).toFixed(0) + "k ₫";
  return Math.round(value).toString() + " ₫";
}

export function greet(name: string): string {
  const h = new Date().getHours();
  if (h < 11) return `Chào buổi sáng, ${name}`;
  if (h < 14) return `Chào buổi trưa, ${name}`;
  if (h < 18) return `Chào buổi chiều, ${name}`;
  return `Chào buổi tối, ${name}`;
}
