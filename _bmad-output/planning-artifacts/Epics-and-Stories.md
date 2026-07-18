# Epics & Stories

**Project:** ToDoApp_demo — Trello-style Collaborative Task Board
**Status:** Draft v0.3 — stories 1.2, 1.4, 1.5, 1.6, 2.1, 2.6, 3.6, 5.1, 6.1, 6.4, 6.6, 8.8 enriched per [Implementation-Readiness-Report.md](./Implementation-Readiness-Report.md); 2.6 further tightened during recheck
**Author:** BMAD Team (PM/Architect) with Gokayesen
**Date:** 2026-07-17
**Input:** [PRD.md](./PRD.md), [UX-Design.md](./UX-Design.md), [Architecture.md](./Architecture.md)
**Methodology:** BMAD-METHOD v6 — Phase 3 (Solutioning)

---

## How to read this document

Each story is sized (**S** = ~half day, **M** = ~1–2 days, **L** = ~3+ days, solo-dev estimate) and traces back to the PRD requirement(s) it satisfies. Stories within an epic are listed in build order; cross-epic dependencies are called out explicitly. Full implementation-ready story files (with file-level context) are generated one at a time during Sprint Planning/`bmad-create-story` — this document is the **scope and sequencing map**, not yet dev-ready detail.

**Sizing legend:** S · M · L
**Total:** 8 epics, 46 stories

---

## Epic 1 — Foundation & Auth

**Goal:** A deployed skeleton app with working registration, login (password + Google), and session handling — nothing product-specific yet, but every later epic builds on it.
**Depends on:** nothing (first epic)

| # | Story | Size | Maps to |
|---|---|---|---|
| 1.1 | Monorepo scaffold: pnpm workspaces + Turborepo, `apps/web` (Next.js), `apps/api` (Express), `packages/shared` (Zod), base ESLint/Prettier/TS config, GitHub Actions skeleton (lint+typecheck) | M | Architecture §2 |
| 1.2 | Postgres schema & Prisma setup: `User`, `OAuthAccount`, `RefreshToken`, `PasswordResetToken`, `Workspace`, `WorkspaceMember`, `Board`, `BoardMember` models (incl. `onDelete` cascade rules per Architecture §4) + first migration, local docker-compose for Postgres/Redis | M | Architecture §4 |
| 1.3 | Railway WebSocket proxy spike: minimal Socket.io echo server deployed to Railway, confirm WS upgrade works through the platform proxy before any real feature depends on it | S | Architecture §10 risk |
| 1.4 | Email/password registration & login: argon2 hashing, `POST /auth/register`, `POST /auth/login`/`POST /auth/refresh` implementing rotating-refresh-token reuse detection (Architecture §7.2) and Redis-backed rate limiting on `/auth/*` (Architecture §9), refresh cookie set per the cross-origin strategy in Architecture §7.1 | M | FR1, FR3, NFR3 |
| 1.5 | Google OAuth login: Passport Google strategy; account-linking rule per Architecture §7.3 — match an existing `User` by verified email before creating a new one, never duplicate | M | FR2 |
| 1.6 | Session persistence & refresh: silent token refresh (rotates the `RefreshToken` row per §7.2), logout endpoint (revokes the current token family), `authenticate` middleware | S | FR5 |
| 1.7 | Forgot/reset password: signed time-boxed token, Resend email delivery, reset form | M | FR3 |
| 1.8 | User profile: display name + avatar (upload or generated initials), `GET/PATCH /users/me` | S | FR4 |
| 1.9 | Auth screens UI (sign in/up/forgot password) per UX §4.5, shadcn/ui form components | M | UX §4.5 |

## Epic 2 — Workspaces & Boards

**Goal:** Users can create workspaces and boards, invite teammates, and manage membership/roles — the container structure everything else lives inside.
**Depends on:** Epic 1 (auth)

