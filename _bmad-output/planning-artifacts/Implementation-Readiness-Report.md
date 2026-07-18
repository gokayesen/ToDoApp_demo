# Implementation Readiness Report

**Project:** ToDoApp_demo — Trello-style Collaborative Task Board
**Status:** Findings — NOT yet clear for Sprint Planning (original check)
**Resolved:** 2026-07-17 — all 14 findings (C1, H1–H5, M1–M5, L1–L3) addressed in Architecture.md v0.2, PRD.md v0.2, UX-Design.md v0.2, and Epics-and-Stories.md v0.2. This report is kept as the historical record of what was found; see those documents for the current design. A fresh readiness pass should be run to confirm before Sprint Planning.
**Reviewed:** PRD.md, UX-Design.md, Architecture.md, Epics-and-Stories.md
**Date:** 2026-07-17
**Methodology:** BMAD-METHOD v6 — `bmad-check-implementation-readiness`

---

## Verdict

**1 Critical + 5 High + 5 Medium + 3 Low findings.** The planning set is strong overall — internally consistent on scope and sequencing — but there is one **Critical** defect that would break login/session persistence in production as currently specified, plus several **High** findings concentrated exactly where you asked me to look (Socket.IO auth, JWT/refresh flow, RBAC data model). Recommend resolving Critical + High items (updates to Architecture.md, minor PRD/UX clarifications) before Sprint Planning locks story 1.4–1.6 and 5.1 implementation details. None require re-scoping the PRD or re-doing the epic breakdown — these are architecture-precision gaps, not product-direction problems.

---

## CRITICAL

### C1 — Cross-origin refresh cookie will not survive the deployment topology as specified
**Where:** Architecture §7.1 (`SameSite=Lax` refresh cookie) vs. Architecture §9 (web on Vercel, api on Railway — two different eTLD+1 domains, no custom-domain unification mentioned).
**Why it's a problem:** `SameSite=Lax` cookies are **not sent on cross-site `fetch`/XHR requests** (only on top-level navigations, in most current browsers). Since `web` and `api` sit on different domains (`*.vercel.app` vs `*.up.railway.app`), every API call from the frontend — including the token-refresh call itself — will silently fail to attach the refresh cookie. This isn't a performance/edge-case issue; it breaks Epic 1 Story 1.4/1.6 (login + session persistence) outright, and by extension every other epic since nothing works without auth.
**Recommended fix (pick one):**
1. **Preferred:** put `web` and `api` under one apex domain as subdomains (e.g., `app.yourdomain.com` + `api.yourdomain.com`). This also sidesteps Safari/iOS ITP third-party-cookie restrictions that would otherwise bite a cross-site cookie even with `SameSite=None`. Requires owning a domain — cheap, and reads as more "production-grade" for the portfolio anyway.
2. **Fallback (no custom domain):** change the cookie to `SameSite=None; Secure`, and configure CORS on the API with `credentials: true` and an explicit (non-wildcard) `Access-Control-Allow-Origin` matching the Vercel URL. Accept residual Safari ITP risk as a documented limitation.
Add this decision explicitly to Architecture §9.

---

## HIGH

### H1 — Refresh token rotation has no persistence layer
**Where:** Architecture §2/§7 describes a "rotating refresh token," but the §4 ER diagram has no table for it.
**Why it's a problem:** Rotation without server-side state can't detect reuse (a stolen refresh token being replayed after the legitimate client already rotated it) — which is the entire security benefit of rotation over a plain long-lived refresh token. As specified, "rotating" is just an unenforceable label.
**Recommended fix:** Add a `RefreshToken` table (`id`, `userId` FK, `tokenHash`, `familyId`, `expiresAt`, `revokedAt`) to §4. On refresh, verify hash + not-revoked, issue a new token in the same family, revoke the old one; if a revoked/already-used token is presented, revoke the entire family and force re-login (standard reuse-detection pattern).

### H2 — Socket.IO handshake authentication is unspecified
**Where:** Architecture §6 and Epics Story 5.1 both describe room-join role re-validation, but neither states **how the socket knows who the user is** in the first place.
**Why it's a problem:** This is the actual crux of "secure real-time," not a footnote — `board:join` re-validating a `BoardMember` role is meaningless if there's no authenticated `userId` to check it against. It's also entangled with C1: if the access token lives only in memory (typical SPA pattern) and the refresh token is cookie-only, the Socket.IO handshake needs its own explicit token-passing mechanism (Socket.IO doesn't automatically forward `Authorization` headers).
**Recommended fix:** Specify in §6/§7: client sends the short-lived access token in the Socket.IO `auth` payload on connect (`io(url, { auth: { token } })`); server verifies it in a connection middleware before allowing any `board:join`. Document how the client refreshes and reconnects the socket when the access token expires mid-session.

