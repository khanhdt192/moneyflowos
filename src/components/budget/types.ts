export type CategoryKey = "income" | "needs" | "wants" | "savings";

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}

export interface BudgetState {
  income: BudgetItem[];
  needs: BudgetItem[];
  wants: BudgetItem[];
  savings: BudgetItem[];
}

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; short: string; color: string; soft: string; description: string }
> = {
  income: {
    label: "Nguồn Thu Nhập",
    short: "Thu Nhập",
    color: "var(--income)",
    soft: "var(--income-soft)",
    description: "Tiền vào từ lương, đầu tư, kinh doanh",
  },
  needs: {
    label: "Chi Tiêu Thiết Yếu",
    short: "Thiết Yếu",
    color: "var(--needs)",
    soft: "var(--needs-soft)",
    description: "Nhà ở, điện nước, ăn uống, đi lại",
  },
  wants: {
    label: "Chi Tiêu Cá Nhân",
    short: "Cá Nhân",
    color: "var(--wants)",
    soft: "var(--wants-soft)",
    description: "Giải trí, mua sắm, du lịch",
  },
  savings: {
    label: "Tiết Kiệm & Đầu Tư",
    short: "Tiết Kiệm",
    color: "var(--savings)",
    soft: "var(--savings-soft)",
    description: "Quỹ khẩn cấp, đầu tư, mục tiêu dài hạn",
  },
};
