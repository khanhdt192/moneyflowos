import { useMemo, useRef, useEffect, useState, useId } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { motion } from "framer-motion";
import type { BudgetState } from "./types";
import { CATEGORY_META } from "./types";
import { formatVND, formatCompact } from "@/lib/format";

interface Props { data: BudgetState }

interface SNode {
  name: string;
  color: string;
  category: "income" | "needs" | "wants" | "savings" | "total" | "unallocated";
}

interface SLink { source: number; target: number; value: number }

export function SankeyChart({ data }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();
  const height = 560;

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((e) => {
      for (const x of e) setWidth(Math.max(360, x.contentRect.width));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const { nodes, links, totalIncome, totalAllocated } = useMemo(() => {
    const nodes: SNode[] = [];
    const links: SLink[] = [];
    const idx = (n: SNode) => { nodes.push(n); return nodes.length - 1; };

    const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);
    const groups = (["needs", "wants", "savings"] as const).map((k) => ({
      key: k, total: data[k].reduce((s, i) => s + i.amount, 0),
    }));
    const totalAllocated = groups.reduce((s, g) => s + g.total, 0);
    const unallocated = Math.max(0, totalIncome - totalAllocated);

    if (totalIncome === 0) return { nodes: [], links: [], totalIncome: 0, totalAllocated: 0 };

    const totalIdx = idx({ name: "Tổng Ngân Sách", color: "var(--primary)", category: "total" });

    for (const inc of data.income) {
      if (inc.amount <= 0) continue;
      const i = idx({ name: inc.name, color: "var(--income)", category: "income" });
      links.push({ source: i, target: totalIdx, value: inc.amount });
    }

    for (const g of groups) {
      if (g.total <= 0) continue;
      const meta = CATEGORY_META[g.key];
      const gi = idx({ name: meta.short, color: meta.color, category: g.key });
      links.push({ source: totalIdx, target: gi, value: g.total });
      for (const it of data[g.key]) {
        if (it.amount <= 0) continue;
        const ii = idx({ name: it.name, color: meta.color, category: g.key });
        links.push({ source: gi, target: ii, value: it.amount });
      }
    }

    if (unallocated > 0) {
      const ui = idx({ name: "Chưa phân bổ", color: "var(--unallocated)", category: "unallocated" });
      links.push({ source: totalIdx, target: ui, value: unallocated });
    }

    return { nodes, links, totalIncome, totalAllocated };
  }, [data]);

  const layout = useMemo(() => {
    if (nodes.length === 0) return null;
    const generator = sankey<SNode, SLink>()
      .nodeWidth(10)
      .nodePadding(22)
      .nodeAlign(sankeyJustify)
      .extent([[12, 24], [width - 12, height - 24]]);
    return generator({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    });
  }, [nodes, links, width]);

  if (!layout || totalIncome === 0) {
    return (
      <div ref={wrapperRef} className="grid h-[560px] w-full place-items-center rounded-2xl bg-muted/30 text-center">
        <div className="max-w-sm px-6">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-card shadow-card">
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-base font-semibold text-foreground">Bắt đầu bằng cách thêm thu nhập</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sơ đồ dòng tiền sẽ xuất hiện ở đây ngay khi bạn thêm các khoản.
          </p>
        </div>
      </div>
    );
  }

  const linkPath = sankeyLinkHorizontal();

  return (
    <div ref={wrapperRef} className="relative w-full">
      <svg width={width} height={height} className="block">
        <defs>
          {layout.links.map((l, i) => {
            const s = l.source as unknown as SNode & { x1: number };
            const t = l.target as unknown as SNode & { x0: number };
            return (
              <linearGradient key={i} id={`${gradId}-${i}`} gradientUnits="userSpaceOnUse" x1={s.x1} x2={t.x0}>
                <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                <stop offset="100%" stopColor={t.color} stopOpacity="0.55" />
              </linearGradient>
            );
          })}
        </defs>

        <g>
          {layout.links.map((l, i) => {
            const isHover = hover === i;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <path
                  d={linkPath(l) || ""}
                  fill="none"
                  stroke={`url(#${gradId}-${i})`}
                  strokeOpacity={hover === null ? 0.85 : isHover ? 1 : 0.25}
                  strokeWidth={Math.max(1, l.width || 0)}
                  className="transition-all duration-300"
                  style={isHover ? { filter: "drop-shadow(0 4px 14px oklch(0.55 0.21 264 / 0.35))" } : undefined}
                />
                {isHover && (
                  <path
                    d={linkPath(l) || ""}
                    fill="none"
                    stroke="white"
                    strokeOpacity={0.5}
                    strokeWidth={Math.max(1, (l.width || 0) * 0.18)}
                    className="animate-flow"
                  />
                )}
              </g>
            );
          })}
        </g>

        <g>
          {layout.nodes.map((n, i) => {
            const node = n as unknown as SNode & {
              x0: number; x1: number; y0: number; y1: number; value: number;
            };
            const pct = ((node.value / totalIncome) * 100).toFixed(1);
            const isRight = node.x0 > width * 0.66;
            const isCenter = node.x0 > width * 0.33 && node.x0 <= width * 0.66;
            const labelX = isRight ? node.x0 - 12 : node.x1 + 12;
            const anchor: "start" | "end" = isRight ? "end" : "start";
            const labelY = (node.y0 + node.y1) / 2;
            const isImportant = node.category === "total" || isCenter;
            return (
              <g key={i}>
                <rect
                  x={node.x0 - 1}
                  y={node.y0}
                  width={(node.x1 - node.x0) + 2}
                  height={Math.max(2, node.y1 - node.y0)}
                  fill={node.color}
                  rx={3}
                />
                <text
                  x={labelX} y={labelY - 6}
                  textAnchor={anchor}
                  className="fill-foreground"
                  style={{ fontSize: isImportant ? 13 : 12, fontWeight: 700, letterSpacing: "-0.01em" }}
                >
                  {node.name}
                </text>
                <text
                  x={labelX} y={labelY + 10}
                  textAnchor={anchor}
                  className="fill-muted-foreground num"
                  style={{ fontSize: 11, fontWeight: 500 }}
                >
                  {formatCompact(node.value)}
                </text>
                <g transform={`translate(${anchor === "end" ? labelX - 44 : labelX}, ${labelY + 16})`}>
                  <rect
                    width={44} height={16} rx={8}
                    fill={node.color} fillOpacity={0.12}
                  />
                  <text
                    x={22} y={11.5}
                    textAnchor="middle"
                    style={{ fontSize: 10, fontWeight: 700, fill: node.color }}
                    className="num"
                  >
                    {pct}%
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {hover !== null && layout.links[hover] && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute right-4 top-4 rounded-xl border border-border bg-card/95 px-3.5 py-2.5 text-xs shadow-elevated backdrop-blur"
        >
          <div className="font-semibold text-foreground">
            {(layout.links[hover].source as unknown as SNode).name}
            <span className="mx-1.5 text-muted-foreground">→</span>
            {(layout.links[hover].target as unknown as SNode).name}
          </div>
          <div className="mt-0.5 num text-foreground">{formatVND(layout.links[hover].value)}</div>
          <div className="text-muted-foreground">
            {((layout.links[hover].value / totalIncome) * 100).toFixed(1)}% tổng thu nhập
          </div>
        </motion.div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border px-2 pt-3 text-xs text-muted-foreground">
        <span>Tổng thu: <strong className="text-foreground num">{formatVND(totalIncome)}</strong></span>
        <span>Đã phân bổ: <strong className="text-foreground num">{formatVND(totalAllocated)}</strong></span>
        <span>Còn lại: <strong className="text-foreground num">{formatVND(Math.max(0, totalIncome - totalAllocated))}</strong></span>
      </div>
    </div>
  );
}
