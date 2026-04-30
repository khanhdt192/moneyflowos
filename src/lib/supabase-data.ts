import { supabase } from "@/integrations/supabase/client";
import type {
  BudgetItem,
  CategoryKey,
  FinanceState,
  Goal,
  InvoiceSettings,
  MonthData,
  RentalBillingCycle,
  RentalBillStatus,
  RentalElectricityReading,
  RentalPayment,
  RentalRoom,
  RentalRoomBill,
  RentalSettings,
  Transaction,
} from "./finance-types";
import { emptyMonth, monthKey } from "./finance-types";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/* ─── helpers ─────────────────────────────────────────────── */

function num(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const DEFAULT_SETTINGS: RentalSettings = {
  defaultElectricityRate: 3500,
  waterRatePerM3: 24000,
  wifiPerRoom: 0,
  cleaningPerRoom: 0,
  otherPerRoom: 0,
  otherName: "Phụ phí",
  allocationRule: "equal_occupied",
  t1ElectricityBill: 0,
  t1HasWifi: false,
  t1WifiPerRoom: 0,
  t1Cleaning: 0,
  t1OtherName: "Phụ phí",
  t1OtherPerRoom: 0,
  bankName: "",
  bankAccount: "",
  bankHolder: "",
  bankQrUrl: "",
  bankNoteTemplate: "Phong {room} T{month}/{year}",
};

const DEFAULT_INVOICE: InvoiceSettings = {
  propertyName: "",
  address: "",
  contactPhone: "",
  logoUrl: "",
  footerNote: "Cảm ơn quý khách đã thanh toán đúng hạn.",
};

/* ─── bulk fetch ──────────────────────────────────────────── */

export async function fetchAllForUser(userId: string): Promise<FinanceState> {
  const [
    profileRes,
    txRes,
    budgetRes,
    goalsRes,
    roomsRes,
    settingsRes,
    cyclesRes,
    billsRes,
    readingsRes,
    paymentsRes,
    invoiceRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }),
    supabase.from("budget_items").select("*").eq("user_id", userId).order("sort", { ascending: true }),
    supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("rental_rooms").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("rental_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("rental_billing_cycles").select("*").eq("user_id", userId).order("year", { ascending: false }).order("month", { ascending: false }),
    supabase.from("rental_room_bills").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("rental_electricity_readings").select("*").eq("user_id", userId),
    supabase.from("rental_payments").select("*").eq("user_id", userId).order("paid_at", { ascending: false }),
    supabase.from("invoice_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const currentMonth = monthKey();
  const activeMonth = profile?.active_month ?? currentMonth;

  // Build months map
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
    floor: r.floor ?? undefined,
    rent: num(r.rent),
    occupied: r.occupied,
    tenant: r.tenant ?? undefined,
  }));

  // Settings - merge DB row over defaults
  const sr = settingsRes.data;
  const settings: RentalSettings = sr
    ? {
        defaultElectricityRate: num(sr.default_electricity_rate),
        waterRatePerM3: num(sr.water_rate_per_m3 ?? sr.water_total ?? 24000),
        wifiPerRoom: num(sr.wifi_per_room ?? sr.wifi_total ?? 0),
        cleaningPerRoom: num(sr.cleaning_per_room ?? sr.cleaning_total ?? 0),
        otherPerRoom: num(sr.other_per_room ?? sr.other_total ?? 0),
        otherName: sr.other_name ?? "Phụ phí",
        allocationRule: sr.allocation_rule,
        t1ElectricityBill: num(sr.t1_electricity_bill ?? 0),
        t1HasWifi: sr.t1_has_wifi ?? false,
        t1WifiPerRoom: num(sr.t1_wifi_per_room ?? 0),
        t1Cleaning: num(sr.t1_cleaning ?? 0),
        t1OtherName: sr.t1_other_name ?? "Phụ phí",
        t1OtherPerRoom: num(sr.t1_other_per_room ?? 0),
        bankName: sr.bank_name ?? "",
        bankAccount: sr.bank_account ?? "",
        bankHolder: sr.bank_holder ?? "",
        bankQrUrl: sr.bank_qr_url ?? "",
        bankNoteTemplate: sr.bank_note_template ?? "Phong {room} T{month}/{year}",
      }
    : DEFAULT_SETTINGS;

  const billingCycles: RentalBillingCycle[] = (cyclesRes.data ?? []).map((c) => ({
    id: c.id,
    month: c.month,
    year: c.year,
    status: c.status,
    closedAt: c.closed_at ?? undefined,
  }));

  const roomBills: RentalRoomBill[] = (billsRes.data ?? []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    cycleId: b.cycle_id,
    rentAmount: num(b.rent_amount),
    electricityAmount: num(b.electricity_amount),
    waterAmount: num(b.water_amount),
    wifiAmount: num(b.wifi_amount),
    cleaningAmount: num(b.cleaning_amount),
    otherAmount: num(b.other_amount),
    totalAmount: num(b.total_amount),
    paidAmount: num(b.paid_amount),
    status: (b.status as RentalBillStatus) ?? "draft",
    confirmedAt: b.confirmed_at ?? undefined,
    paidAt: b.paid_at ?? undefined,
    note: b.note ?? undefined,
  }));

  const electricityReadings: RentalElectricityReading[] = (readingsRes.data ?? []).map((r) => ({
    id: r.id,
    roomId: r.room_id,
    cycleId: r.cycle_id,
    startIndex: num(r.start_index),
    endIndex: num(r.end_index),
    consumptionKwh: num(r.consumption_kwh),
    waterM3: num(r.water_m3 ?? 0),
  }));

  const payments: RentalPayment[] = (paymentsRes.data ?? []).map((p) => ({
    id: p.id,
    billId: p.bill_id,
    roomId: p.room_id,
    amount: num(p.amount),
    paymentMethod: p.payment_method ?? "cash",
    note: p.note ?? undefined,
    paidAt: p.paid_at,
  }));

  const ir = invoiceRes.data;
  const invoiceSettings: InvoiceSettings = ir
    ? {
        propertyName: ir.property_name ?? "",
        address: ir.address ?? "",
        contactPhone: ir.contact_phone ?? "",
        logoUrl: ir.logo_url ?? "",
        footerNote: ir.footer_note ?? "Cảm ơn quý khách đã thanh toán đúng hạn.",
      }
    : DEFAULT_INVOICE;

  return {
    activeMonth,
    months,
    goals,
    rental: {
      rooms,
      settings,
      invoiceSettings,
      billingCycles,
      roomBills,
      electricityReadings,
      payments,
      autoSyncToIncome: true,
    },
    settings: { name: profile?.full_name ?? "Bạn", currency: profile?.currency ?? "VND" },
  };
}

