import { createFileRoute } from "@tanstack/react-router";
import { RentalBoard } from "@/components/rental/RentalBoard";

export const Route = createFileRoute("/rental")({
  head: () => ({
    meta: [{ title: "Cho thuê · Money Flow OS" }],
  }),
  component: RentalPage,
});

function RentalPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cho thuê căn hộ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi tỷ lệ lấp đầy, thu nhập từng phòng và doanh thu bị bỏ lỡ.
        </p>
      </header>
      <RentalBoard />
    </div>
  );
}
