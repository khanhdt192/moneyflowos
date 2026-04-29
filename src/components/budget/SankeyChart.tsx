import { useMemo, useRef, useEffect, useState } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import type { BudgetState } from "./types";
import { CATEGORY_META } from "./types";

interface Props {
  data: BudgetState;
}

interface SNode {
  name: string;
  color: string;
  soft: string;
  category: "income" | "needs" | "wants" | "savings" | "total" | "unallocated";
}

interface SLink {
  source: number;
  target: number;
  value: number;
}

export function SankeyChart({ data }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const height = 540;

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const { nodes, links, totalIncome, totalAllocated } = useMemo(() => {
    const nodes: SNode[] = [];
    const links: SLink[] = [];
    const idx = (n: SNode) => {
      nodes.push(n);
      return nodes.length - 1;
    };

    const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);
    const groups = (["needs", "wants", "savings"] as const).map((k) => ({
      key: k,
      total: data[k].reduce((s, i) => s + i.amount, 0),
    }));
    const totalAllocated = groups.reduce((s, g) => s + g.total, 0);
    const unallocated = Math.max(0, totalIncome - totalAllocated);

    if (totalIncome === 0) {
      return { nodes: [], links: [], totalIncome: 0, totalAllocated: 0 };
    }

    const totalIdx = idx({
      name: "Total Budget",
      color: "var(--primary)",
      soft: "var(--muted)",
      category: "total",
    });

    // income -> total
    for (const inc of data.income) {
      if (inc.amount <= 0) continue;
      const i = idx({
        name: inc.name,
        color: "var(--income)",
        soft: "var(--income-soft)",
        category: "income",
      });
      links.push({ source: i, target: totalIdx, value: inc.amount });
    }

    // total -> group -> items
    for (const g of groups) {
      if (g.total <= 0) continue;
      const meta = CATEGORY_META[g.key];
      const gi = idx({
        name: meta.label.replace(" Sources", ""),
        color: meta.color,
        soft: meta.soft,
        category: g.key,
      });
      links.push({ source: totalIdx, target: gi, value: g.total });
      for (const it of data[g.key]) {
        if (it.amount <= 0) continue;
        const ii = idx({
          name: it.name,
          color: meta.color,
          soft: meta.soft,
          category: g.key,
        });
        links.push({ source: gi, target: ii, value: it.amount });
      }
    }

    if (unallocated > 0) {
      const ui = idx({
        name: "Unallocated",
        color: "var(--unallocated)",
        soft: "var(--unallocated-soft)",
        category: "unallocated",
      });
      links.push({ source: totalIdx, target: ui, value: unallocated });
    }

    return { nodes, links, totalIncome, totalAllocated };
  }, [data]);

  const layout = useMemo(() => {
    if (nodes.length === 0) return null;
    const generator = sankey<SNode, SLink>()
      .nodeWidth(14)
      .nodePadding(18)
      .nodeAlign(sankeyJustify)
      .extent([
        [8, 12],
        [width - 8, height - 12],
      ]);
    // clone since sankey mutates
    const graph = generator({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    });
    return graph;
  }, [nodes, links, width]);

  if (!layout || totalIncome === 0) {
    return (
      <div
        ref={wrapperRef}
        className="grid h-[540px] w-full place-items-center rounded-2xl border border-dashed border-border bg-card/50 text-center"
      >
        <div className="max-w-sm px-6">
          <p className="text-base font-semibold text-foreground">
            Start by adding an income source
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your money flow diagram will appear here as you add income and expenses.
          </p>
        </div>
      </div>
    );
  }

  const linkPath = sankeyLinkHorizontal();

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden rounded-2xl bg-card">
      <svg width={width} height={height} className="block">
        <g>
          {layout.links.map((l, i) => {
            const target = l.target as unknown as SNode & { x0: number };
            return (
              <path
                key={i}
                d={linkPath(l) || ""}
                fill="none"
                stroke={target.soft}
                strokeOpacity={0.85}
                strokeWidth={Math.max(1, l.width || 0)}
              >
                <title>
                  {(l.source as unknown as SNode).name} → {target.name}: ${l.value.toFixed(2)}
                </title>
              </path>
            );
          })}
        </g>
        <g>
          {layout.nodes.map((n, i) => {
            const node = n as unknown as SNode & {
              x0: number;
              x1: number;
              y0: number;
              y1: number;
              value: number;
            };
            const pct = ((node.value / totalIncome) * 100).toFixed(1);
            const isRight = node.x0 > width / 2;
            const labelX = isRight ? node.x0 - 8 : node.x1 + 8;
            const anchor = isRight ? "end" : "start";
            const labelY = (node.y0 + node.y1) / 2;
            return (
              <g key={i}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={Math.max(2, node.y1 - node.y0)}
                  fill={node.color}
                  rx={2}
                />
                <text
                  x={labelX}
                  y={labelY - 4}
                  textAnchor={anchor}
                  className="fill-foreground"
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  {node.name}
                </text>
                <text
                  x={labelX}
                  y={labelY + 10}
                  textAnchor={anchor}
                  className="fill-muted-foreground"
                  style={{ fontSize: 11 }}
                >
                  ${node.value.toFixed(2)} ({pct}%)
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>
          Total income: <strong className="text-foreground">${totalIncome.toFixed(2)}</strong>
        </span>
        <span>
          Allocated: <strong className="text-foreground">${totalAllocated.toFixed(2)}</strong>
        </span>
        <span>
          Unallocated:{" "}
          <strong className="text-foreground">
            ${Math.max(0, totalIncome - totalAllocated).toFixed(2)}
          </strong>
        </span>
      </div>
    </div>
  );
}
