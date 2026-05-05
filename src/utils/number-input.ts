export function sanitizeDigitsInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatMoneyInput(value: string): string {
  const digits = sanitizeDigitsInput(value);
  if (!digits) return "";
  return Number.parseInt(digits, 10).toLocaleString("vi-VN");
}

export function parseMoneyInput(value: string): number | null {
  const digits = sanitizeDigitsInput(value);
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
