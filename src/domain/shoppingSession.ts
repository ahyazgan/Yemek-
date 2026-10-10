import { z } from 'zod';
import { allIngredients } from './ingredients';
import { amountLabel, buildShoppingList, itemKey, mealsInWeek, weekStart } from './logic';
import type { AppState, ShoppingItem } from './model';

export type ShoppingScope = { kind: 'week'; week: string } | { kind: 'saved'; id: string };
export type ShoppingRow = {
  id: string;
  name: string;
  category: string;
  amount: string;
  checked: boolean;
  fingerprint: string;
  item?: ShoppingItem;
};
export type ShoppingChange = {
  scope: ShoppingScope;
  rowId: string;
  fingerprint: string;
  from: boolean;
  to: boolean;
};

export function resolveShoppingScope(
  params: { week?: string | string[]; savedList?: string | string[] },
  fallbackWeek: string,
): ShoppingScope | null {
  if (params.savedList !== undefined) {
    return typeof params.savedList === 'string' &&
      params.savedList.trim() &&
      params.week === undefined
      ? { kind: 'saved', id: params.savedList }
      : null;
  }
  const week = params.week ?? fallbackWeek;
  return typeof week === 'string' &&
    z.iso.date().safeParse(week).success &&
    weekStart(week) === week
    ? { kind: 'week', week }
    : null;
}

export function shoppingSession(state: AppState, scope: ShoppingScope) {
  const saved = scope.kind === 'saved' ? state.savedLists.find((l) => l.id === scope.id) : null;
  if (scope.kind === 'saved' && !saved) return null;
  const all =
    scope.kind === 'week'
      ? buildShoppingList(
          mealsInWeek(state, scope.week),
          state.recipes,
          state.pantry,
          allIngredients(state),
        )
      : saved!.items;
  const checked = scope.kind === 'week' ? (state.checked[scope.week] ?? []) : saved!.checked;
  const extras =
    scope.kind === 'week'
      ? state.experience.extras.filter((e) => e.week === scope.week)
      : (saved!.extras ?? []);
  const rows: ShoppingRow[] = [
    ...all
      .filter((i) => i.grams > 0)
      .map((item) => ({
        id: 'ingredient:' + item.ingredientId,
        name: item.name,
        category: item.category,
        amount: amountLabel(item.grams),
        checked: checked.includes(itemKey(item)),
        // Changing the amount, pantry allocation or product invalidates an old undo.
        fingerprint: JSON.stringify([
          item.ingredientId,
          item.name,
          item.category,
          item.grams,
          item.totalGrams,
          item.pantryGrams,
          item.recipeTitles,
        ]),
        item,
      })),
    ...extras.map((extra) => ({
      id: 'extra:' + extra.id,
      name: extra.name,
      category: 'Diğer ürünler',
      amount: `${extra.quantity.toLocaleString('tr-TR', { maximumSignificantDigits: 21 })} ${extra.unit}`,
      checked: extra.checked,
      fingerprint: JSON.stringify([extra.id, extra.name, extra.quantity, extra.unit]),
    })),
  ];
  const done = rows.filter((row) => row.checked).length;
  return {
    name: saved?.name ?? '',
    rows,
    done,
    remaining: rows.length - done,
    covered: all.filter((i) => i.grams === 0).length,
  };
}

function searchKey(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .trim();
}

export function shoppingGroups(rows: ShoppingRow[], query: string, remainingOnly: boolean) {
  const words = searchKey(query).split(/\s+/).filter(Boolean);
  const visible = rows.filter(
    (row) =>
      (!remainingOnly || !row.checked) && words.every((word) => searchKey(row.name).includes(word)),
  );
  const categories = [...new Set(visible.map((row) => row.category))].sort((a, b) =>
    a === 'Diğer ürünler' ? 1 : b === 'Diğer ürünler' ? -1 : a.localeCompare(b, 'tr'),
  );
  return categories.map((category) => ({
    category,
    rows: visible
      .filter((row) => row.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
  }));
}

export function shoppingChangeIsCurrent(state: AppState, change: ShoppingChange): boolean {
  const row = shoppingSession(state, change.scope)?.rows.find((r) => r.id === change.rowId);
  return !!row && row.fingerprint === change.fingerprint && row.checked === change.from;
}

export function applyShoppingChange(state: AppState, change: ShoppingChange): AppState {
  if (!shoppingChangeIsCurrent(state, change) || change.from === change.to) return state;
  const row = shoppingSession(state, change.scope)!.rows.find((r) => r.id === change.rowId)!;
  const setChecked = (keys: string[]) =>
    change.to
      ? [...new Set([...keys, itemKey(row.item!)])]
      : keys.filter((key) => key !== itemKey(row.item!));
  if (change.scope.kind === 'week') {
    const week = change.scope.week;
    if (row.item)
      return {
        ...state,
        checked: { ...state.checked, [week]: setChecked(state.checked[week] ?? []) },
      };
    return {
      ...state,
      experience: {
        ...state.experience,
        extras: state.experience.extras.map((extra) =>
          extra.week === week && 'extra:' + extra.id === row.id
            ? { ...extra, checked: change.to }
            : extra,
        ),
      },
    };
  }
  const listId = change.scope.id;
  return {
    ...state,
    savedLists: state.savedLists.map((list) =>
      list.id !== listId
        ? list
        : row.item
          ? { ...list, checked: setChecked(list.checked) }
          : {
              ...list,
              extras: (list.extras ?? []).map((extra) =>
                'extra:' + extra.id === row.id ? { ...extra, checked: change.to } : extra,
              ),
            },
    ),
  };
}
