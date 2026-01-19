import { store } from "@/lib/mock/store";

export async function GET(request: Request) {
  store.startSimulator();

  const { searchParams } = new URL(request.url);
  const gw_id = searchParams.get("gw_id");

  const filtered = gw_id ? store.nodes.filter((n) => n.gw_id === gw_id) : store.nodes;
  return Response.json({ nodes: filtered });
}