### H3 — Removed/downgraded Board members keep receiving live updates on an already-open socket
**Where:** Architecture §6 (role re-validated only "on room join") vs. Epics Story 2.6 (remove member / change role).
**Why it's a problem:** Role is checked once, at join time. If a Board Admin removes a Member while that Member is actively connected, Socket.IO won't automatically evict them from the room — they keep receiving `card:*`/`comment:*` events for a board they no longer have access to. This is a real data-exposure gap, not a cosmetic one.
**Recommended fix:** Have the member-removal/role-downgrade service (Story 2.6) look up that user's active socket connection(s) for the board (trackable via the Redis presence set already planned in §6) and force `socket.leave(room)` / disconnect, emitting a `board:access-revoked` event the client handles by redirecting away.

### H4 — Workspace Owner's implicit board access conflicts with the RBAC enforcement mechanism
**Where:** PRD §5 states Workspace Owner "can do everything an Admin can," but Architecture §5/§7.3's `requireRole` chain only checks explicit `BoardMember` rows — there's no described bypass for Owners who were never added to a specific Board.
**Why it's a problem:** Taken literally, a Workspace Owner who creates a Workspace but isn't explicitly added as a `BoardMember` on a Board within it (e.g., a board another member created) would be blocked by `requireRole` despite the PRD promising them Admin-level power everywhere in their workspace. This is a genuine spec conflict, and it's exactly the kind of thing that's cheap to fix now and expensive to discover mid-implementation.
**Recommended fix:** Pick one explicitly and update both docs to match:
- (a) Workspace Owner gets **automatic implicit Admin** on every Board in their Workspace (simplest; `requireRole` checks `WorkspaceMember.role === OWNER` as a short-circuit before the `BoardMember` lookup), or
- (b) Workspace Owner has **no implicit board access** — PRD §5 wording is corrected to "can manage workspace-level settings and membership" only, and Board access is always opt-in via explicit `BoardMember` rows.
(a) matches most real Trello-like products' mental model and is recommended.

