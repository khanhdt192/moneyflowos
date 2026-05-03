import { useState } from "react";
import { TongQuan } from "./tabs/TongQuan";
import { Phong } from "./tabs/Phong";
import { ChotThang } from "./tabs/ChotThang";
import { BaoCao } from "./tabs/BaoCao";
import { CaiDat } from "./tabs/CaiDat";

type Tab = "tongquan" | "phong" | "chotthang" | "chiphikhac" | "mauhoadon" | "baocao";

const TABS: { id: Tab; label: string }[] = [
  { id: "tongquan",  label: "Tổng quan" },
  { id: "phong",     label: "Phòng" },
  { id: "chotthang", label: "Chốt tháng" },
  { id: "chiphikhac", label: "Chi phí khác" },
  { id: "mauhoadon",  label: "Mẫu hóa đơn" },
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

      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit overflow-x-auto">
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
        {activeTab === "tongquan"  && <TongQuan onNavigate={setActiveTab} />}
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
        {activeTab === "chiphikhac" && <CaiDat key="chiphi" initialSection="chiphi" />}
        {activeTab === "mauhoadon" && <CaiDat key="thanhtoan" initialSection="thanhtoan" />}
        {activeTab === "baocao"    && <BaoCao />}
      </div>
    </div>
  );
}
