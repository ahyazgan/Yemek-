import { z } from 'zod';
import type { AppState } from './model';
import { allIngredients } from './ingredients';
import { buildShoppingList, itemKey, mealsInWeek, weekStart } from './logic';

export const householdRole = z.enum(['owner', 'editor', 'viewer']);
export type HouseholdRole = z.infer<typeof householdRole>;
export const roleLabel: Record<HouseholdRole, string> = {
  owner: 'Yönetici',
  editor: 'Düzenleyen',
  viewer: 'Görüntüleyen',
};
const id = z
  .string()
  .regex(/^[a-zA-Z0-9-]+$/)
  .max(120);
export const householdName = z.string().trim().min(2).max(60);
export const boardWeek = z.iso
  .date()
  .refine((v) => weekStart(v) === v, 'Hafta pazartesi başlamalı.');
export const sharedItemSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(100),
    quantity: z.number().finite().positive().max(10000000),
    unit: z.enum(['g', 'ml', 'adet', 'paket']),
    checked: z.boolean(),
  })
  .strict();
export type SharedItem = z.infer<typeof sharedItemSchema>;
export const boardContentSchema = z
  .object({
    menu: z
      .array(
        z
          .object({
            date: z.iso.date(),
            slot: z.enum(['lunch', 'dinner']),
            title: z.string().trim().min(2).max(100),
            servings: z.number().int().min(1).max(12),
          })
          .strict(),
      )
      .max(14),
    items: z.array(sharedItemSchema).max(200),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set(v.items.map((i) => i.id)).size !== v.items.length ||
      new Set(v.menu.map((m) => m.date + m.slot)).size !== v.menu.length
    )
      ctx.addIssue({ code: 'custom', message: 'Ortak kayıtta yinelenen satır var.' });
  });
export type BoardContent = z.infer<typeof boardContentSchema>;
export const boardSchema = z
  .object({
    week: boardWeek,
    revision: z.number().int().nonnegative(),
    content: boardContentSchema,
  })
  .refine(
    (v) => v.content.menu.every((m) => weekStart(m.date) === v.week),
    'Öğün başka haftaya ait.',
  );
export type HouseholdBoard = z.infer<typeof boardSchema>;
const memberSchema = z.object({ id, name: householdName, role: householdRole });
export const householdHomeSchema = z
  .object({
    id,
    name: householdName,
    ownerId: id,
    members: z.array(memberSchema).min(1).max(12),
    board: boardSchema,
  })
  .superRefine((home, ctx) => {
    if (
      home.members.filter((m) => m.role === 'owner').length !== 1 ||
      !home.members.some((m) => m.role === 'owner' && m.id === home.ownerId) ||
      new Set(home.members.map((m) => m.id)).size !== home.members.length
    )
      ctx.addIssue({ code: 'custom', message: 'Hane üyeliği geçersiz.' });
  });
