import { io as ioClient } from 'socket.io-client';

import { prisma } from '../lib/prisma.js';

// Story 8.5 (NFR1/NFR2): a "simple load test... included in the repo" (PRD
// §8 success metric) measuring the two concrete numbers those NFRs name:
//   NFR1 — API p95 < 300ms for standard CRUD endpoints, against the
//          "portfolio scale" volume seed-perf-data.ts just seeded.
//   NFR2 — real-time propagation < 1s (a REST mutation's socket broadcast
//          reaching a second, already-connected client).
// Client-side "< 200ms perceived latency" (open board / drag a card) isn't
// separately re-measured here: Architecture §4 already designs every
// List/Card write as an O(1) single-row transaction specifically to satisfy
// it, and the actual per-request cost of "open a board" / "drag a card" IS
// the API calls measured below (GET board+lists+cards / PATCH+move) — once
// those clear the API-side budget, the remaining client-side work is a
// TanStack Query cache write + React render, not measured here (no browser
// in this script; Story 8.3's Playwright suite already exercises the real UI
// paths this data would render through).
//
// Requires: apps/api's dev server running (pnpm --filter @todoapp/api dev)
// and seed-perf-data.ts already run against the same DATABASE_URL.

const API_BASE = process.env.PERF_API_BASE ?? 'http://localhost:4000';
const ITERATIONS = Number(process.env.PERF_ITERATIONS ?? 50);
const REALTIME_TRIALS = Number(process.env.PERF_REALTIME_TRIALS ?? 20);

interface Timing {
  label: string;
  samplesMs: number[];
}

function percentile(samples: number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function summarize(t: Timing) {
  const { samplesMs: s } = t;
  return {
    label: t.label,
    n: s.length,
    min: Math.min(...s).toFixed(1),
    p50: percentile(s, 50).toFixed(1),
    p95: percentile(s, 95).toFixed(1),
    p99: percentile(s, 99).toFixed(1),
    max: Math.max(...s).toFixed(1),
  };
}

async function timeRequest(label: string, timings: Timing[], fn: () => Promise<Response>) {
  const start = performance.now();
  const res = await fn();
  const elapsed = performance.now() - start;
  if (!res.ok) {
    throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
  }
  let timing = timings.find((t) => t.label === label);
  if (!timing) {
    timing = { label, samplesMs: [] };
    timings.push(timing);
  }
  timing.samplesMs.push(elapsed);
  return res;
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

async function main() {
  console.log(`Reading seeded perf data, warming up against ${API_BASE}...`);
  const board = await prisma.board.findFirstOrThrow({
    where: { workspace: { name: { startsWith: 'Perf Test Workspace' } } },
    include: { lists: { orderBy: { position: 'asc' }, take: 3 } },
  });
  const list = board.lists[0];
  if (!list) throw new Error('Seeded perf board has no Lists — run seed-perf-data.ts first');
  const cards = await prisma.card.findMany({
    where: { listId: list.id },
    orderBy: { position: 'asc' },
    take: 3,
  });
  const [cardA, cardB] = cards;
  if (!cardA || !cardB) throw new Error('Seeded perf list has fewer than 2 Cards — run seed-perf-data.ts first');

  const accessToken = await login('owner@perf-test.todoapp.local', 'PerfTest123!');
  const authHeaders = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

  const timings: Timing[] = [];

  console.log(`Running ${ITERATIONS} iterations per endpoint...`);
  for (let i = 0; i < ITERATIONS; i++) {
    await timeRequest('GET /workspaces', timings, () =>
      fetch(`${API_BASE}/workspaces`, { headers: authHeaders }),
    );
    await timeRequest('GET /boards/:id', timings, () =>
      fetch(`${API_BASE}/boards/${board.id}`, { headers: authHeaders }),
    );
    await timeRequest('GET /boards/:id/lists', timings, () =>
      fetch(`${API_BASE}/boards/${board.id}/lists`, { headers: authHeaders }),
    );
    // The heaviest read in the app: every Card in a List with its full
    // withRelations join (labels/assignees/checklists+items) — this is what
    // "open a board" actually costs server-side per List.
    for (const l of board.lists) {
      await timeRequest('GET /lists/:id/cards', timings, () =>
        fetch(`${API_BASE}/lists/${l.id}/cards`, { headers: authHeaders }),
      );
    }
    await timeRequest('PATCH /cards/:id', timings, () =>
      fetch(`${API_BASE}/cards/${cardA.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ title: `Card A (bench ${i})` }),
      }),
    );
    await timeRequest('POST /cards/:id/move', timings, () =>
      fetch(`${API_BASE}/cards/${cardA.id}/move`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ listId: list.id, afterCardId: null, beforeCardId: cardB.id }),
      }),
    );
    await timeRequest('GET /search', timings, () =>
      fetch(`${API_BASE}/search?q=Card`, { headers: authHeaders }),
    );
  }

  console.log('\n=== NFR1: API response times (ms) ===');
  console.table(timings.map(summarize));

  const worst = timings
    .map((t) => ({ label: t.label, p95: percentile(t.samplesMs, 95) }))
    .sort((a, b) => b.p95 - a.p95)[0]!;
  console.log(
    `Worst p95: ${worst.label} at ${worst.p95.toFixed(1)}ms — NFR1 target < 300ms: ${
      worst.p95 < 300 ? 'PASS' : 'FAIL'
    }`,
  );

  console.log(`\nRunning ${REALTIME_TRIALS} real-time propagation trials...`);
  const realtimeMs = await measureRealtimePropagation(accessToken, board.id, cardA.id, list.id, cardB.id);
  const rtTiming: Timing = { label: 'card:moved broadcast', samplesMs: realtimeMs };
  console.log('\n=== NFR2: real-time propagation latency (ms) ===');
  console.table([summarize(rtTiming)]);
  const rtP95 = percentile(realtimeMs, 95);
  console.log(`p95: ${rtP95.toFixed(1)}ms — NFR2 target < 1000ms: ${rtP95 < 1000 ? 'PASS' : 'FAIL'}`);
}

async function measureRealtimePropagation(
  accessToken: string,
  boardId: string,
  cardId: string,
  listId: string,
  neighborCardId: string,
): Promise<number[]> {
  const sender = ioClient(API_BASE, { auth: { token: accessToken } });
  const receiver = ioClient(API_BASE, { auth: { token: accessToken } });

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      sender.on('connect', () => sender.emit('board:join', boardId, (ack: { ok: boolean }) => (ack.ok ? resolve() : reject(new Error('sender join failed')))));
      sender.on('connect_error', reject);
    }),
    new Promise<void>((resolve, reject) => {
      receiver.on('connect', () => receiver.emit('board:join', boardId, (ack: { ok: boolean }) => (ack.ok ? resolve() : reject(new Error('receiver join failed')))));
      receiver.on('connect_error', reject);
    }),
  ]);

  const samples: number[] = [];
  let toggle = false;
  for (let i = 0; i < REALTIME_TRIALS; i++) {
    toggle = !toggle;
    const start = performance.now();
    const waitForBroadcast = new Promise<void>((resolve) => {
      receiver.once('card:moved', () => resolve());
    });
    const res = await fetch(`${API_BASE}/cards/${cardId}/move`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(
        toggle
          ? { listId, afterCardId: null, beforeCardId: neighborCardId }
          : { listId, afterCardId: neighborCardId, beforeCardId: null },
      ),
    });
    if (!res.ok) throw new Error(`move failed: ${res.status} ${await res.text()}`);
    await waitForBroadcast;
    samples.push(performance.now() - start);
  }

  sender.disconnect();
  receiver.disconnect();
  return samples;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
