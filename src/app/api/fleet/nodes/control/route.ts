import { store } from "@/lib/mock/store";
export const runtime = "nodejs";

export async function POST(request: Request) {
  store.startSimulator();
  const body = await request.json().catch(() => null);

  const action = String(body?.action ?? "");
  const ids: string[] = Array.isArray(body?.node_ids) ? body.node_ids.map(String) : [];
  if (!ids.length) return Response.json({ ok: false, error: "node_ids required" }, { status: 400 });

  let changed = 0;

  if (action === "enable") changed = store.bulkEnableNodes(ids, true);
  else if (action === "disable") changed = store.bulkEnableNodes(ids, false);
  else if (action === "reboot") changed = store.bulkRebootNodes(ids);
  else if (action === "assign_gateway") {
    const gw_id = String(body?.gw_id ?? "").trim();
    if (!gw_id) return Response.json({ ok: false, error: "gw_id required" }, { status: 400 });
    changed = store.bulkUpdateNodes(ids, { gw_id } as any);
  } else {
    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  return Response.json({ ok: true, changed });
}
