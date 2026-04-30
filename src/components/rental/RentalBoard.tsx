import { useState } from "react";
import { TongQuan } from "./tabs/TongQuan";
import { Phong } from "./tabs/Phong";
import { GhiSo } from "./tabs/GhiSo";
import { HoaDon } from "./tabs/HoaDon";
import { BaoCao } from "./tabs/BaoCao";
import { CauHinh } from "./tabs/CauHinh";

type Tab = "tongquan" | "phong" | "ghiso" | "hoadon" | "baocao" | "cauhinh";

const TABS: { id: Tab; label: string }[] = [
  { id: "tongquan", label: "Tổng quan" },
  { id: "phong", label: "Phòng" },
  { id: "ghiso", label: "Ghi số" },
  { id: "hoadon", label: "Hóa đơn" },
  { id: "baocao", label: "Báo cáo" },
  { id: "cauhinh", label: "Cấu hình" },
];

export function RentalBoard() {
  const [activeTab, setActiveTab] = useState<Tab>("tongquan");

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
        {activeTab === "tongquan" && <TongQuan />}
        {activeTab === "phong" && <Phong />}
        {activeTab === "ghiso" && <GhiSo />}
        {activeTab === "hoadon" && <HoaDon />}
        {activeTab === "baocao" && <BaoCao />}
        {activeTab === "cauhinh" && <CauHinh />}
      </div>
    </div>
  );
}
