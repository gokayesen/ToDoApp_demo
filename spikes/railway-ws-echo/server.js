import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const port = Number(process.env.PORT ?? 4001);

const app = express();
app.get('/', (_req, res) => res.json({ status: 'ok', spike: 'railway-ws-echo' }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('echo', (msg) => {
    socket.emit('echo', msg);
  });
  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`ws echo spike listening on :${port}`);
});
