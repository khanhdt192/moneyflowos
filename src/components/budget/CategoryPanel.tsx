import { useState } from "react";
import { Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BudgetItem, CategoryKey } from "./types";
import { CATEGORY_META } from "./types";
import { formatCompact } from "@/lib/format";

interface Props {
  category: CategoryKey;
  items: BudgetItem[];
  onAdd: (name: string, amount: number) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BudgetItem>) => void;
}

export function CategoryPanel({ category, items, onAdd, onRemove, onUpdate }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const meta = CATEGORY_META[category];
  const total = items.reduce((s, i) => s + i.amount, 0);

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt <= 0) return;
    onAdd(name.trim(), amt);
    setName("");
    setAmount("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{meta.label}</h3>
        </div>
        <span className="num text-[11px] font-semibold text-muted-foreground">{formatCompact(total)}</span>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -2, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="group flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-2.5 py-1.5 transition-colors hover:bg-card"
              style={{ borderLeft: `3px solid ${meta.color}` }}
            >
              <input
                value={item.name}
                onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none"
              />
              <input
                type="number"
                value={item.amount}
                onChange={(e) => onUpdate(item.id, { amount: parseFloat(e.target.value) || 0 })}
                className="num w-20 bg-transparent text-right text-[13px] font-semibold outline-none"
              />
              <span className="text-[11px] text-muted-foreground">₫</span>
              <button
                onClick={() => onRemove(item.id)}
                aria-label="Remove"
                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Tên khoản"
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-2.5 py-2 text-[12px] outline-none transition-all focus:ring-2 focus:ring-ring/40"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          type="number"
          placeholder="0"
          className="num w-20 rounded-xl border border-border bg-card px-2 py-2 text-right text-[12px] outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          onClick={handleAdd}
          aria-label="Add"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-background transition-transform hover:scale-105 active:scale-95"
          style={{ background: meta.color }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
