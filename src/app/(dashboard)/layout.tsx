import Link from "next/link";

const NavItem = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white transition"
  >
    {label}
  </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-12 gap-4 p-4">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="mb-3">
                <div className="text-lg font-semibold">Sentinel</div>
                <div className="text-xs text-zinc-400">Cloud Dashboard </div>
              </div>

              <nav className="flex flex-col gap-1">
                <NavItem href="/overview" label="Overview" />
                <NavItem href="/fleet" label="Fleet" />
                <NavItem href="/health" label="Health" />
                <NavItem href="/alerts" label="Alerts" />
                <NavItem href="/settings" label="Settings" />
              </nav>

              <div className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
                Session: UI + Live Mock
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-300">Nodes → BaseStations → Cloud → Dashboard</div>
                <div className="text-xs text-zinc-400">Env: local</div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
