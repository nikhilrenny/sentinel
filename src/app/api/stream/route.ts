import { store } from "@/lib/mock/store";

export const runtime = "nodejs";

export async function GET() {
  // Ensure simulator is running (idempotent)
  store.startSimulator();

  const encoder = new TextEncoder();
  let unsubscribe: null | (() => void) = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected / controller closed
          closed = true;
          try {
            unsubscribe?.();
          } catch {}
          unsubscribe = null;
          try {
            controller.close();
          } catch {}
        }
      };

      // Send immediate snapshot on connect
      send({
        type: "snapshot",
        ts: Date.now(),
        gateways: store.gateways,
        nodes: store.nodes,
        alerts: store.alerts,
        settings: store.settings,
      });

      // Subscribe to future snapshots emitted by the store
      unsubscribe = store.subscribe(send);
    },

    cancel() {
      // Called when client disconnects
      try {
        unsubscribe?.();
      } catch {}
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
