import WebSocket from "ws";
import axios from "axios";

export function startAtlosWatcher() {
  const ws = new WebSocket("wss://api.atlos.io/gateway/socket/");

  ws.on("open", () => console.log("[ATLOS:WS] connected"));
  ws.on("message", async (data) => {
    try {
      const text = data.toString();
      // Проверяем, что это JSON
      if (!text.startsWith('{') && !text.startsWith('[')) {
        console.log('[ATLOS:WS] non-JSON message:', text);
        return;
      }
      
      const msg = JSON.parse(text);
      if (msg?.type === "payment:update" && msg?.data?.orderId) {
        console.log("[ATLOS:WS] payment:update", msg.data);
        // Триггерим локальный ресинк
        await axios.get(
          `https://kissblow.me/api/payments/resync?orderId=${encodeURIComponent(
            msg.data.orderId
          )}`
        );
      }
    } catch (e) {
      console.error("[ATLOS:WS] parse error", e);
    }
  });

  ws.on("close", () => console.log("[ATLOS:WS] closed"));
  ws.on("error", (e) => console.error("[ATLOS:WS] error", e));
  return ws;
}
