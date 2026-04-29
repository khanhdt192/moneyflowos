import { useMemo, useRef, useEffect, useState, useId } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { motion, AnimatePresence } from "framer-motion";
import type { BudgetState, CategoryKey } from "./types";
import { CATEGORY_META } from "./types";
import { formatVND, formatCompact } from "@/lib/format";

interface Props {
  data: BudgetState;
}

type NodeKind = "income" | "total" | "needs" | "wants" | "savings" | "unallocated";

interface SNode {
  id: string;
  name: string;
  color: string;
  category: NodeKind;
  /** Original parent category for sub-items (so we color them correctly) */
  parent?: CategoryKey;
  /** True for top-level nodes (income source, total, needs/wants/savings, unallocated) */
  isPrimary: boolean;
}

interface SLink {
  source: number;
  target: number;
  value: number;
}

type ViewMode = "simple" | "detailed";

const TOTAL_NAME = "Tổng Ngân Sách";

export function SankeyChart({ data }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [mode, setMode] = useState<ViewMode>("simple");
  const [hoverLink, setHoverLink] = useState<number | null>(null);
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const gradId = useId();

  // Taller, more breathable canvas
  const height = mode === "detailed" ? 620 : 540;

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(360, e.contentRect.width));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Reset selection when mode changes
  useEffect(() => {
    setSelectedNode(null);
    setHoverNode(null);
    setHoverLink(null);
  }, [mode]);

  const { nodes, links, totalIncome, totalAllocated, totalSavings } = useMemo(() => {
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
    const totalSavings = data.savings.reduce((s, i) => s + i.amount, 0);
    const unallocated = Math.max(0, totalIncome - totalAllocated);

    if (totalIncome === 0) {
      return { nodes: [], links: [], totalIncome: 0, totalAllocated: 0, totalSavings: 0 };
    }

    const totalIdx = idx({
      id: "node-total",
      name: TOTAL_NAME,
      color: "var(--primary)",
      category: "total",
      isPrimary: true,
    });

    // Income sources -> Total
    for (const inc of data.income) {
      if (inc.amount <= 0) continue;
      const i = idx({
        id: `node-income-${inc.id}`,
        name: inc.name,
        color: "var(--income)",
        category: "income",
        isPrimary: true,
      });
      links.push({ source: i, target: totalIdx, value: inc.amount });
    }

    // Total -> group, optionally group -> sub-items
    for (const g of groups) {
      if (g.total <= 0) continue;
      const meta = CATEGORY_META[g.key];
      const gi = idx({
        id: `node-${g.key}`,
        name: meta.short,
        color: meta.color,
        category: g.key,
        isPrimary: true,
      });
      links.push({ source: totalIdx, target: gi, value: g.total });

      if (mode === "detailed") {
        for (const it of data[g.key]) {
          if (it.amount <= 0) continue;
          const ii = idx({
            id: `node-${g.key}-${it.id}`,
            name: it.name,
            color: meta.color,
            category: g.key,
            parent: g.key,
            isPrimary: false,
          });
          links.push({ source: gi, target: ii, value: it.amount });
        }
      }
    }

    if (unallocated > 0) {
      const ui = idx({
        id: "node-unallocated",
        name: "Chưa phân bổ",
        color: "var(--unallocated)",
        category: "unallocated",
        isPrimary: true,
      });
      links.push({ source: totalIdx, target: ui, value: unallocated });
    }

    return { nodes, links, totalIncome, totalAllocated, totalSavings };
  }, [data, mode]);

  const layout = useMemo(() => {
    if (nodes.length === 0) return null;
    // Wider extents, generous padding for breathing room.
    const padX = 16;
    const padY = mode === "detailed" ? 28 : 36;
    const nodePadding = mode === "detailed" ? 18 : 38;
    const generator = sankey<SNode, SLink>()
      .nodeWidth(12)
      .nodePadding(nodePadding)
      .nodeAlign(sankeyJustify)
      .extent([
        [padX, padY],
        [width - padX, height - padY],
      ]);
    return generator({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    });
  }, [nodes, links, width, height, mode]);

  // Compute connected subgraph for click-isolation
  const isolation = useMemo(() => {
    if (selectedNode === null || !layout) {
      return { nodes: null as Set<number> | null, links: null as Set<number> | null };
    }
    const linkSet = new Set<number>();
    const nodeSet = new Set<number>([selectedNode]);

    // Walk downstream
    const downstream = (nodeIdx: number) => {
      layout.links.forEach((l, i) => {
        const s = (l.source as unknown as { index: number }).index;
        const t = (l.target as unknown as { index: number }).index;
        if (s === nodeIdx && !linkSet.has(i)) {
          linkSet.add(i);
          nodeSet.add(t);
          downstream(t);
        }
      });
    };
    // Walk upstream
    const upstream = (nodeIdx: number) => {
      layout.links.forEach((l, i) => {
        const s = (l.source as unknown as { index: number }).index;
        const t = (l.target as unknown as { index: number }).index;
        if (t === nodeIdx && !linkSet.has(i)) {
          linkSet.add(i);
          nodeSet.add(s);
          upstream(s);
        }
      });
    };
    downstream(selectedNode);
    upstream(selectedNode);
    return { nodes: nodeSet, links: linkSet };
  }, [selectedNode, layout]);

  if (!layout || totalIncome === 0) {
    return (
      <div
        ref={wrapperRef}
        className="grid h-[540px] w-full place-items-center rounded-2xl bg-muted/30 text-center"
      >
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
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const remaining = Math.max(0, totalIncome - totalAllocated);

  // Mock 6-month trend deterministically from a node's value, used for the hover tooltip
  const trendFor = (seed: number, value: number) => {
    const points: number[] = [];
    let x = (seed * 9301 + 49297) % 233280;
    for (let i = 0; i < 6; i++) {
      x = (x * 9301 + 49297) % 233280;
      const noise = (x / 233280 - 0.5) * 0.18; // ±9%
      points.push(value * (0.86 + i * 0.03 + noise));
    }
    points[5] = value; // last point lands on current value
    return points;
  };

  const sparklinePath = (vals: number[], w: number, h: number) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Header: View mode toggle */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {selectedNode !== null ? (
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-background"
            >
              <span aria-hidden>↺</span>
              Bỏ chọn nhánh
            </button>
          ) : (
            <span>Nhấp vào một nút để cô lập nhánh</span>
          )}
        </div>
        <div
          role="tablist"
          aria-label="Chế độ xem"
          className="inline-flex rounded-full border border-border bg-background/70 p-0.5 text-xs font-semibold backdrop-blur"
        >
          {(["simple", "detailed"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                "rounded-full px-3 py-1.5 transition-all",
                mode === m
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {m === "simple" ? "Đơn giản" : "Chi tiết"}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative rounded-2xl"
        onClick={(e) => {
          // Click on empty chart area clears selection
          if (e.target === e.currentTarget) setSelectedNode(null);
        }}
      >
        <svg width={width} height={height} className="block">
          <defs>
            {layout.links.map((l, i) => {
              const s = l.source as unknown as SNode & { x1: number };
              const t = l.target as unknown as SNode & { x0: number };
              return (
                <linearGradient
                  key={i}
                  id={`${gradId}-${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={s.x1}
                  x2={t.x0}
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={t.color} stopOpacity="0.55" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Links */}
          <g>
            {layout.links.map((l, i) => {
              const isLinkHover = hoverLink === i;
              const inIsolation = isolation.links?.has(i) ?? null;
              const dimmed =
                (inIsolation === false) ||
                (hoverLink !== null && !isLinkHover) ||
                (hoverNode !== null && !isLinkConnectedToNode(layout, i, hoverNode));
              const opacity = dimmed ? 0.12 : isLinkHover ? 1 : inIsolation ? 0.92 : 0.78;

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoverLink(i)}
                  onMouseLeave={() => setHoverLink(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={linkPath(l) || ""}
                    fill="none"
                    stroke={`url(#${gradId}-${i})`}
                    strokeOpacity={opacity}
                    strokeWidth={Math.max(1, l.width || 0)}
                    className="transition-all duration-300"
                    style={
                      isLinkHover
                        ? { filter: "drop-shadow(0 6px 16px oklch(0.55 0.21 264 / 0.35))" }
                        : undefined
                    }
                  />
                  {isLinkHover && (
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

          {/* Nodes */}
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
              const isRight = node.x0 > width * 0.66;
              const labelX = isRight ? node.x0 - 14 : node.x1 + 14;
              const anchor: "start" | "end" = isRight ? "end" : "start";
              const labelY = (node.y0 + node.y1) / 2;
              const inIsolation = isolation.nodes?.has(i) ?? null;
              const dimmed = inIsolation === false;
              const isPrimary = node.isPrimary;
              const titleSize = isPrimary ? 14 : 12;
              const isSelected = selectedNode === i;
              const nodeHeight = Math.max(2, node.y1 - node.y0);

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoverNode(i)}
                  onMouseLeave={() => setHoverNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode((cur) => (cur === i ? null : i));
                  }}
                  className="cursor-pointer"
                  style={{ opacity: dimmed ? 0.3 : 1, transition: "opacity 250ms" }}
                >
                  <rect
                    x={node.x0 - 1}
                    y={node.y0}
                    width={node.x1 - node.x0 + 2}
                    height={nodeHeight}
                    fill={node.color}
                    rx={4}
                    style={
                      isSelected
                        ? { filter: "drop-shadow(0 4px 14px oklch(0.55 0.21 264 / 0.45))" }
                        : undefined
                    }
                  />
                  {isSelected && (
                    <rect
                      x={node.x0 - 3}
                      y={node.y0 - 2}
                      width={node.x1 - node.x0 + 6}
                      height={nodeHeight + 4}
                      fill="none"
                      stroke={node.color}
                      strokeOpacity={0.4}
                      strokeWidth={2}
                      rx={6}
                    />
                  )}

                  {/* Title */}
                  <text
                    x={labelX}
                    y={labelY - 8}
                    textAnchor={anchor}
                    className="fill-foreground"
                    style={{
                      fontSize: titleSize,
                      fontWeight: isPrimary ? 700 : 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {node.name}
                  </text>
                  {/* Amount (smaller than title) */}
                  <text
                    x={labelX}
                    y={labelY + 8}
                    textAnchor={anchor}
                    className="fill-foreground/80 num"
                    style={{ fontSize: isPrimary ? 12 : 11, fontWeight: 600 }}
                  >
                    {formatCompact(node.value)}
                  </text>
                  {/* Percent (muted) */}
                  <text
                    x={labelX}
                    y={labelY + 22}
                    textAnchor={anchor}
                    className="fill-muted-foreground num"
                    style={{ fontSize: 10.5, fontWeight: 500 }}
                  >
                    {pct}% tổng
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip: node hover (preferred) */}
        <AnimatePresence>
          {hoverNode !== null && layout.nodes[hoverNode] && (
            <NodeTooltip
              key={`node-${hoverNode}`}
              node={layout.nodes[hoverNode] as unknown as SNode & { value: number }}
              totalIncome={totalIncome}
              trend={trendFor(hoverNode + 1, (layout.nodes[hoverNode] as { value: number }).value)}
              sparklinePath={sparklinePath}
            />
          )}
        </AnimatePresence>

        {/* Tooltip: link hover (only when no node hovered) */}
        <AnimatePresence>
          {hoverNode === null && hoverLink !== null && layout.links[hoverLink] && (
            <LinkTooltip
              key={`link-${hoverLink}`}
              source={layout.links[hoverLink].source as unknown as SNode}
              target={layout.links[hoverLink].target as unknown as SNode}
              value={layout.links[hoverLink].value}
              totalIncome={totalIncome}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Summary row */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background/60 p-2 backdrop-blur sm:grid-cols-4">
        <SummaryCell
          label="Thu nhập"
          value={formatVND(totalIncome)}
          dot="var(--income)"
        />
        <SummaryCell
          label="Đã phân bổ"
          value={formatVND(totalAllocated)}
          dot="var(--needs)"
        />
        <SummaryCell
          label="Còn lại"
          value={formatVND(remaining)}
          dot="var(--unallocated)"
          tone={remaining === 0 ? "muted" : "default"}
        />
        <SummaryCell
          label="Tỷ lệ tiết kiệm"
          value={`${savingsRate.toFixed(1)}%`}
          dot="var(--savings)"
          accent
        />
      </div>
    </div>
  );
}

/* ------------------------------ Sub-components ------------------------------ */

function SummaryCell({
  label,
  value,
  dot,
  accent = false,
  tone = "default",
}: {
  label: string;
  value: string;
  dot: string;
  accent?: boolean;
  tone?: "default" | "muted";
}) {
  return (
    <div className="rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </div>
      <div
        className={[
          "mt-1 num tabular-nums",
          accent ? "text-base font-bold tracking-tight" : "text-sm font-semibold",
          tone === "muted" ? "text-muted-foreground" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function NodeTooltip({
  node,
  totalIncome,
  trend,
  sparklinePath,
}: {
  node: SNode & { value: number };
  totalIncome: number;
  trend: number[];
  sparklinePath: (vals: number[], w: number, h: number) => string;
}) {
  const pct = ((node.value / totalIncome) * 100).toFixed(1);
  const W = 120;
  const H = 32;
  const first = trend[0];
  const last = trend[trend.length - 1];
  const delta = first ? ((last - first) / first) * 100 : 0;
  const positive = delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="pointer-events-none absolute right-4 top-4 w-[180px] rounded-2xl border border-border bg-card/95 p-3 text-xs shadow-elevated backdrop-blur"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: node.color }} />
        <div className="font-semibold text-foreground">{node.name}</div>
      </div>
      <div className="mt-1.5 num text-sm font-bold text-foreground">{formatVND(node.value)}</div>
      <div className="text-[11px] text-muted-foreground">{pct}% tổng thu nhập</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          6 tháng
        </span>
        <span
          className="num text-[11px] font-semibold"
          style={{ color: positive ? "var(--income)" : "var(--needs)" }}
        >
          {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
      <svg width={W} height={H} className="mt-1 block">
        <path
          d={sparklinePath(trend, W, H)}
          fill="none"
          stroke={node.color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

function LinkTooltip({
  source,
  target,
  value,
  totalIncome,
}: {
  source: SNode;
  target: SNode;
  value: number;
  totalIncome: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="pointer-events-none absolute right-4 top-4 rounded-xl border border-border bg-card/95 px-3.5 py-2.5 text-xs shadow-elevated backdrop-blur"
    >
      <div className="font-semibold text-foreground">
        {source.name}
        <span className="mx-1.5 text-muted-foreground">→</span>
        {target.name}
      </div>
      <div className="mt-0.5 num text-foreground">{formatVND(value)}</div>
      <div className="text-muted-foreground">
        {((value / totalIncome) * 100).toFixed(1)}% tổng thu nhập
      </div>
    </motion.div>
  );
}

/* -------------------------------- Helpers -------------------------------- */

function isLinkConnectedToNode(
  layout: { links: Array<{ source: unknown; target: unknown }> },
  linkIdx: number,
  nodeIdx: number,
) {
  const l = layout.links[linkIdx];
  const s = (l.source as { index: number }).index;
  const t = (l.target as { index: number }).index;
  return s === nodeIdx || t === nodeIdx;
}
