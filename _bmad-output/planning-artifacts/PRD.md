# Product Requirements Document (PRD)

**Project:** ToDoApp_demo — Trello-style Collaborative Task Board
**Status:** Draft v0.2 — §5 role wording clarified per [Implementation-Readiness-Report.md](./Implementation-Readiness-Report.md) finding H4
**Author:** John (BMAD PM Agent) with Gokayesen
**Date:** 2026-07-17
**Methodology:** BMAD-METHOD v6 — Phase 2 (Planning)

---

## 1. Description

A professional, full-stack, Trello-style collaborative task management web application. Users organize work into **Workspaces → Boards → Lists → Cards**, collaborate in real time with teammates, and track progress through labels, due dates, assignees, checklists, comments, and attachments. The product is built as a portfolio-grade showcase of full-stack engineering skill (clean architecture, real-time systems, auth, testing, deployment) while remaining a genuinely usable collaboration tool.

## 2. Deployment Intent & Project Classification

| Attribute | Value |
|---|---|
| Intent | Portfolio / showcase project — built and presented as production-quality work, not aimed at organic user growth or monetization |
| Project type | Greenfield |
| Complexity level | Level 3 — multi-epic product with real-time, multi-user collaboration, auth, and a rich domain model |
| Primary platform | Responsive web application (desktop + mobile browser) |
| Team | Solo developer (assumption — see §9 Open Questions) |

**Implication for scope:** because this is a showcase project, requirements favor **demonstrable engineering depth** (real-time sync, permissions, testing, clean API design) over breadth of secondary features (no billing, no enterprise SSO, no native mobile apps in v1).

## 3. Goals

1. Deliver a Trello-equivalent core experience: boards, lists, cards, drag-and-drop, labels, due dates, assignees — polished enough to demo confidently to a technical audience (employers, clients, peers).
2. Demonstrate real-time multi-user collaboration (WebSocket-based live sync + presence) as the product's technical centerpiece.
3. Demonstrate a secure, professional-grade auth and permissions model (email/password + Google OAuth, board-level roles).
4. Ship a codebase and architecture that reads as production-quality: tested, documented, deployable, observable.

## 4. Background Context

Task boards (Trello, Linear, Asana, Jira) are one of the most universally understood SaaS product categories, which makes them an effective vehicle for a portfolio project — reviewers immediately grasp the domain and can judge execution quality rather than spending effort understanding the concept. The differentiator for this build is not novel product features but **engineering craft**: real-time collaboration, permission modeling, and UX polish are the areas where a clone can visibly separate "tutorial project" from "professional work."

## 5. Users & Roles

| Role | Scope | Description |
|---|---|---|
| **Workspace Owner** | Workspace | Creates the workspace, manages billing-free settings, manages members; **automatically has Board Admin-level permissions on every Board within their Workspace**, even without being explicitly added as a Board member (see Architecture §7.4 for the server-side enforcement mechanism) |
| **Board Admin** | Board | Full control of a specific board: manage members, lists, cards, board settings, archive/delete board |
| **Board Member** | Board | Create/edit/move cards and lists, comment, upload attachments, cannot delete the board or remove other members |
| **Board Viewer** | Board | Read-only access: can view cards, comments, activity — cannot edit |
| **Guest (unauthenticated)** | None | No access; all board content requires authentication in v1 (public share links are out of scope, see §8) |

## 6. Functional Requirements

### 6.1 Authentication & Account
- **FR1**: Users can register with email + password.
- **FR2**: Users can sign in via Google OAuth.
- **FR3**: Users can log in, log out, and reset a forgotten password via emailed link.
- **FR4**: Users have a profile with display name and avatar (uploaded image or generated initials).
- **FR5**: Sessions are securely persisted (e.g., HTTP-only cookies or refresh-token rotation) and survive browser restarts until explicit logout or expiry.

### 6.2 Workspaces & Boards
- **FR6**: Users can create a Workspace and become its Owner.
- **FR7**: Workspace Owners can invite members to the workspace by email.
- **FR8**: Users can create Boards within a Workspace.
- **FR9**: Board creators/Admins can invite existing users (or by email, triggering registration) to a Board and assign them a role (Admin / Member / Viewer).
- **FR10**: Board Admins can change a member's role or remove a member from a Board.
- **FR11**: Users can archive and restore a Board.
- **FR12**: Users can permanently delete a Board (Owner/Admin only), with a confirmation step.
- **FR13**: Boards support a custom background (color or image).

