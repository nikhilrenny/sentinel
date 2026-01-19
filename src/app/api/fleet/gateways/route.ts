import { store } from "@/lib/mock/store";

export async function POST(request: Request) {
  store.startSimulator();

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  const gw_id = String(body?.gw_id ?? "").trim();

  if (action !== "reboot") {
    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  if (!gw_id) {
    return Response.json({ ok: false, error: "gw_id required" }, { status: 400 });
  }

  const ok = store.rebootGateway(gw_id);
  if (!ok) {
    return Response.json({ ok: false, error: "Gateway not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  store.startSimulator();
  const body = await request.json().catch(() => null);

  const gw_id = String(body?.gw_id ?? "").trim();
  if (!gw_id) return Response.json({ ok: false, error: "gw_id required" }, { status: 400 });

  const patch: any = {};
  if (body?.name != null) patch.name = String(body.name);
  if (body?.site != null) patch.site = String(body.site);
  if (body?.lat != null) patch.lat = Number(body.lat);
  if (body?.lon != null) patch.lon = Number(body.lon);
  if (body?.status === "online" || body?.status === "offline") patch.status = body.status;

  const ok = store.updateGateway(gw_id, patch);
  if (!ok) return Response.json({ ok: false, error: "Gateway not found" }, { status: 404 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  store.startSimulator();
  const url = new URL(request.url);
  const gw_id = url.searchParams.get("gw_id") ?? "";
  const force = (url.searchParams.get("force") ?? "false") === "true";

  if (!gw_id) return Response.json({ ok: false, error: "gw_id required" }, { status: 400 });

  const res = store.deleteGateway(gw_id, { force });
  if (!res.ok) return Response.json({ ok: false, error: res.error }, { status: 400 });

  return Response.json({ ok: true });
}