/* ─── mutations ───────────────────────────────────────────── */

export const cloud = {
  /* profile */
  async updateProfile(userId: string, patch: { full_name?: string; currency?: string; active_month?: string }) {
    return supabase.from("profiles").upsert({ id: userId, ...patch }).select().single();
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
    const { data, error } = await supabase.from("transactions").insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },

  /* budget items */
  async insertBudgetItem(userId: string, month: string, category: CategoryKey, name: string, amount: number, sort?: number) {
    const row: TablesInsert<"budget_items"> = { user_id: userId, month, category, name, amount };
    if (sort !== undefined) row.sort = sort;
    const { data, error } = await supabase.from("budget_items").insert(row).select().single();
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
    const { data, error } = await supabase.from("goals").insert({
      user_id: userId,
      name: g.name,
      emoji: g.emoji,
      target: g.target,
      saved: g.saved,
      monthly_contribution: g.monthlyContribution,
      color: g.color,
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateGoal(id: string, patch: Partial<Goal>) {
    const dbPatch: TablesUpdate<"goals"> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji;
    if (patch.target !== undefined) dbPatch.target = patch.target;
    if (patch.saved !== undefined) dbPatch.saved = patch.saved;
    if (patch.monthlyContribution !== undefined) dbPatch.monthly_contribution = patch.monthlyContribution;
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
    const { data, error } = await supabase.from("rental_rooms").insert({ user_id: userId, name, rent }).select().single();
    if (error) throw error;
    return data;
  },

  async updateRoom(id: string, patch: Partial<RentalRoom>) {
    const dbPatch: TablesUpdate<"rental_rooms"> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.rent !== undefined) dbPatch.rent = patch.rent;
    if (patch.occupied !== undefined) dbPatch.occupied = patch.occupied;
    if (patch.tenant !== undefined) dbPatch.tenant = patch.tenant ?? null;
    if (patch.floor !== undefined) dbPatch.floor = patch.floor ?? null;
    const { error } = await supabase.from("rental_rooms").update(dbPatch).eq("id", id);
    if (error) throw error;
  },

  async deleteRoom(id: string) {
    const { error } = await supabase.from("rental_rooms").delete().eq("id", id);
    if (error) throw error;
  },

  /* rental settings */
  async upsertRentalSettings(userId: string, s: RentalSettings) {
    const { error } = await supabase.from("rental_settings").upsert({
      user_id: userId,
      default_electricity_rate: s.defaultElectricityRate,
      water_rate_per_m3: s.waterRatePerM3,
      wifi_per_room: s.wifiPerRoom,
      cleaning_per_room: s.cleaningPerRoom,
      other_per_room: s.otherPerRoom,
      other_name: s.otherName,
      allocation_rule: s.allocationRule,
      t1_electricity_bill: s.t1ElectricityBill,
      t1_has_wifi: s.t1HasWifi,
      t1_wifi_per_room: s.t1WifiPerRoom,
      t1_cleaning: s.t1Cleaning,
      t1_other_name: s.t1OtherName,
      t1_other_per_room: s.t1OtherPerRoom,
      bank_name: s.bankName,
      bank_account: s.bankAccount,
      bank_holder: s.bankHolder,
      bank_qr_url: s.bankQrUrl,
      bank_note_template: s.bankNoteTemplate,
    });
    if (error) throw error;
  },

  /* invoice settings */
  async upsertInvoiceSettings(userId: string, s: InvoiceSettings) {
    const { error } = await supabase.from("invoice_settings").upsert({
      user_id: userId,
      property_name: s.propertyName,
      address: s.address,
      contact_phone: s.contactPhone,
      logo_url: s.logoUrl,
      footer_note: s.footerNote,
    });
    if (error) throw error;
  },

  /* billing cycles */
  async upsertCycle(userId: string, month: number, year: number): Promise<string> {
    const { data, error } = await supabase
      .from("rental_billing_cycles")
      .upsert({ user_id: userId, month, year, status: "draft" }, { onConflict: "user_id,month,year" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  async finalizeCycle(cycleId: string) {
    const { error } = await supabase
      .from("rental_billing_cycles")
      .update({ status: "finalized", closed_at: new Date().toISOString() })
      .eq("id", cycleId);
    if (error) throw error;
  },

  /* electricity readings */
  async upsertReading(userId: string, roomId: string, cycleId: string, startIndex: number, endIndex: number, waterM3: number) {
    const { data, error } = await supabase
      .from("rental_electricity_readings")
      .upsert(
        { user_id: userId, room_id: roomId, cycle_id: cycleId, start_index: startIndex, end_index: endIndex, water_m3: waterM3 },
        { onConflict: "room_id,cycle_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /* room bills */
  async upsertBill(
    userId: string,
    roomId: string,
    cycleId: string,
    amounts: {
      rentAmount: number;
      electricityAmount: number;
      waterAmount: number;
      wifiAmount: number;
      cleaningAmount: number;
      otherAmount: number;
      totalAmount: number;
    },
  ) {
    const { data, error } = await supabase
      .from("rental_room_bills")
      .upsert(
        {
          user_id: userId,
          room_id: roomId,
          cycle_id: cycleId,
          rent_amount: amounts.rentAmount,
          electricity_amount: amounts.electricityAmount,
          water_amount: amounts.waterAmount,
          wifi_amount: amounts.wifiAmount,
          cleaning_amount: amounts.cleaningAmount,
          other_amount: amounts.otherAmount,
          total_amount: amounts.totalAmount,
          paid_amount: 0,
          status: "draft",
        },
        { onConflict: "room_id,cycle_id", ignoreDuplicates: false },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async confirmBill(billId: string) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("rental_room_bills")
      .update({ status: "confirmed", confirmed_at: now })
      .eq("id", billId)
      .eq("status", "draft"); // only confirm drafts, safety guard
    if (error) throw error;
  },

  async updateBillAmounts(
    billId: string,
    amounts: {
      rentAmount: number;
      electricityAmount: number;
      waterAmount: number;
      wifiAmount: number;
      cleaningAmount: number;
      otherAmount: number;
      totalAmount: number;
    },
  ) {
    const { error } = await supabase
      .from("rental_room_bills")
      .update({
        rent_amount: amounts.rentAmount,
        electricity_amount: amounts.electricityAmount,
        water_amount: amounts.waterAmount,
        wifi_amount: amounts.wifiAmount,
        cleaning_amount: amounts.cleaningAmount,
        other_amount: amounts.otherAmount,
        total_amount: amounts.totalAmount,
      })
      .eq("id", billId)
      .eq("status", "draft"); // only recalc drafts
    if (error) throw error;
  },

  /* payments */
  async insertPayment(
    userId: string,
    billId: string,
    roomId: string,
    amount: number,
    method = "cash",
    note?: string,
  ): Promise<RentalPayment> {
    const { data, error } = await supabase
      .from("rental_payments")
      .insert({ user_id: userId, bill_id: billId, room_id: roomId, amount, payment_method: method, note: note ?? null })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      billId: data.bill_id,
      roomId: data.room_id,
      amount: num(data.amount),
      paymentMethod: data.payment_method,
      note: data.note ?? undefined,
      paidAt: data.paid_at,
    };
  },

  async updateBillPayment(billId: string, paidAmount: number, totalAmount: number) {
    const now = new Date().toISOString();
    const remaining = totalAmount - paidAmount;
    let status: RentalBillStatus = "confirmed";
    if (remaining <= 0) status = "paid";
    else if (paidAmount > 0) status = "partial_paid";

    const { error } = await supabase
      .from("rental_room_bills")
      .update({
        paid_amount: paidAmount,
        status,
        paid_at: remaining <= 0 ? now : null,
      })
      .eq("id", billId);
    if (error) throw error;
    return status;
  },

  /* full reset */
  async wipe(userId: string) {
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", userId),
      supabase.from("budget_items").delete().eq("user_id", userId),
      supabase.from("goals").delete().eq("user_id", userId),
      supabase.from("rental_rooms").delete().eq("user_id", userId),
      supabase.from("rental_payments").delete().eq("user_id", userId),
      supabase.from("rental_room_bills").delete().eq("user_id", userId),
      supabase.from("rental_electricity_readings").delete().eq("user_id", userId),
      supabase.from("rental_billing_cycles").delete().eq("user_id", userId),
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
        { user_id: userId, month: m, category: "needs", name: "Tiền nhà", amount: 12_000_000, sort: 0 },
        { user_id: userId, month: m, category: "needs", name: "Ăn uống", amount: 6_000_000, sort: 1 },
        { user_id: userId, month: m, category: "needs", name: "Đi lại", amount: 2_500_000, sort: 2 },
        { user_id: userId, month: m, category: "needs", name: "Điện nước, internet", amount: 1_500_000, sort: 3 },
        { user_id: userId, month: m, category: "wants", name: "Cà phê & nhà hàng", amount: 3_000_000, sort: 0 },
        { user_id: userId, month: m, category: "wants", name: "Giải trí, mua sắm", amount: 4_000_000, sort: 1 },
        { user_id: userId, month: m, category: "wants", name: "Du lịch", amount: 2_500_000, sort: 2 },
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
        { user_id: userId, name: "Phòng 101", rent: 4_500_000, occupied: true, tenant: "Anh Minh", floor: 1 },
        { user_id: userId, name: "Phòng 201", rent: 4_000_000, occupied: true, tenant: "Chị Lan", floor: 2 },
        { user_id: userId, name: "Phòng 202", rent: 3_800_000, occupied: false, tenant: null, floor: 2 },
      ]),
    ]);
  },
};
