import { SentinelProvider } from "@/lib/store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SentinelProvider>{children}</SentinelProvider>;
}
