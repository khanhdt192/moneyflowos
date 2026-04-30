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
    <div className="mx-auto max-w-6xl">
      <RentalBoard />
    </div>
  );
}
