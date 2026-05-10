import { useEffect, useRef, useState } from "react";
import { TongQuan } from "./tabs/TongQuan";
import { Phong } from "./tabs/Phong";
import { ChotThang } from "./tabs/ChotThang";
import { BaoCao } from "./tabs/BaoCao";
import { ChiPhiKhac } from "./tabs/ChiPhiKhac";
import { MauHoaDon } from "./tabs/MauHoaDon";
import { TienCoc } from "./tabs/TienCoc";

type Tab = "tongquan" | "phong" | "chotthang" | "tiencoc" | "chiphikhac" | "mauhoadon" | "baocao";

const TABS: { id: Tab; label: string; mobileLabel?: string }[] = [
  { id: "tongquan",  label: "Tổng quan" },
  { id: "phong",     label: "Phòng" },
  { id: "chotthang", label: "Chốt tháng" },
  { id: "tiencoc", label: "Tiền cọc" },
  { id: "chiphikhac", label: "Chi phí khác" },
  { id: "mauhoadon",  label: "Mẫu hóa đơn", mobileLabel: "Mẫu HĐ" },
  { id: "baocao",    label: "Báo cáo" },
];

export function RentalBoard({ initialTab }: { initialTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "tongquan");
  const [chotThangFocus, setChotThangFocus] = useState<{ roomId: string; cycleId: string; nonce: number } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Quản lý Cho thuê</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Workspace quản lý phòng trọ chuyên nghiệp</p>
        </div>
      </div>

      <RentalMobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="hidden w-fit gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1 lg:flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "tongquan"  && <TongQuan onNavigate={(tab) => { if (tab !== "caidat") setActiveTab(tab); }} />}
        {activeTab === "phong"     && (
          <Phong
            onOpenBillDetail={(roomId, cycleId) => {
              setChotThangFocus({ roomId, cycleId, nonce: Date.now() });
              setActiveTab("chotthang");
            }}
          />
        )}
        {activeTab === "chotthang" && (
          <ChotThang
            focusRequest={chotThangFocus}
            onFocusRequestConsumed={() => setChotThangFocus(null)}
          />
        )}
        {activeTab === "tiencoc" && <TienCoc />}
        {activeTab === "chiphikhac" && <ChiPhiKhac />}
        {activeTab === "mauhoadon" && <MauHoaDon />}
        {activeTab === "baocao"    && <BaoCao />}
      </div>
    </div>
  );
}

function RentalMobileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({});

  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab]);

  return (
    <div className="sticky top-[64px] z-10 -mx-4 border-y border-border bg-background/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
      <div
        role="tablist"
        className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Điều hướng Cho thuê"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onTabChange(tab.id)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card/80 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {tab.mobileLabel ?? tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