export type HouseholdHome = z.infer<typeof householdHomeSchema>;
export const invitePreviewSchema = z.object({
  name: householdName,
  role: z.enum(['editor', 'viewer']),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;
export const householdDemoSchema = z
  .object({
    id,
    name: householdName,
    ownerId: id,
    members: z.array(memberSchema).min(1).max(12),
    boards: z.array(boardSchema).max(104),
    invite: invitePreviewSchema.extend({ code: z.string().min(1).max(120) }).nullable(),
  })
  .superRefine((v, ctx) => {
    const parsed = householdHomeSchema.safeParse({ ...v, board: emptyBoard('2026-01-05') });
    if (!parsed.success || new Set(v.boards.map((b) => b.week)).size !== v.boards.length)
      ctx.addIssue({ code: 'custom', message: 'Yerel hane kaydı geçersiz.' });
  });
export type HouseholdDemo = z.infer<typeof householdDemoSchema>;
export const DEMO_OWNER = 'demo-owner';
export const DEMO_GUEST = 'demo-guest';
export function emptyBoard(week: string): HouseholdBoard {
  return { week: boardWeek.parse(week), revision: 0, content: { menu: [], items: [] } };
}
export function shareWeek(state: AppState, week: string): BoardContent {
  const meals = mealsInWeek(state, boardWeek.parse(week));
  const items = buildShoppingList(meals, state.recipes, state.pantry, allIngredients(state));
  return boardContentSchema.parse({
    menu: meals.map((m) => ({
      date: m.date,
      slot: m.slot,
      servings: m.servings,
      title: state.recipes.find((r) => r.id === m.recipeId)!.title,
    })),
    items: [
      ...items
        .filter((i) => i.grams > 0)
        .map((i, index) => ({
          id: `recipe-${index}`,
          name: i.name,
          quantity: i.grams,
          unit: 'g',
          checked: (state.checked[week] ?? []).includes(itemKey(i)),
        })),
      ...state.experience.extras
        .filter((i) => i.week === week)
        .map((i, index) => ({
          id: `extra-${index}`,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          checked: i.checked,
        })),
    ],
  });
}
export function createDemoHousehold(name: string, person: string): HouseholdDemo {
  return householdDemoSchema.parse({
    id: 'demo-home',
    name,
    ownerId: DEMO_OWNER,
    members: [{ id: DEMO_OWNER, name: person, role: 'owner' }],
    boards: [],
    invite: null,
  });
}
function requireRole(home: HouseholdDemo, actor: string, roles: HouseholdRole[]) {
  if (!roles.includes(home.members.find((m) => m.id === actor)?.role as HouseholdRole))
    throw new Error('HOUSEHOLD_ACCESS');
}
export function demoHome(
  home: HouseholdDemo | null | undefined,
  actor: string,
  week: string,
): HouseholdHome | null {
  if (!home || !home.members.some((m) => m.id === actor)) return null;
  return householdHomeSchema.parse({
    ...home,
    board: home.boards.find((b) => b.week === week) ?? emptyBoard(week),
  });
}
export function demoInvite(
  home: HouseholdDemo,
  actor: string,
  role: 'editor' | 'viewer',
  code: string,
  now: number,
): HouseholdDemo {
  requireRole(home, actor, ['owner']);
  return householdDemoSchema.parse({
    ...home,
    invite: { name: home.name, role, code, expiresAt: new Date(now + 86400000).toISOString() },
  });
}
export function previewDemoInvite(
  home: HouseholdDemo | null | undefined,
  code: string,
  now: number,
): InvitePreview {
  if (!home?.invite || home.invite.code !== code.trim() || Date.parse(home.invite.expiresAt) <= now)
    throw new Error('HOUSEHOLD_INVITE');
  return invitePreviewSchema.parse(home.invite);
}
export function joinDemoHousehold(
  home: HouseholdDemo,
  code: string,
  name: string,
  now: number,
): HouseholdDemo {
  const invite = previewDemoInvite(home, code, now);
  if (home.members.some((m) => m.id === DEMO_GUEST)) throw new Error('HOUSEHOLD_ALREADY');
  return householdDemoSchema.parse({
    ...home,
    invite: null,
    members: [...home.members, { id: DEMO_GUEST, name, role: invite.role }],
  });
}
export function writeDemoBoard(
  home: HouseholdDemo,
  actor: string,
  board: HouseholdBoard,
): HouseholdDemo {
  requireRole(home, actor, ['owner', 'editor']);
  const parsed = boardSchema.parse(board);
  const current = home.boards.find((b) => b.week === board.week) ?? emptyBoard(board.week);
  if (current.revision !== parsed.revision) throw new Error('HOUSEHOLD_CONFLICT');
  return householdDemoSchema.parse({
    ...home,
    boards: [
      ...home.boards.filter((b) => b.week !== board.week),
      { ...parsed, revision: current.revision + 1 },
    ],
  });
}
export type MemberAction =
  'editor' | 'viewer' | 'remove' | 'transfer' | 'leave' | 'close' | 'revoke';
export function manageDemoHousehold(
  home: HouseholdDemo,
  actor: string,
  action: MemberAction,
  target = '',
): HouseholdDemo | null {
  requireRole(home, actor, action === 'leave' ? ['editor', 'viewer'] : ['owner']);
  if (action === 'close') return null;
  if (action === 'revoke') return { ...home, invite: null };
  if (action === 'leave') return { ...home, members: home.members.filter((m) => m.id !== actor) };
  if (target === home.ownerId || !home.members.some((m) => m.id === target))
    throw new Error('HOUSEHOLD_INPUT');
  if (action === 'remove') return { ...home, members: home.members.filter((m) => m.id !== target) };
  return householdDemoSchema.parse({
    ...home,
    invite: action === 'transfer' ? null : home.invite,
    ownerId: action === 'transfer' ? target : home.ownerId,
    members: home.members.map((m) => ({
      ...m,
      role:
        action === 'transfer'
          ? m.id === target
            ? 'owner'
            : m.id === actor
              ? 'editor'
              : m.role
          : m.id === target
            ? action
            : m.role,
    })),
  });
}
