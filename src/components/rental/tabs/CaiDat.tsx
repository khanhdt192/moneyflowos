import { useState } from "react";
import { ChiPhiKhac } from "./ChiPhiKhac";
import { MauHoaDon } from "./MauHoaDon";

type Section = "chiphi" | "thanhtoan";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "chiphi", label: "Chi phí khác" },
  { id: "thanhtoan", label: "Mẫu hóa đơn" },
];

export function CaiDat({
  initialSection,
  hideSectionTabs = true,
}: {
  initialSection?: Section;
  hideSectionTabs?: boolean;
}) {
  const [section, setSection] = useState<Section>(initialSection ?? "chiphi");

  return (
    <div className="space-y-6">
      {!hideSectionTabs && (
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-all ${
                section === s.id
                  ? "bg-white font-semibold text-foreground shadow-sm"
                  : "font-medium text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {section === "chiphi" && <ChiPhiKhac />}
      {section === "thanhtoan" && <MauHoaDon />}
    </div>
  );
}
