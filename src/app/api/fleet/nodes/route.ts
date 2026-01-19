export async function PATCH(request: Request) {
  store.startSimulator();
  const body = await request.json().catch(() => null);

  const node_id = String(body?.node_id ?? "").trim();
  if (!node_id) return Response.json({ ok: false, error: "node_id required" }, { status: 400 });

  const patch: any = {};
  if (body?.gw_id != null) patch.gw_id = String(body.gw_id);
  if (body?.net === "lora" || body?.net === "thread") patch.net = body.net;
  if (body?.lat != null) patch.lat = Number(body.lat);
  if (body?.lon != null) patch.lon = Number(body.lon);
  if (body?.status === "online" || body?.status === "offline") patch.status = body.status;

  const ok = store.updateNode(node_id, patch);
  if (!ok) return Response.json({ ok: false, error: "Node not found" }, { status: 404 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  store.startSimulator();
  const url = new URL(request.url);
  const node_id = url.searchParams.get("node_id") ?? "";
  if (!node_id) return Response.json({ ok: false, error: "node_id required" }, { status: 400 });

  const ok = store.deleteNode(node_id);
  if (!ok) return Response.json({ ok: false, error: "Node not found" }, { status: 404 });

  return Response.json({ ok: true });
}
