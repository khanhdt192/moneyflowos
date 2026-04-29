// Re-exports from the canonical finance types so existing imports keep working.
export type {
  CategoryKey,
  BudgetItem,
  MonthData as BudgetState,
} from "@/lib/finance-types";
export { CATEGORY_META } from "@/lib/finance-types";
