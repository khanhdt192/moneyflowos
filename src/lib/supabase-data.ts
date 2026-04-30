import { supabase } from "@/integrations/supabase/client";
import type {
  BudgetItem,
  CategoryKey,
  FinanceState,
  Goal,
  MonthData,
  RentalRoom,
  Transaction,
} from "./finance-types";
import { emptyMonth, monthKey } from "./finance-types";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/* ------------------------- helpers ------------------------- */

function num(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/* ------------------------- bulk fetch ------------------------- */

export async function fetchAllForUser(userId: string): Promise<FinanceState> {
  const [profileRes, txRes, budgetRes, goalsRes, roomsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("budget_items")
      .select("*")
      .eq("user_id", userId)
      .order("sort", { ascending: true }),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rental_rooms")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const profile = profileRes.data;
  const currentMonth = monthKey();
  const activeMonth = profile?.active_month ?? currentMonth;

  // Build months map from budget_items + transactions, grouped by month key.
  const months: Record<string, MonthData> = {};
  const ensure = (k: string) => (months[k] ??= emptyMonth());

  for (const row of budgetRes.data ?? []) {
    const m = ensure(row.month);
    const item: BudgetItem = { id: row.id, name: row.name, amount: num(row.amount) };
    m[row.category as CategoryKey].push(item);
  }
  for (const row of txRes.data ?? []) {
    const k = monthKey(row.transaction_date);
    const m = ensure(k);
    const tx: Transaction = {
      id: row.id,
      type: row.type === "saving" ? "savings" : row.type,
      category: row.category,
      amount: num(row.amount),
      note: row.note ?? undefined,
      date: row.transaction_date,
    };
    m.transactions.push(tx);
  }
  ensure(activeMonth);

  const goals: Goal[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji ?? "🎯",
    target: num(g.target),
    saved: num(g.saved),
    monthlyContribution: num(g.monthly_contribution),
    color: g.color ?? "var(--income)",
  }));

  const rooms: RentalRoom[] = (roomsRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    rent: num(r.rent),
    occupied: r.occupied,
    tenant: r.tenant ?? undefined,
  }));

  return {
    activeMonth,
    months,
    goals,
    rental: {
      rooms,
      settings: {
        defaultElectricityRate: 3500,
        waterTotal: 0,
        wifiTotal: 0,
        cleaningTotal: 0,
        otherTotal: 0,
        allocationRule: "equal_occupied",
      },
      autoSyncToIncome: true,
    },
    settings: { name: profile?.full_name ?? "Bạn", currency: profile?.currency ?? "VND" },
  };
}

/* ------------------------- mutations ------------------------- */