### 6.3 Lists
- **FR14**: Board members can create, rename, and delete Lists within a Board.
- **FR15**: Board members can reorder Lists via drag-and-drop.
- **FR16**: Board members can archive a List (and all its cards) without permanently deleting it.

### 6.4 Cards
- **FR17**: Board members can create Cards within a List, with a title.
- **FR18**: Board members can edit a Card's title and a rich-text/markdown description.
- **FR19**: Board members can drag-and-drop Cards to reorder within a List or move between Lists.
- **FR20**: Board members can drag-and-drop Cards between different Boards they belong to (stretch — see §8 if descoped).
- **FR21**: Board members can archive and restore Cards.
- **FR22**: Board members can permanently delete Cards.
- **FR23**: Cards display a compact preview on the board: title, labels, due date, assignee avatars, checklist progress, comment/attachment counts.

### 6.5 Card Detail — Rich Content
- **FR24**: Users can create custom Labels (name + color) per Board and attach/remove multiple Labels per Card.
- **FR25**: Users can set a due date (and optional start date) on a Card; overdue cards are visually flagged.
- **FR26**: Users can assign one or more Board Members to a Card.
- **FR27**: Users can add one or more Checklists per Card, each with checkable items and a visible completion count.
- **FR28**: Users can add Comments to a Card, including @mentioning other Board Members.
- **FR29**: Users can upload file Attachments to a Card (images previewed inline; other types shown as downloadable links) with a per-file size limit.
- **FR30**: Every Card maintains an Activity Log (who did what, when) covering moves, edits, comments, and membership changes.

### 6.6 Real-Time Collaboration
- **FR31**: Changes made by one user (card move, edit, comment, new list, etc.) are reflected live in the UI of all other users currently viewing the same Board, without a manual refresh.
- **FR32**: The Board shows presence indicators for teammates currently viewing/active on that Board.
- **FR33**: Concurrent edits are handled gracefully (e.g., last-write-wins with activity-log visibility, or field-level locking indicators) — no silent data loss.

### 6.7 Notifications
- **FR34**: Users receive an in-app notification when: assigned to a card, mentioned in a comment, a due date they're assigned to is approaching/overdue, or added to a Board/Workspace.
- **FR35**: The same notification events also trigger a transactional email, subject to user-configurable per-event email preferences.
- **FR36**: Users can view a Notification Center with read/unread state and mark-all-as-read.

### 6.8 Search & Filtering
- **FR37**: Users can search Cards by title/description keyword across all Boards they have access to.
- **FR38**: Within a Board, users can filter visible Cards by Label, Assignee, and Due Date range.

### 6.9 Account/Data Management
- **FR39**: Users can view all Workspaces/Boards they belong to from a central dashboard.
- **FR40**: Users can delete their own account, which anonymizes/removes their personal data per applicable retention rules.

## 7. Non-Functional Requirements

- **NFR1 — Performance:** Core board interactions (open board, drag a card) render in **< 200 ms** perceived latency on a broadband connection; API p95 response time **< 300 ms** for standard CRUD endpoints.
- **NFR2 — Real-time latency:** Live updates propagate to other connected clients within **< 1 second** under normal load.
- **NFR3 — Security:** Passwords hashed with a modern algorithm (bcrypt/argon2); all traffic over HTTPS; OWASP Top 10 mitigations (input validation, auth checks on every mutating endpoint, rate limiting on auth endpoints); role/permission checks enforced server-side, never trusted from the client.
- **NFR4 — Availability:** Target **99% uptime** for the demo deployment (portfolio-appropriate, not enterprise SLA).
- **NFR5 — Scalability:** Architecture supports horizontal scaling of the API/WebSocket layer (e.g., stateless services + shared pub/sub for WebSocket fan-out) even if v1 is deployed on a single instance.
- **NFR6 — Accessibility:** WCAG 2.1 AA for core flows (keyboard navigation for drag-and-drop alternative, sufficient color contrast, screen-reader-friendly labels).
- **NFR7 — Browser support:** Latest two versions of Chrome, Firefox, Safari, Edge on desktop and mobile.
- **NFR8 — Data integrity:** Card/List reordering and moves are atomic and consistent even with concurrent multi-user activity (no duplicate/lost cards).
- **NFR9 — Test coverage:** Automated test suite (unit + integration + at least one E2E collaboration flow) covering critical paths (auth, board CRUD, card move, real-time sync), enforced in CI.
- **NFR10 — Observability:** Centralized logging and basic error tracking (e.g., Sentry-equivalent) in the deployed environment.