| # | Story | Size | Maps to |
|---|---|---|---|
| 2.1 | `requireRole` middleware + resource-context loader implementing the full effective-role resolution in Architecture §7.4 (Workspace Owner → implicit Board Admin, else explicit `BoardMember` row, else 403) — single RBAC choke point | M | NFR3, Architecture §7.4 |
| 2.2 | Create/list Workspaces, become Owner on creation | S | FR6 |
| 2.3 | Invite members to Workspace by email (creates pending invite; triggers registration flow if user doesn't exist) | M | FR7 |
| 2.4 | Create Board within a Workspace | S | FR8 |
| 2.5 | Invite/assign Board members with role (Admin/Member/Viewer) | M | FR9 |
| 2.6 | Change member role / remove member from Board, including the socket-eviction flow (Architecture §6): force-disconnect the affected user's active board connections and emit `board:access-revoked`; rejects attempts to remove/downgrade a Workspace Owner's implicit access (Architecture §7.4) with a clear 400 | M | FR10 |
| 2.7 | Archive & restore Board | S | FR11 |
| 2.8 | Permanently delete Board with confirmation step | S | FR12 |
| 2.9 | Board background customization (color or image) | S | FR13 |
| 2.10 | Dashboard UI: grid of boards grouped by workspace, recently-viewed row, empty-state CTA per UX §4.1 | M | FR39, UX §4.1 |
| 2.11 | App shell: top bar (workspace switcher, search stub, notification bell stub, user menu) + collapsible sidebar per UX §3 | M | UX §3 |

## Epic 3 — Lists & Cards Core

**Goal:** The Kanban mechanic itself — lists, cards, and drag-and-drop — working smoothly enough to demo on its own before rich content is layered on.
**Depends on:** Epic 2 (boards exist)

| # | Story | Size | Maps to |
|---|---|---|---|
| 3.1 | `List` CRUD: create, rename, delete; `Card` CRUD: create with title, delete | M | FR14, FR17 |
| 3.2 | Fractional-index position engine (shared service used by both List and Card ordering) | M | Architecture §4 ordering strategy, NFR8 |
| 3.3 | Board View UI: horizontal list layout, inline "+ Add list", per UX §4.2 | M | UX §4.2 |
| 3.4 | Inline quick-add card (textarea-in-place, Enter-to-add-next pattern) per UX §5 | S | UX §5 |
| 3.5 | Drag-and-drop List reordering (pointer + keyboard alternative) | M | FR15, NFR6 |
| 3.6 | Drag-and-drop Card reordering within a List and across Lists (pointer + keyboard alternative), optimistic update + rollback on failure; move endpoint takes `afterCardId`/`beforeCardId` intent with the server computing the final position (Architecture §4) — never a client-submitted position value; mobile uses the "Move to list…" fallback from UX §7 for cross-list moves | L | FR19, UX §5, §7, NFR6 |
| 3.7 | Archive/restore List (cascades to its Cards) | S | FR16 |
| 3.8 | Archive/restore Card; permanent delete Card | S | FR21, FR22 |
| 3.9 | Card face preview: labels, due-date pill, assignee avatars, checklist progress, comment/attachment counts (stubs until Epic 4 fills real data) | S | FR23 |
| 3.10 *(stretch)* | Cross-board card move | M | FR20 (out-of-scope candidate, PRD §8) |

## Epic 4 — Card Detail & Rich Content

**Goal:** The Card Detail view becomes the app's workhorse screen — everything a Trello power-user expects on a card.
**Depends on:** Epic 3 (cards exist)

| # | Story | Size | Maps to |
|---|---|---|---|
| 4.1 | Card Detail modal/drawer shell (responsive: modal desktop, sheet mobile) per UX §4.3 | M | UX §4.3 |
| 4.2 | Inline-editable title & markdown description | S | FR18 |
| 4.3 | Labels: per-board CRUD (name+color) + attach/remove on card, accessible color palette per UX §2 | M | FR24 |
| 4.4 | Due/start dates + overdue visual flag (color+icon, not color-only per NFR6) | S | FR25 |
| 4.5 | Assignees: add/remove Board Members on a card | S | FR26 |
| 4.6 | Checklists: create, add/check/reorder items, progress bar | M | FR27 |
| 4.7 | Comments with @mention autocomplete (scoped to Board Members) | M | FR28 |
| 4.8 | Attachments: presigned R2 upload, image thumbnail vs. file-link rendering, size-limit enforcement | M | FR29 |
| 4.9 | Card Activity Log: system-generated entries interleaved with comments | M | FR30 |

## Epic 5 — Real-Time Collaboration

**Goal:** The showcase differentiator — every action from Epics 2–4 becomes visibly, believably live for every teammate on the board. Sequenced early-ish per Architecture §10 risk note so it isn't compressed if timeline runs short.
**Depends on:** Epic 3 minimum (cards/lists to sync); ideally after Epic 4 so all event types exist, but the gateway itself (5.1–5.3) can start as soon as Epic 3 lands.

| # | Story | Size | Maps to |
|---|---|---|---|
| 5.1 | Socket.io gateway: handshake authentication via access token in the `auth` payload (Architecture §6), connection middleware verifying it before any event is accepted, `board:join`/`board:leave` with server-side role re-validation, Redis adapter wired in, client-side reconnect-on-token-refresh handling | L | Architecture §6 |
| 5.2 | Presence: Redis presence set per board room, `presence:update` broadcast, live avatar stack in board header | M | FR32, UX §6 |
| 5.3 | Broadcast pipeline: every List/Card mutation emits its event (`card:created/updated/moved/deleted`, `list:*`) to the board room after DB commit | L | FR31, Architecture §6 event catalog |
| 5.4 | Client-side live-update handling: merge incoming socket events into TanStack Query cache, animate card move + brief highlight fade per UX §6 | M | FR31, UX §6 |
| 5.5 | "Also viewing this card" indicator + live field updates inside an open Card Detail | M | UX §6 |
| 5.6 | Concurrent-edit conflict signal (version/`updatedAt` comparison, inline "just updated by X" notice) | M | FR33, UX §6 |
| 5.7 | Background-change toast for board sections currently out of view | S | UX §6 |

## Epic 6 — Notifications

**Goal:** Users learn about relevant activity without having to watch a board live.
**Depends on:** Epic 4 (assignment/comments exist), Epic 5 helpful but not required

| # | Story | Size | Maps to |
|---|---|---|---|
| 6.1 | `Notification` **and `NotificationPreference`** data models (Architecture §4) + `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `GET/PATCH /notifications/preferences` | M | FR34, FR35, FR36 |
| 6.2 | Notification Center UI: slide-over panel, grouped by day, unread state, click-through navigation per UX §4.4 | M | FR36, UX §4.4 |
| 6.3 | Notification triggers: assignment, @mention, added to board/workspace (fires on the relevant Epic 2/4 actions) | M | FR34 |
| 6.4 | Due-date reminder job: approaching/overdue sweep → notification + email, run as a single-instance cron service or behind a Redis leader-election lock (Architecture §9) so it never double-fires across scaled `api` instances | M | FR34, NFR5 |
| 6.5 | Transactional email via Resend + React Email templates for each notification type | M | FR35 |
| 6.6 | Per-event email preference settings screen, backed by the `NotificationPreference` table introduced in Story 6.1 | S | FR35 |

## Epic 7 — Search & Filtering

**Goal:** Boards stay usable once they have realistic amounts of content.
**Depends on:** Epic 4 (labels/assignees/due-dates exist to filter by)

| # | Story | Size | Maps to |
|---|---|---|---|
| 7.1 | Cross-board keyword search (`GET /search?q=`), scoped to boards the user can access | M | FR37 |
| 7.2 | Global search UI (top bar entry point, results grouped by board) | S | FR37 |
| 7.3 | Board-level filter popover: label / assignee / due-date range, dim/hide non-matching cards in place, active-filter badge + clear action | M | FR38, UX §4.2 |

## Epic 8 — Polish, Accessibility & Deployment

**Goal:** Turn a working app into a demoable, professional artifact — this epic is where the "portfolio quality" success metrics (PRD §10) actually get satisfied.
**Depends on:** all prior epics functionally complete (though CI/observability stories can and should start much earlier in practice)

| # | Story | Size | Maps to |
|---|---|---|---|
| 8.1 | CI pipeline: lint, typecheck, unit + integration tests gating PRs (pull earlier if possible — listed here for completeness) | S | NFR9 |
| 8.2 | Unit + integration test coverage pass across services/repositories (Vitest + Supertest) | L | NFR9 |
| 8.3 | Playwright E2E suite incl. a **two-browser-context real-time collaboration test** (User A moves a card, assert User B's DOM updates) | L | NFR9 |
| 8.4 | Accessibility audit & fixes: keyboard DnD verified end-to-end, focus states, contrast check on label/due-date colors (UX §8) | M | NFR6 |
| 8.5 | Performance pass: verify NFR1 (<200ms interaction, <300ms p95 API) and NFR2 (<1s real-time propagation) against realistic seeded data volume | M | NFR1, NFR2 |
| 8.6 | Observability: Sentry wired in both apps, pino structured logging in API | S | NFR10 |
| 8.7 | Production deployment: Vercel (web) + Railway (api/DB/Redis), environment separation, seeded demo workspace for reviewers | M | Architecture §9, PRD §10 |
| 8.8 | Account deletion flow implementing Architecture §4's cascade table: membership rows cascade-delete, authored Comments/Attachments are preserved with `userId` nulled + name snapshot retained, and deleting the last Workspace Owner requires an explicit ownership-transfer step first | M | FR40 |
| 8.9 | README + architecture summary for reviewers (links to this planning set) | S | PRD §10 success metric |

---

## Cross-Epic Sequencing Note

Recommended build order follows the table order (Epic 1 → 8), with two adjustments worth calling out at Sprint Planning:

- **Start Epic 5's gateway skeleton (5.1) right after Epic 3**, not after Epic 4 — the WebSocket infrastructure and Railway proxy behavior (Architecture §10 risk) is cheaper to de-risk early than to discover late.
- **Pull CI (8.1) and Observability (8.6) forward to Epic 1**, in parallel with scaffolding — they cost little then and pay for themselves across every subsequent epic. The table lists them under Epic 8 for completeness of the "polish" narrative, but they should not literally wait until the end.

## Next Steps (BMAD Flow)

1. **Implementation Readiness Check** (`bmad-check-implementation-readiness`) — verify PRD, UX, Architecture, and this Epics/Stories set are mutually consistent before committing to a sprint plan.
2. **Sprint Planning** (`bmad-sprint-planning`) — sequence these 46 stories into sprints/iterations.
3. **Create Story** (`bmad-create-story`) — generate the first dev-ready story file (Story 1.1) with full implementation context.

---
*This epic/story breakdown was produced via BMAD-coached discovery. Re-run `bmad-create-epics-and-stories` if PRD or Architecture scope changes materially.*