export const cloud = {
  /* profile */
  async updateProfile(
    userId: string,
    patch: { full_name?: string; currency?: string; active_month?: string },
  ) {
    return supabase
      .from("profiles")
      .upsert({ id: userId, ...patch })
      .select()
      .single();
  },

  /* transactions */
  async insertTransaction(userId: string, tx: Omit<Transaction, "id">) {
    const row: TablesInsert<"transactions"> = {
      user_id: userId,
      type: tx.type === "savings" ? "saving" : tx.type,
      category: tx.category,
      amount: tx.amount,
      note: tx.note ?? null,
      transaction_date: tx.date,
    };
    const { data, error } = await supabase
      .from("transactions")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },

  /* budget items */
  async insertBudgetItem(
    userId: string,
    month: string,
    category: CategoryKey,
    name: string,
    amount: number,
    sort?: number,
  ) {
    const row: TablesInsert<"budget_items"> = {
      user_id: userId,
      month,
      category,
      name,
      amount,
    };
    if (sort !== undefined) row.sort = sort;
    const { data, error } = await supabase
      .from("budget_items")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBudgetItem(id: string, patch: { name?: string; amount?: number }) {
    const { error } = await supabase.from("budget_items").update(patch).eq("id", id);
    if (error) throw error;
  },

  async deleteBudgetItem(id: string) {
    const { error } = await supabase.from("budget_items").delete().eq("id", id);
    if (error) throw error;
  },

  /* goals */
  async insertGoal(userId: string, g: Omit<Goal, "id">) {
    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        name: g.name,
        emoji: g.emoji,
        target: g.target,
        saved: g.saved,
        monthly_contribution: g.monthlyContribution,
        color: g.color,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateGoal(id: string, patch: Partial<Goal>) {
    const dbPatch: TablesUpdate<"goals"> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji;
    if (patch.target !== undefined) dbPatch.target = patch.target;
    if (patch.saved !== undefined) dbPatch.saved = patch.saved;
    if (patch.monthlyContribution !== undefined)
      dbPatch.monthly_contribution = patch.monthlyContribution;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    const { error } = await supabase.from("goals").update(dbPatch).eq("id", id);
    if (error) throw error;
  },

  async deleteGoal(id: string) {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;
  },

  /* rooms */
  async insertRoom(userId: string, name: string, rent: number) {
    const { data, error } = await supabase
      .from("rental_rooms")
      .insert({ user_id: userId, name, rent })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRoom(id: string, patch: Partial<RentalRoom>) {
    const dbPatch: TablesUpdate<"rental_rooms"> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.rent !== undefined) dbPatch.rent = patch.rent;
    if (patch.occupied !== undefined) dbPatch.occupied = patch.occupied;
    if (patch.tenant !== undefined) dbPatch.tenant = patch.tenant ?? null;
    const { error } = await supabase.from("rental_rooms").update(dbPatch).eq("id", id);
    if (error) throw error;
  },

  async deleteRoom(id: string) {
    const { error } = await supabase.from("rental_rooms").delete().eq("id", id);
    if (error) throw error;
  },

  /* full reset */
  async wipe(userId: string) {
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", userId),
      supabase.from("budget_items").delete().eq("user_id", userId),
      supabase.from("goals").delete().eq("user_id", userId),
      supabase.from("rental_rooms").delete().eq("user_id", userId),
    ]);
  },

  /* seed demo */
  async seedDemo(userId: string) {
    const m = monthKey();
    await Promise.all([
      supabase.from("budget_items").insert([
        { user_id: userId, month: m, category: "income", name: "Lương chính", amount: 45_000_000, sort: 0 },
        { user_id: userId, month: m, category: "income", name: "Freelance", amount: 12_000_000, sort: 1 },
        { user_id: userId, month: m, category: "income", name: "Cho thuê căn hộ", amount: 8_000_000, sort: 2 },
        { user_id: userId, month: m, category: "needs",  name: "Tiền nhà", amount: 12_000_000, sort: 0 },
        { user_id: userId, month: m, category: "needs",  name: "Ăn uống", amount: 6_000_000, sort: 1 },
        { user_id: userId, month: m, category: "needs",  name: "Đi lại", amount: 2_500_000, sort: 2 },
        { user_id: userId, month: m, category: "needs",  name: "Điện nước, internet", amount: 1_500_000, sort: 3 },
        { user_id: userId, month: m, category: "wants",  name: "Cà phê & nhà hàng", amount: 3_000_000, sort: 0 },
        { user_id: userId, month: m, category: "wants",  name: "Giải trí, mua sắm", amount: 4_000_000, sort: 1 },
        { user_id: userId, month: m, category: "wants",  name: "Du lịch", amount: 2_500_000, sort: 2 },
        { user_id: userId, month: m, category: "savings", name: "Quỹ khẩn cấp", amount: 6_000_000, sort: 0 },
        { user_id: userId, month: m, category: "savings", name: "Đầu tư cổ phiếu", amount: 10_000_000, sort: 1 },
        { user_id: userId, month: m, category: "savings", name: "Quỹ mua nhà", amount: 15_500_000, sort: 2 },
      ]),
      supabase.from("goals").insert([
        { user_id: userId, name: "Quỹ mua nhà", emoji: "🏠", target: 2_500_000_000, saved: 280_000_000, monthly_contribution: 15_500_000, color: "var(--income)" },
        { user_id: userId, name: "Quỹ khẩn cấp", emoji: "🛡️", target: 180_000_000, saved: 96_000_000, monthly_contribution: 6_000_000, color: "var(--savings)" },
        { user_id: userId, name: "Tự do tài chính", emoji: "🎯", target: 1_000_000_000, saved: 145_000_000, monthly_contribution: 10_000_000, color: "var(--wants)" },
      ]),
      supabase.from("rental_rooms").insert([
        { user_id: userId, name: "Phòng 101", rent: 4_500_000, occupied: true,  tenant: "Anh Minh" },
        { user_id: userId, name: "Phòng 102", rent: 3_500_000, occupied: true,  tenant: "Chị Lan" },
        { user_id: userId, name: "Phòng 201", rent: 4_000_000, occupied: false, tenant: null },
      ]),
    ]);
  },
};
