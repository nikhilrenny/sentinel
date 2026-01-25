// src/components/ui/Card.tsx
import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-2xl border border-neutral-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div {...props} className={["p-5 pb-3", className].join(" ")} />;
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={["text-sm font-semibold text-neutral-900", className].join(" ")}
    />
  );
}

export function CardDescription({ className = "", ...props }: DivProps) {
  return (
    <div
      {...props}
      className={["mt-1 text-sm text-neutral-600", className].join(" ")}
    />
  );
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div {...props} className={["p-5 pt-0", className].join(" ")} />;
}
