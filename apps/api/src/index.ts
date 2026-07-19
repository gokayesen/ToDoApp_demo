import 'dotenv/config';
import { createServer } from 'http';

import { createApp } from './app.js';
import { createSocketGateway } from './sockets/gateway.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
// Socket.io shares the REST server's HTTP port/TLS termination (Architecture
// §9/§10 — this is also what the Story 1.3 Railway spike verified works
// through Railway's proxy), so the plain http.Server has to be created here
// rather than via app.listen(), which hides it.
const httpServer = createServer(app);
createSocketGateway(httpServer);

httpServer.listen(port, () => {
  console.log(`api listening on :${port}`);
});
