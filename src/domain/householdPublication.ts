import {
  boardSchema,
  householdHomeSchema,
  type BoardContent,
  type HouseholdHome,
  type SharedItem,
} from './household';

// Earlier releases number imported rows by position. Never use those IDs to
// identify a product across two publications: sorting or removing a row shifts them.
function origin(item: SharedItem) {
  return /^(recipe|extra)-\d+$/.exec(item.id)?.[1] ?? 'manual';
}
function matchKey(item: SharedItem) {
  return origin(item) + ':' + item.name.normalize('NFC').trim().toLocaleLowerCase('tr-TR');
}
function group(items: SharedItem[]) {
  const groups = new Map<string, SharedItem[]>();
  for (const item of items) {
    const key = matchKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
type Meal = BoardContent['menu'][number];
export type HouseholdPublication = ReturnType<typeof prepareHouseholdPublication>;

export function prepareHouseholdPublication(
  value: HouseholdHome,
  source: BoardContent,
  keepManual = true,
) {
  const home = householdHomeSchema.parse(value);
  const incoming = boardSchema.parse({ ...home.board, content: source }).content;
  if (incoming.items.some((item) => origin(item) === 'manual')) throw new Error('HOUSEHOLD_INPUT');
  const previous = home.board.content;
  const manual = previous.items.filter((item) => origin(item) === 'manual');
  const managed = previous.items.filter((item) => origin(item) !== 'manual');
  const beforeGroups = group(managed),
    afterGroups = group(incoming.items);
  const matched = new Set<string>();
  const added: SharedItem[] = [];
  const changed: { before: SharedItem; after: SharedItem }[] = [];
  const unchanged: SharedItem[] = [];
  let preservedChecks = 0;
  let resetChecks = 0;
  let ambiguous = 0;
  const items = incoming.items.map((item) => {
    const key = matchKey(item);
    const candidates = beforeGroups.get(key) ?? [];
    const unique = candidates.length === 1 && afterGroups.get(key)?.length === 1;
    if (!unique) {
      // A duplicate label cannot prove which product was checked. Require review.
      const uncertain = candidates.length > 0;
      if (uncertain) ambiguous++;
      const next = { ...item, checked: uncertain ? false : item.checked };
      added.push(next);
      return next;
    }
    const before = candidates[0];
    matched.add(before.id);
    const sameAmount = before.quantity === item.quantity && before.unit === item.unit;
    const next = { ...item, checked: sameAmount && before.checked };
    if (sameAmount && before.checked) preservedChecks++;
    if (!sameAmount && before.checked) resetChecks++;
    if (sameAmount && before.name === item.name) unchanged.push(next);
    else changed.push({ before, after: next });
    return next;
  });
  const removed = managed.filter((item) => !matched.has(item.id));
  if (keepManual) {
    items.push(...manual.map((item) => ({ ...item })));
    preservedChecks += manual.filter((item) => item.checked).length;
  } else removed.push(...manual);

  const mealKey = (meal: Meal) => meal.date + ':' + meal.slot;
  const oldMeals = new Map(previous.menu.map((meal) => [mealKey(meal), meal]));
  const newMeals = new Map(incoming.menu.map((meal) => [mealKey(meal), meal]));
  const addedMeals = incoming.menu.filter((meal) => !oldMeals.has(mealKey(meal)));
  const removedMeals = previous.menu.filter((meal) => !newMeals.has(mealKey(meal)));
  const changedMeals = incoming.menu.flatMap((after) => {
    const before = oldMeals.get(mealKey(after));
    return before && (before.title !== after.title || before.servings !== after.servings)
      ? [{ before, after }]
      : [];
  });
  return {
    householdId: home.id,
    baseline: home.board.revision,
    week: home.board.week,
    source: incoming,
    keepManual,
    manual,
    content: { menu: incoming.menu, items },
    added,
    removed,
    changed,
    unchanged,
    addedMeals,
    removedMeals,
    changedMeals,
    preservedChecks,
    resetChecks,
    ambiguous,
    issue:
      items.length > 200
        ? 'Ortak listede en fazla 200 ürün olabilir. Ortak ek ürünleri aktarımdan çıkarabilir veya kişisel listenin kapsamını azaltabilirsin.'
        : '',
  };
}

export function publicationIsCurrent(publication: HouseholdPublication, home: HouseholdHome) {
  return (
    publication.householdId === home.id &&
    publication.week === home.board.week &&
    publication.baseline === home.board.revision
  );
}

export function publicationSourceIsCurrent(
  publication: HouseholdPublication,
  source: BoardContent,
) {
  return JSON.stringify(publication.source) === JSON.stringify(source);
}

export function publicationBoard(publication: HouseholdPublication, home: HouseholdHome) {
  if (!publicationIsCurrent(publication, home)) throw new Error('HOUSEHOLD_CONFLICT');
  return boardSchema.parse({
    week: publication.week,
    revision: publication.baseline,
    content: publication.content,
  });
}