## 8. Out of Scope for v1

Explicitly excluded to keep the showcase focused and shippable:

- Billing/payments and paid tiers
- Public, unauthenticated share links for boards/cards
- Native mobile apps (iOS/Android) — responsive web only
- Enterprise SSO/SAML, SCIM provisioning
- Third-party integrations (Slack, GitHub, Google Calendar, Zapier, etc.)
- Calendar, timeline/Gantt, or table board views (single Kanban view only in v1)
- Offline-first / full PWA background sync (may revisit as a stretch goal)
- Cross-board card drag-and-drop (FR20) — candidate for descope if timeline is tight; flagged as stretch
- Data export/import (CSV, Trello import)
- Admin/analytics dashboard

## 9. Assumptions & Open Questions

| # | Item | Assumption Made | Needs Confirmation? |
|---|---|---|---|
| 1 | Team size | Solo developer building this project | Confirm — affects timeline/sprint planning, not requirements |
| 2 | Hosting budget | Low/no-cost tier hosting (e.g., free-tier PaaS + managed Postgres) | Confirm before Architecture phase |
| 3 | Attachment storage | Requires object storage (e.g., S3-compatible); file size cap TBD (assumed 10MB/file) | Confirm limit |
| 4 | Timeline | No fixed deadline stated | Confirm if there's a target demo date |
| 5 | Workspace model | One user can belong to multiple Workspaces; one Workspace can have multiple Boards | Confirmed via collaboration model answer — validate during Architecture |

These do not block Architecture but should be revisited before Sprint Planning.

## 10. Success Metrics

Since this is a portfolio project rather than a growth product, success is measured by **demonstrable engineering quality**, not usage metrics:

- All Functional Requirements in §6 implemented and demoable end-to-end.
- NFR1/NFR2 performance targets met and measurable (e.g., via a simple load test or Lighthouse/API benchmark included in the repo).
- CI pipeline green with meaningful automated test coverage (NFR9).
- A live, publicly accessible deployed instance with a seeded demo workspace for reviewers.
- Clean, documented architecture (README + architecture doc) that a technical reviewer can understand in under 10 minutes.

## 11. Proposed Epic Breakdown (high-level — to be refined after Architecture)

1. **Epic 1 — Foundation & Auth**: project scaffolding, CI, email+password auth, Google OAuth, profile management.
2. **Epic 2 — Workspaces & Boards**: workspace/board CRUD, membership, invitations, roles/permissions enforcement.
3. **Epic 3 — Lists & Cards Core**: list/card CRUD, drag-and-drop reordering and moves, archiving.
4. **Epic 4 — Card Detail & Rich Content**: labels, due dates, assignees, checklists, comments, attachments, activity log.
5. **Epic 5 — Real-Time Collaboration**: WebSocket sync layer, live board updates, presence indicators, concurrent-edit handling.
6. **Epic 6 — Notifications**: in-app notification center + transactional email, per-event preferences.
7. **Epic 7 — Search & Filtering**: cross-board search, board-level filters.
8. **Epic 8 — Polish, Accessibility & Deployment**: accessibility pass, performance tuning, observability, production deployment, seeded demo data.

*(Detailed user stories per epic will be produced by the `bmad-create-epics-and-stories` workflow after Architecture is defined, per BMAD phase sequencing.)*

## 12. Next Steps (BMAD Flow)

1. **UX** (`bmad-ux`, optional but recommended given UI-heavy scope) — define UX patterns/design spec for board, card detail, and real-time indicators.
2. **Architecture** (`bmad-architecture`) — lock the technical spine: stack choice, real-time transport (WebSocket vs SSE), data model, permission enforcement layer, deployment target.
3. **Epics & Stories** (`bmad-create-epics-and-stories`) — break §11 into implementable stories.
4. **Implementation Readiness Check** → **Sprint Planning** → story-by-story development.

---
*This PRD was produced via BMAD-coached discovery. Revisit and update via the `bmad-prd` update workflow whenever scope assumptions in §9 change.*
