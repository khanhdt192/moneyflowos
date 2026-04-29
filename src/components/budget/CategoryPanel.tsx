import { useState } from "react";
import { Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BudgetItem, CategoryKey } from "./types";
import { CATEGORY_META } from "./types";

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
        <h3 className="text-base font-bold text-foreground">{meta.label}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card pl-3 pr-2 py-1.5 shadow-card"
              style={{ borderLeft: `3px solid ${meta.color}` }}
            >
              <input
                value={item.name}
                onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium outline-none"
              />
              <div className="flex items-center text-sm font-semibold">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) =>
                    onUpdate(item.id, { amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-20 bg-transparent text-right outline-none"
                />
              </div>
              <button
                onClick={() => onRemove(item.id)}
                aria-label="Remove"
                className="grid h-7 w-7 place-items-center rounded-md bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={category === "income" ? "Income source" : "Item name"}
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          type="number"
          placeholder="$$$"
          className="w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleAdd}
          aria-label="Add"
          className="grid h-9 w-9 place-items-center rounded-xl bg-savings/15 text-savings transition-transform hover:scale-105"
          style={{ backgroundColor: "color-mix(in oklab, var(--savings) 15%, transparent)", color: "var(--savings)" }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