### H5 — Google OAuth account-linking-by-email is unaddressed
**Where:** Architecture §7.2: "on first login, creates a `User` + linked `OAuthAccount`."
**Why it's a problem:** If a user already registered via email/password with `alice@example.com`, then later clicks "Continue with Google" using the same Google account (same email), the spec as written would either create a **duplicate** `User` row (breaking every FK relationship keyed on the "real" user) or — if naively matched by email without checking Google's `email_verified` claim — open an account-takeover vector (anyone who controls an email address could link/hijack an existing account).
**Recommended fix:** On Google login, look up by `email` only if Google reports `email_verified: true`; if a `User` with that email already exists and has no linked `OAuthAccount` for this provider, link the new `OAuthAccount` to the existing `User` (don't create a duplicate). Document this explicitly in §7.

---

## MEDIUM

### M1 — Fractional-index position: client-computed or server-computed?
**Where:** Architecture §4 ordering strategy describes the midpoint formula but not *where* it executes.
**Why it's a problem:** NFR8 promises "no duplicate/lost cards" under concurrent moves. If the client computes `position = (prev+next)/2` from its own (possibly stale) view of neighboring cards and submits that float, two concurrent drags into the same gap can compute the same or overlapping values, or worse, calculate against neighbors that have already moved. This is only safe if the *server* recalculates the position from the current DB state inside the same transaction as the write, using the client-submitted request only as "put this card after card X" (an intent), not as a precomputed float.
**Recommended fix:** Clarify in §4/§6: the move endpoint accepts a target-neighbor reference (e.g., `afterCardId`/`beforeCardId`), and the server computes the float position from live neighbor rows inside the transaction — never trusts a client-supplied position value directly.

### M2 — `NotificationPreference` data referenced by requirements but absent from the data model
**Where:** PRD FR35 ("user-configurable per-event email preferences") and Epics Story 6.6 both require persisted preferences; Architecture §4 ER diagram has no such table.
**Recommended fix:** Add a `NotificationPreference` table (`userId`, `eventType`, `emailEnabled`, `inAppEnabled`) to §4, and note it under Epic 6 in the Epics doc so Story 6.1 scopes it correctly instead of Story 6.6 discovering the gap mid-sprint.

### M3 — Background jobs will double-fire once the API scales horizontally
**Where:** Architecture §5 lists `jobs/` (due-date sweep, position rebalance) running in the same process as the API; §8 claims NFR5 horizontal scalability via "stateless API processes."
**Why it's a problem:** An in-process cron/scheduler runs on *every* instance. The moment there are 2+ API instances (the exact scenario NFR5 is designed for), the due-date reminder sweep fires twice, sending duplicate emails to users — directly undermining the NFR5 claim it sits next to.
**Recommended fix:** Either (a) run scheduled jobs as a separate, singleton Railway service/cron trigger rather than in the API process, or (b) use a distributed lock (Redis `SETNX`-based leader election) so only one instance executes a given scheduled run. Document the choice in §5/§9.

### M4 — `express-rate-limit` default store doesn't work correctly across multiple instances
**Where:** Architecture §8 (NFR3 row) cites `express-rate-limit` on `/auth/*`.
**Why it's a problem:** Same root cause as M3 — the default in-memory store is per-process. With N horizontally scaled instances, an attacker effectively gets N× the intended rate limit, silently weakening the brute-force protection NFR3 is claiming.
**Recommended fix:** Use a Redis-backed store (`rate-limit-redis`) — Redis is already in the stack for the Socket.IO adapter and presence, so this is a small addition, not a new dependency.

### M5 — No cascade/referential-integrity strategy specified, most acute at account deletion
**Where:** Architecture §4 (no `onDelete` behavior noted on any FK) vs. PRD FR40 (account deletion "anonymizes/removes personal data").
**Why it's a problem:** A naive `onDelete: Cascade` from `User` would delete every Card/Comment/Board a user *created*, even on boards shared with teammates who still need that data — i.e., deleting your own account could destroy your teammates' shared board content. Conversely, `onDelete: Restrict` everywhere would make account deletion impossible while any content exists.
**Recommended fix:** Specify per-relation in §4: membership rows (`WorkspaceMember`, `BoardMember`, `CardAssignee`) cascade-delete on user deletion; authored content (`Card.creatorId` if tracked, `Comment.userId`, `Attachment.uploaderId`) is preserved with the FK set to a reserved "deleted user" placeholder or nulled with a denormalized `authorNameSnapshot`, not cascade-deleted. Call this out explicitly as part of Story 8.8 (Account deletion).

---

## LOW

### L1 — Cloudflare R2 bucket CORS policy not mentioned
Direct-to-R2 browser uploads (Architecture §3 diagram) require an explicit CORS policy on the bucket allowing the web app's origin; not called out in §9 deployment notes. Add one line to §9.

### L2 — Password reset token needs a used/invalidation mechanism too
Architecture §7.4 calls the reset token "single-use," but if it's a bare signed JWT with no server-side record, nothing actually enforces single-use (a captured link could be replayed until expiry). Same fix pattern as H1: store a hash + `usedAt` for reset tokens, or fold them into the same token-tracking table as H1.

### L3 — Mobile drag-and-drop across lists isn't reconciled with the one-list-at-a-time mobile layout
UX §7 shows mobile as one List visible at a time (swipe/tab between lists) but also claims touch drag-and-drop "still supported" — without saying how a user drags a card into a List that isn't currently on screen. Recommend an explicit mobile fallback: a "Move to list…" action/menu in the Card Detail sheet instead of relying on cross-screen drag on mobile. Add to UX §5/§7 and reference from Epics Story 3.6.

---

## What does NOT need to change

- Epic sequencing and sizing (Epics-and-Stories.md) — sound as-is; none of the above findings require re-sequencing, only enriching stories 1.4, 1.6, 2.6, 3.6, 5.1, 6.1, 6.6, 8.8 with the details above when they're turned into dev-ready story files.
- PRD functional scope (§6) — no missing/conflicting FRs found beyond the §5 role-scope wording in H4.
- Overall tech stack choices (§2) — all sound; findings are about *specifying the mechanism*, not *changing the choice*.

## Recommended Next Step (original)

Not ready to declare Sprint Planning clear yet. Suggest: I apply the fixes above directly to **Architecture.md** (§4 data model additions, §6/§7 auth + socket-auth specification, §9 deployment/domain decision) and make the two small **PRD.md** (§5 wording) / **UX-Design.md** (§5/§7 mobile fallback) edits, then we re-run this check once — that should clear everything except residual, acceptable risk (Safari ITP note under C1's fallback path, if you choose that route over a custom domain). Want me to go ahead and apply these updates to the four documents?

---

# Recheck (Pass 2)

**Date:** 2026-07-17
**Reviewed:** PRD.md v0.2, UX-Design.md v0.2, Architecture.md v0.2, Epics-and-Stories.md v0.2 (the versions produced after Pass 1's fixes)
**Method:** Re-read all four documents in full against each of the 14 Pass-1 findings individually, then did a fresh cross-document consistency pass looking specifically for anything the Pass-1 fixes might have newly introduced or left half-addressed.

## Pass-1 findings: verification

All 14 (C1, H1–H5, M1–M5, L1–L3) confirmed **present and correctly cross-referenced** in the v0.2 documents — checked each one against the actual section it claims to live in, not just the changelog note. No regressions found; the RBAC fix (H4) in particular was correctly threaded through into the Socket.IO room-join logic (§6 now says "effective BoardMember role... per §7.4" rather than a literal row lookup), which is exactly the kind of place a partial fix tends to get missed.

## New findings from Pass 2

Re-reading with fresh eyes (not just checking off the Pass-1 list) surfaced three small items the first pass didn't catch — all now fixed in Architecture.md v0.3 / Epics-and-Stories.md v0.3:

### N1 (Medium) — `ActivityLog.userId` had no cascade behavior specified
The Pass-1 cascade table (M5) covered `Comment.userId` and `Attachment.uploaderId` but not `ActivityLog.userId`. Since almost every board action writes an ActivityLog row, an unspecified (implicitly `Restrict`) FK would make **Story 8.8 account deletion fail for virtually every real user** — the exact bug class M5 was meant to close, just missed on one table. **Fixed:** `ActivityLog.userId` added to the same `SetNull` + name-snapshot rule (Architecture §4).

### N2 (Low) — `jobs/` folder placement read as contradicting the §9 execution strategy
Architecture §5 showed `jobs/` as a plain subfolder of `apps/api/src`, which could be read as "runs in the same long-lived process" — at odds with §9's "separate cron service or leader-locked" requirement (M3's fix). **Fixed:** one-line clarification added under the §5 layout that `jobs/` holds logic only; the execution model is governed by §9.

### N3 (Low) — Removing a Workspace Owner from a Board was an unhandled edge case
H4's fix made Workspace Owner access to a Board **implicit** (derived from `WorkspaceMember.role`, no `BoardMember` row). That means Story 2.6's "remove member from Board" endpoint had no defined behavior when targeting an Owner — silently no-op, error on a missing row, or something else was left to the implementer to guess. **Fixed:** Architecture §7.4 now explicitly requires the endpoint to reject that case with a clear `400`; Epics Story 2.6 updated to reflect it.

None of these are new product-direction issues — they're the kind of second-order gap that a fix for one finding (H4, M5, M3) can quietly open elsewhere, which is exactly what a recheck pass is for.

## Verdict (Pass 2)

**0 Critical, 0 High, 1 Medium (fixed), 2 Low (fixed) — all closed in Architecture.md v0.3 and Epics-and-Stories.md v0.3.**

**Clear for Sprint Planning.** PRD.md v0.2 and UX-Design.md v0.2 required no further changes in this pass. Remaining items are the two already-accepted residual risks noted in Pass 1 (Safari ITP under the v1 cross-origin cookie default; the Workspace-ownership-transfer UX flow itself still needs a UX pass within Story 8.8's scope — that's implementation work for that story, not a planning gap).

---

# Independent Verification (Pass 3)

**Date:** 2026-07-18
**Reviewed:** PRD.md v0.2, UX-Design.md v0.2, Architecture.md v0.3, Epics-and-Stories.md v0.3
**Method:** Fresh independent read of all four current documents against each of the 17 findings (C1, H1–H5, M1–M5, L1–L3, N1–N3) individually, checking actual section text rather than relying on the changelog headers, plus a new cross-document consistency pass looking for anything the Pass 1/2 fixes might have missed.

## Result

All 17 findings confirmed resolved and correctly cross-referenced in the current documents. No new Critical or High findings surfaced. Cross-document agreement checked specifically for the Owner-access model (PRD §5 ↔ Architecture §7.4 ↔ Epics Story 2.6) since that was the area with the most edit-touchpoints across passes — all three agree, including the N3 edge case.

## Non-blocking items carried forward (not readiness gaps — pre-existing, self-flagged in the docs)

- PRD §9 assumptions #1, #2, #4 (team size, hosting budget, target demo date) are explicitly marked "Confirm" and "should be revisited before Sprint Planning" by the PRD itself — worth a quick confirmation from the user now, not a document defect.
- PRD §9 assumption #3 — attachment size cap assumed at 10MB/file, not yet confirmed; Epics Story 4.8 doesn't hardcode a number, which is correct given the cap is still open.
- Architecture §10 risk table — Workspace-ownership-transfer UX not yet designed; already scoped as in-story UX work for Story 8.8, not a planning-phase blocker.

## Verdict

**Clear for Sprint Planning.** No critical or high-severity blockers remain across PRD, UX, Architecture, or Epics & Stories.
