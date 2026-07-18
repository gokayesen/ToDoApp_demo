# Railway WS echo spike

Throwaway spike for Story 1.3 / Architecture §10 risk: confirm Railway's proxy
correctly upgrades WebSocket connections before Epic 5 depends on it.
Intentionally kept outside the pnpm workspace — not linted/typechecked as part
of the main build, not meant to be maintained long-term.

## Local test

```
npm install
npm start
```

Then from another terminal:

```
npx socket.io-client-tool 2>/dev/null || true
node -e "
const { io } = require('socket.io-client');
const s = io('http://localhost:4001');
s.on('connect', () => { console.log('connected'); s.emit('echo', 'hello'); });
s.on('echo', (msg) => { console.log('echoed back:', msg); process.exit(0); });
"
```

## Deploy to Railway

1. `railway login`
2. `railway init` (from this directory)
3. `railway up`
4. Point a Socket.IO client at the deployed URL (`wss://<service>.up.railway.app`)
   and confirm the same echo round-trip works over the public WS upgrade.

## Teardown

Delete the Railway service and this directory once the risk is confirmed
resolved — this spike has no further purpose after Epic 1.
