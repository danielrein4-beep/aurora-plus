import type { ReactNode } from "react";

export default function Kicker({
  children,
  className = "",
  align = "center",
}: {
  children: ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <p
      className={`font-light uppercase tracking-wide text-[#177E89] text-sm mb-3 ${
        align === "center" ? "text-center" : "text-left"
      } ${className}`}
    >
      {children}
    </p>
  );
}
