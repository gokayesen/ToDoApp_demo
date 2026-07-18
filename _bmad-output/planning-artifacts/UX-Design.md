# UX Design Specification

**Project:** ToDoApp_demo — Trello-style Collaborative Task Board
**Status:** Draft v0.2 — mobile cross-list move and access-revoked handling clarified per [Implementation-Readiness-Report.md](./Implementation-Readiness-Report.md) findings H3, L3
**Author:** Sally (BMAD UX Agent) with Gokayesen
**Date:** 2026-07-17
**Input:** [PRD.md](./PRD.md)
**Methodology:** BMAD-METHOD v6 — Phase 2 (Planning)

---

## 1. UX Vision & Principles

The product should feel **immediately familiar** to anyone who has used Trello, so reviewers spend zero time learning the interface and all their attention on execution quality. On top of that familiar shell, real-time collaboration is the feature that must **visibly differentiate** this build from a static CRUD clone — presence and live updates should be impossible to miss during a demo.

Guiding principles:

1. **Zero learning curve** — standard Kanban conventions (columns, cards, drag-and-drop) exactly where users expect them.
2. **Collaboration is visible, not silent** — every multi-user action produces a perceivable, tasteful UI signal (avatar, highlight, toast).
3. **Fast first, rich second** — the board view stays lightweight and snappy; heavy content (attachments, long comment threads) lives behind the Card Detail modal, not on the board face.
4. **Inline editing everywhere reasonable** — titles, descriptions, checklist items editable in place; minimize modal-within-modal navigation.
5. **Accessible by default** — every drag-and-drop interaction has a keyboard/non-pointer equivalent (NFR6 in the PRD).

## 2. Visual Direction

- **Style:** Trello-adjacent — light, card-based, generous whitespace, customizable board background (solid color or photo), rounded corners, subtle shadows on cards.
- **Component foundation:** shadcn/ui (Radix primitives + Tailwind) as the base, themed with a custom palette rather than left default — gives accessible, well-tested interaction primitives (dialog, dropdown, popover, toast, avatar, tooltip) while still looking bespoke.
- **Color system:**
  - Neutral UI chrome (sidebar, top bar, list containers) in a light neutral gray scale, with a dark-mode variant (stretch, see §8).
  - Accent/brand color for primary actions and active states — one confident accent, not Trello's multicolor board-background default, to keep the shell feeling like its own product.
  - Label colors: a fixed palette of 8–10 accessible, distinguishable swatches (WCAG-checked contrast for text-on-color and color-on-white).
  - Semantic colors: red/amber/green reserved exclusively for due-date status (overdue / due soon / on track) and destructive actions — not reused elsewhere, so their meaning stays unambiguous.
- **Typography:** one clean sans-serif (e.g., Inter), 2–3 weights max, clear type scale (board/list titles, card titles, body, meta/timestamp text).

## 3. Information Architecture

```
App Shell
├── Top Bar: workspace switcher, global search, notification bell, user menu
├── Sidebar (collapsible)
│   ├── Workspace list
│   ├── Boards within active workspace ("starred" boards pinned to top)
│   └── + Create Board / + Create Workspace
├── Dashboard (default landing route)
│   └── Grid of Board cards (recent + all), grouped by Workspace
├── Board View  ← primary screen, most time spent here
│   ├── Board header: title, member avatars, filter, board menu
│   └── Lists (horizontal scroll) → Cards (vertical, draggable)
│       └── Card Detail (modal/drawer, opened from any card)
├── Notification Center (panel, opened from bell icon)
└── Auth screens: Sign in / Sign up / Forgot password (outside app shell)
```

Navigation depth is intentionally shallow: **Dashboard → Board → Card** is the entire core path, reachable in at most 2 clicks from anywhere via the sidebar.

## 4. Key Screens

### 4.1 Dashboard
- Grid of board thumbnails (background color/image visible), grouped by Workspace, "Recently viewed" row at top.
- Empty state for first-time users: prominent "Create your first board" CTA with 2–3 starter templates (e.g., "Simple Kanban", "Sprint Board") to make the demo feel guided.

### 4.2 Board View
- Horizontal-scrolling list of Lists; each List is a vertical column with a header (name, card count, "+ Add card" at bottom, "⋯" menu for archive/delete).
- Cards show: title, label chips (color swatches, no text by default — text on hover/expand), due-date pill (color-coded by status), assignee avatar stack (max 3 shown + overflow count), small icon row for checklist progress ("3/5"), comment count, attachment count.
- Board header right side: **avatar stack of members currently viewing the board** (live presence — see §6), filter icon opening a filter popover (label/assignee/due-date), board menu ("⋯") for settings/background/archive.
- "+ Add list" affordance at the end of the list row.

### 4.3 Card Detail (modal/drawer)
Opens as a centered modal on desktop, full-screen sheet on mobile. Sections top-to-bottom:
1. Title (inline editable), List/Board breadcrumb, close button.
2. Metadata row: Labels, Due date, Assignees, "Add to card" quick-actions (checklist, attachment).
3. Description (markdown, inline-editable, rendered when not focused).
4. Checklists (one or more), each with progress bar + checkable items, inline add-item.
5. Attachments (thumbnail grid for images, file-icon rows for other types).
6. Activity/Comments feed (chronological, comments interleaved with system activity entries like "Ayşe moved this card from *To Do* to *Doing*"), comment composer pinned at bottom with @mention autocomplete.

