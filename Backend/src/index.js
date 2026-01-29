import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 3334;

app.use(cors({ origin: true }));
app.use(express.json());

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log('WebSocket client connected', wss.clients.size);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', at: Date.now() }));
        return;
      }
      if (msg.type === 'assessment_complete') {
        console.log('Assessment:', msg.payload?.stressLevel, msg.payload?.id);
      }
      for (const client of clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ type: 'broadcast', payload: msg }));
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected', wss.clients.size);
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'zengauge-backend', ws: 'ws://localhost:' + PORT + '/ws' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'ZEN GAUGE API' });
});

httpServer.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}/ws`);
});
