const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss:' : 'ws:') +
    '//' +
    (typeof location !== 'undefined' ? location.host : 'localhost:3333') +
    '/ws';

type Listener = (data: unknown) => void;

let socket: WebSocket | null = null;
const listeners = new Set<Listener>();

function getSocket(): WebSocket | null {
  if (socket?.readyState === WebSocket.OPEN) return socket;
  try {
    socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      listeners.forEach((fn) => fn({ type: 'connected' }));
    };
    socket.onclose = () => {
      listeners.forEach((fn) => fn({ type: 'disconnected' }));
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        listeners.forEach((fn) => fn(data));
      } catch {
        listeners.forEach((fn) => fn({ type: 'message', raw: event.data }));
      }
    };
    socket.onerror = () => {
      listeners.forEach((fn) => fn({ type: 'error' }));
    };
    return socket;
  } catch {
    return null;
  }
}

export const websocketService = {
  connect(): WebSocket | null {
    return getSocket();
  },

  disconnect() {
    if (socket) {
      socket.close();
      socket = null;
    }
  },

  send(payload: Record<string, unknown>) {
    const s = getSocket();
    if (s?.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    }
  },

  onMessage(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  get readyState(): number {
    return socket?.readyState ?? WebSocket.CLOSED;
  },

  get isConnected(): boolean {
    return socket?.readyState === WebSocket.OPEN;
  },
};
