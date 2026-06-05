let ws = null;
const handlers = new Set();
let reconnectTimer = null;

export function connectWS() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  // The server reads the JWT from the httpOnly session cookie on the upgrade request.
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      handlers.forEach(h => h(msg));
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
    reconnectTimer = setTimeout(connectWS, 5000);
  };

  ws.onerror = () => ws?.close();
}

export function disconnectWS() {
  clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}

export function onMessage(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}
