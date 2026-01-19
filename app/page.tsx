"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Sentinel Dashboard</h1>
      <p style={{ opacity: 0.75 }}>
        If you can see this and the counter is incrementing, your dashboard route
        is correct.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
          display: "inline-block",
        }}
      >
        Live counter: <b>{count}</b>
      </div>
    </main>
  );
}
