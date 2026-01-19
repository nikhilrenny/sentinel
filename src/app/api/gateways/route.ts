import { store } from "@/lib/mock/store";

export async function GET() {
  store.startSimulator();
  return Response.json({ gateways: store.gateways });
}
