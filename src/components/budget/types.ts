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
  { label: string; color: string; soft: string; description: string }
> = {
  income: {
    label: "Income Sources",
    color: "var(--income)",
    soft: "var(--income-soft)",
    description: "Where your money comes from",
  },
  needs: {
    label: "Needs",
    color: "var(--needs)",
    soft: "var(--needs-soft)",
    description: "Essentials: rent, utilities, groceries",
  },
  wants: {
    label: "Wants",
    color: "var(--wants)",
    soft: "var(--wants-soft)",
    description: "Lifestyle: dining, entertainment, hobbies",
  },
  savings: {
    label: "Savings",
    color: "var(--savings)",
    soft: "var(--savings-soft)",
    description: "Emergency fund, investments, debt payoff",
  },
};
