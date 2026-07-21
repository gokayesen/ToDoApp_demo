import { randomUUID } from 'node:crypto';

import { LABEL_COLORS } from '@todoapp/shared';

import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';

// Story 8.5 (NFR1/NFR2): seeds a "portfolio scale" data volume to benchmark
// against — this project has no solo-developer usage numbers to calibrate to
// (PRD/Architecture never pin a concrete workspace/board/card count for NFR1/
// NFR2, confirmed with the user this session), so these figures are a
// judgment call sized to look like a real, well-used personal Trello-style
// tool rather than either a toy fixture or an enterprise load test: 3
// workspaces, 5 boards each, 8 lists per board, 40 cards per list — 4,800
// Cards total, the same figure perf-benchmark.ts reads back out of. A
// realistic subset of Cards also carry labels/assignees/checklists/comments
// so the benchmark's card.repository.ts `withRelations` query (labels,
// assignees, checklists+items) isn't measured against bare rows only.
//
// Idempotent by construction: every workspace this script creates is named
// with the PERF_WORKSPACE_PREFIX below, so a re-run first deletes any
// workspaces it created last time (cascades Board/List/Card/etc. for free,
// same as cleanupWorkspace in test-support/fixtures.ts) rather than piling up
// duplicate data on every run.

const PERF_WORKSPACE_PREFIX = 'Perf Test Workspace';
const PERF_USER_EMAIL_DOMAIN = 'perf-test.todoapp.local';
const WORKSPACE_COUNT = 3;
const BOARDS_PER_WORKSPACE = 5;
const LISTS_PER_BOARD = 8;
const CARDS_PER_LIST = 40;
const LABELS_PER_BOARD = 6;
const MEMBER_USER_COUNT = 4; // + 1 owner = 5 users per board, invited as Board Members

async function main() {
  console.log('Cleaning up any previous perf-test run...');
  const previous = await prisma.workspace.findMany({
    where: { name: { startsWith: PERF_WORKSPACE_PREFIX } },
    select: { id: true },
  });
  for (const workspace of previous) {
    await prisma.workspace.delete({ where: { id: workspace.id } });
  }
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${PERF_USER_EMAIL_DOMAIN}` } } });

  console.log('Creating users...');
  const passwordHash = await hashPassword('PerfTest123!');
  const owner = await prisma.user.create({
    data: { email: `owner@${PERF_USER_EMAIL_DOMAIN}`, name: 'Perf Owner', passwordHash },
  });
  const members = await Promise.all(
    Array.from({ length: MEMBER_USER_COUNT }, (_, i) =>
      prisma.user.create({
        data: {
          email: `member${i + 1}@${PERF_USER_EMAIL_DOMAIN}`,
          name: `Perf Member ${i + 1}`,
          passwordHash,
        },
      }),
    ),
  );

  let boardCount = 0;
  let listCount = 0;
  let cardCount = 0;
  let firstBoardId: string | undefined;
  let firstListId: string | undefined;

  for (let w = 0; w < WORKSPACE_COUNT; w++) {
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name: `${PERF_WORKSPACE_PREFIX} ${w + 1}`, ownerId: owner.id },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId: owner.id, role: 'OWNER' },
      });
      return ws;
    });

    for (let b = 0; b < BOARDS_PER_WORKSPACE; b++) {
      const board = await prisma.board.create({
        data: { workspaceId: workspace.id, name: `Perf Board ${w + 1}.${b + 1}` },
      });
      boardCount++;
      firstBoardId ??= board.id;

      // Every Board gets every Member (matches a real small-team board's
      // membership density, and gives assignees/@mentions/comments below a
      // real BoardMember row to reference, same rule Story 4.5 enforces).
      await prisma.boardMember.createMany({
        data: members.map((m) => ({ boardId: board.id, userId: m.id, role: 'MEMBER' as const })),
      });

      const labels = await Promise.all(
        Array.from({ length: LABELS_PER_BOARD }, (_, i) =>
          prisma.label.create({
            data: { boardId: board.id, name: `Label ${i + 1}`, color: LABEL_COLORS[i % LABEL_COLORS.length]! },
          }),
        ),
      );

      const listRows = Array.from({ length: LISTS_PER_BOARD }, (_, l) => ({
        id: randomUUID(),
        boardId: board.id,
        name: `List ${l + 1}`,
        position: (l + 1) * 1024,
      }));
      await prisma.list.createMany({ data: listRows });
      listCount += listRows.length;

      for (const list of listRows) {
        firstListId ??= list.id;

        const cardRows = Array.from({ length: CARDS_PER_LIST }, (_, c) => ({
          id: randomUUID(),
          listId: list.id,
          title: `Card ${c + 1} — ${list.name}`,
          position: (c + 1) * 1024,
        }));
        await prisma.card.createMany({ data: cardRows });
        cardCount += cardRows.length;

        // Realistic subset density, not every Card — mirrors how an actual
        // board looks (most Cards are plain, a minority carry rich content).
        const cardLabelRows: { cardId: string; labelId: string }[] = [];
        const cardAssigneeRows: { cardId: string; userId: string }[] = [];
        const checklistRows: { id: string; cardId: string; title: string; position: number }[] = [];
        const checklistItemRows: { checklistId: string; text: string; isChecked: boolean; position: number }[] = [];
        const commentRows: { cardId: string; userId: string; authorNameSnapshot: string; body: string }[] = [];

        cardRows.forEach((card, i) => {
          if (i % 3 === 0) {
            cardLabelRows.push({ cardId: card.id, labelId: labels[i % labels.length]!.id });
          }
          if (i % 4 === 0) {
            cardAssigneeRows.push({ cardId: card.id, userId: members[i % members.length]!.id });
          }
          if (i % 5 === 0) {
            const checklistId = randomUUID();
            checklistRows.push({ id: checklistId, cardId: card.id, title: 'Checklist', position: 1024 });
            for (let it = 0; it < 3; it++) {
              checklistItemRows.push({
                checklistId,
                text: `Item ${it + 1}`,
                isChecked: it === 0,
                position: (it + 1) * 1024,
              });
            }
          }
          if (i % 7 === 0) {
            const author = members[i % members.length]!;
            commentRows.push({
              cardId: card.id,
              userId: author.id,
              authorNameSnapshot: author.name,
              body: 'This is a seeded comment for performance benchmarking.',
            });
          }
        });

        if (cardLabelRows.length) await prisma.cardLabel.createMany({ data: cardLabelRows });
        if (cardAssigneeRows.length) await prisma.cardAssignee.createMany({ data: cardAssigneeRows });
        if (checklistRows.length) await prisma.checklist.createMany({ data: checklistRows });
        if (checklistItemRows.length) await prisma.checklistItem.createMany({ data: checklistItemRows });
        if (commentRows.length) await prisma.comment.createMany({ data: commentRows });
      }

      console.log(`  Board ${w + 1}.${b + 1} seeded (${LISTS_PER_BOARD} lists, ${LISTS_PER_BOARD * CARDS_PER_LIST} cards)`);
    }
  }

  console.log('\nDone.');
  console.log(`Workspaces: ${WORKSPACE_COUNT}, Boards: ${boardCount}, Lists: ${listCount}, Cards: ${cardCount}`);
  console.log(`Owner login: owner@${PERF_USER_EMAIL_DOMAIN} / PerfTest123!`);
  console.log(`First board id (for perf-benchmark.ts): ${firstBoardId}`);
  console.log(`First list id (for perf-benchmark.ts): ${firstListId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