### 4.4 Notification Center
- Slide-over panel from the bell icon; list of notifications grouped by day, unread visually distinct (dot + subtle background), click navigates directly to the relevant card/board, "Mark all as read" action, link to notification email-preference settings.

### 4.5 Auth Screens
- Minimal, centered card layout: Sign in (email/password + "Continue with Google" button), Sign up, Forgot password. No marketing chrome — functional and fast, consistent with the shadcn/ui aesthetic.

## 5. Core Interaction Patterns

- **Drag-and-drop:** cards reorder within/across lists with a placeholder gap showing drop position; lists reorder via drag on their header. Keyboard alternative: focus a card, `Space` to pick up, arrow keys to move, `Space`/`Enter` to drop (matches common accessible DnD patterns).
- **Inline quick-add:** clicking "+ Add card" opens an inline textarea at that position (not a modal) for fast entry; `Enter` submits and immediately opens another blank entry for rapid multi-card creation; `Esc` cancels.
- **Optimistic updates:** every mutation (move card, add label, check a checklist item) updates the UI immediately and reconciles with the server/WebSocket confirmation in the background; on failure, the action visibly reverts with a toast explaining why.
- **Filtering:** applying a board filter dims/hides non-matching cards in place (no layout jump/reload) with an active-filter badge and one-click "Clear filters."

## 6. Real-Time Collaboration UX (Showcase Feature)

This is the interaction area to invest the most polish in, per your priority:

- **Presence avatars:** live avatar stack in the board header for everyone currently viewing that board, updating within ~1s of join/leave (NFR2). Hovering an avatar shows the member's name.
- **Live card movement:** when another user moves a card, it animates to its new position (not a hard re-render) and briefly highlights (soft colored outline, ~1.5s fade) so the change is noticeable without being jarring.
- **Live edits elsewhere:** if another user opens the same Card Detail you're viewing, show a small "Ayşe is also viewing this card" indicator; if they edit a field you're not currently focused on, update it live with the same brief highlight treatment.
- **Toast on background changes:** if a change happens on a board section currently scrolled out of view, a small non-blocking toast ("Mehmet added a card to *Doing*") appears, dismissible or auto-fading.
- **Conflict signal (not silent last-write-wins):** if two users edit the same field concurrently, the "losing" edit's author sees a brief inline notice ("This was just updated by X — your view has been refreshed") rather than silently losing their change unnoticed (supports NFR3).
- **Access revoked mid-session:** if a Board Admin removes you (or downgrades your role) while you're actively viewing that Board, the client receives a real-time signal (`board:access-revoked`, Architecture §6) and redirects you to the Dashboard with a clear, non-alarming toast ("You no longer have access to this board") — rather than leaving a stale, silently-broken view on screen.

## 7. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (≥1024px) | Full sidebar + multi-list horizontal board view; Card Detail as centered modal |
| Tablet (768–1023px) | Collapsible sidebar (icon-only by default); board view unchanged (horizontal scroll) |
| Mobile (<768px) | Sidebar becomes a slide-over drawer; board view shows **one List at a time** with horizontal swipe/tab navigation between lists (avoids cramped multi-column layout); Card Detail becomes a full-screen sheet; drag-and-drop reordering **within the visible List** is supported via touch with a long-press-to-pick-up gesture. Moving a card **to a different List** (off-screen on mobile) uses an explicit **"Move to list…" action** in the card's long-press context menu or Card Detail sheet instead of cross-screen drag — a screen-edge drag gesture is not reliable enough to be the only path |

## 8. Accessibility Guidelines

- All interactive elements reachable and operable via keyboard (tab order follows visual order); drag-and-drop has the keyboard equivalent described in §5.
- Color is never the only signal (due-date status pairs color with an icon/text label; label chips have accessible names even though visually shown as color-only).
- Focus states clearly visible (shadcn/ui + Radix defaults, not suppressed).
- Modals trap focus and are dismissible via `Esc`; screen-reader live regions announce real-time updates that affect the current view (e.g., "Card moved to Doing by Ayşe") without being overly chatty.
- Target WCAG 2.1 AA contrast ratios across the custom color system (verify label swatches and semantic due-date colors specifically, since these are the most likely to fail contrast checks).

## 9. Deferred / Stretch UX Items

- Dark mode theme (v1 ships light-only; theming approach should still be built to make this low-cost later).
- Live cursor positions (beyond presence avatars) — nice showcase addition if time allows post-MVP.
- Card cover images.
- Custom board templates gallery beyond 2–3 starter templates.

## 10. Next Steps (BMAD Flow)

Proceed to **Architecture** (`bmad-architecture`) to lock the technical spine — in particular, the pieces this UX spec puts direct load on:

- Real-time transport choice (WebSocket vs SSE) capable of the presence + live-highlight patterns in §6.
- Client state layer supporting optimistic updates with clean rollback (§5).
- Component/theming setup for shadcn/ui with the custom palette in §2.

---
*This UX spec was produced via BMAD-coached discovery. Revisit whenever PRD scope assumptions change, or via the `bmad-ux` update workflow.*
