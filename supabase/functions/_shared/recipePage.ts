// Shared pure parser: neither HTML nor JSON-LD is executed. Used in the app and Edge Function.
export type PageRecipe = {
  title: string;
  servings: string;
  minutes: string;
  ingredients: string[];
  steps: string[];
  author: string;
};
export const MAX_PAGE_LENGTH = 1000000;
const asciiLower = (value: string) => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
function closingTag(lower: string, name: string, from: number) {
  const prefix = '</' + name;
  let start = lower.indexOf(prefix, from);
  while (start !== -1) {
    if (/[\s/>]/.test(lower[start + prefix.length] ?? '')) {
      const end = lower.indexOf('>', start + prefix.length);
      return end === -1 ? null : { start, end: end + 1 };
    }
    start = lower.indexOf(prefix, start + prefix.length);
  }
  return null;
}
function plainMarkup(value: string) {
  const lower = asciiLower(value),
    output: string[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf('<', cursor);
    if (start === -1) {
      output.push(value.slice(cursor));
      break;
    }
    output.push(value.slice(cursor, start));
    const end = value.indexOf('>', start + 1);
    if (end === -1) {
      output.push(value.slice(start + 1));
      break;
    }
    const tag = lower.slice(start + 1, end);
    const hidden = tag.match(/^(script|style)(?:\s|\/|$)/)?.[1];
    if (hidden) {
      const close = closingTag(lower, hidden, end + 1);
      if (!close) break;
      cursor = close.end;
      continue;
    }
    if (/^br(?:\s|\/|$)|^\/(?:p|li|div)(?:\s|$)/.test(tag)) output.push('\n');
    cursor = end + 1;
  }
  return output.join('');
}
const record = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
export function cleanMarkup(value: string) {
  // Plain text extraction, never an HTML sanitizer. Remove brackets created
  // by malformed tags or entity decoding before storing text.
  if (value.length > MAX_PAGE_LENGTH) throw new Error('Tarif metni çok büyük.');
  return plainMarkup(value)
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
      if (code.startsWith('#')) {
        const number =
          code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
          ? String.fromCodePoint(number)
          : '';
      }
      return (
        ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' } as Record<string, string>)[
          code.toLowerCase()
        ] ?? entity
      );
    })
    .replace(/[<>\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .trim();
}
function text(value: unknown) {
  return typeof value === 'string' ? cleanMarkup(value) : '';
}
function minutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m || !m.slice(1).some(Boolean)) return null;
  const n = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) + Math.ceil(Number(m[3] ?? 0) / 60);
  return n > 0 && n <= 600 ? n : null;
}
function steps(value: unknown, depth = 0): string[] {
  if (depth > 8) throw new Error('Tarif adımları çok karmaşık.');
  if (typeof value === 'string')
    return cleanMarkup(value)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(value)) return value.flatMap((v) => steps(v, depth + 1));
  const object = record(value);
  if (!object) return [];
  if (object.itemListElement) return steps(object.itemListElement, depth + 1);
  return object.text ? steps(object.text, depth + 1) : [];
}
function toRecipe(r: Record<string, unknown>): PageRecipe | null {
  const title = text(r.name);
  const ingredients = Array.isArray(r.recipeIngredient)
    ? r.recipeIngredient.map(text).filter(Boolean)
    : [];
  const instructions = steps(r.recipeInstructions);
  if (title.length < 2 || title.length > 100 || ingredients.length < 1 || instructions.length < 1)
    return null;
  if (
    ingredients.length > 60 ||
    instructions.length > 40 ||
    ingredients.some((i) => i.length > 500) ||
    instructions.some((i) => i.length < 3 || i.length > 2000)
  )
    throw new Error('Tarif 60 malzeme ve 40 adım sınırını aşıyor veya adımları okunamıyor.');
  const yieldValue = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
  const yieldText = typeof yieldValue === 'number' ? String(yieldValue) : text(yieldValue);
  const yieldMatch = yieldText.match(/^(\d+)\s*(?:kişilik|kişi|porsiyon|servings?)?$/i);
  const count = yieldMatch ? Number(yieldMatch[1]) : 0;
  const prep = minutes(r.prepTime),
    cook = minutes(r.cookTime);
  const duration = minutes(r.totalTime) ?? (prep !== null && cook !== null ? prep + cook : null);
  const author = Array.isArray(r.author) ? r.author[0] : r.author;
  return {
    title,
    ingredients,
    steps: instructions,
    servings: count >= 1 && count <= 12 ? String(count) : '',
    minutes: duration && duration <= 600 ? String(duration) : '',
    author: (typeof author === 'string' ? text(author) : text(record(author)?.name)).slice(0, 200),
  };
}
export function extractPageRecipes(input: string): PageRecipe[] {
  if (!input.trim() || input.length > MAX_PAGE_LENGTH)
    throw new Error('Kaynak boş veya 1 milyon karakterden büyük.');
  const chunks: string[] = [];
  if (/^[\s]*[\[{]/.test(input)) chunks.push(input);
  else {
    const lower = asciiLower(input);
    let cursor = 0;
    while (cursor < input.length) {
      const start = lower.indexOf('<script', cursor);
      if (start === -1) break;
      cursor = start + 7;
      if (!/[\s/>]/.test(lower[cursor] ?? '')) continue;
      const end = lower.indexOf('>', cursor);
      if (end === -1) break;
      const close = closingTag(lower, 'script', end + 1);
      if (!close) break;
      const attributes = input.slice(cursor, end);
      cursor = close.end;
      if (
        attributes.length <= 4096 &&
        /\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)(?:\s|$)/i.test(
          attributes.trim(),
        )
      )
        chunks.push(input.slice(end + 1, close.start));
      if (chunks.length > 40) throw new Error('Kaynakta çok fazla veri bloğu var.');
    }
  }
  const results: PageRecipe[] = [];
  let visited = 0;
  const walk = (value: unknown, depth: number) => {
    if (++visited > 10000 || depth > 30) throw new Error('Kaynağın veri yapısı çok büyük.');
    if (Array.isArray(value)) {
      value.forEach((v) => walk(v, depth + 1));
      return;
    }
    const r = record(value);
    if (!r) return;
    const types = Array.isArray(r['@type']) ? r['@type'] : [r['@type']];
    if (
      types.some((t) => typeof t === 'string' && /^(?:https?:\/\/schema\.org\/)?Recipe$/.test(t))
    ) {
      const recipe = toRecipe(r);
      if (recipe && !results.some((old) => JSON.stringify(old) === JSON.stringify(recipe)))
        results.push(recipe);
      if (results.length > 10) throw new Error('En fazla 10 tarif içeren bir kaynak kullan.');
      return;
    }
    Object.values(r).forEach((v) => walk(v, depth + 1));
  };
  for (const chunk of chunks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(chunk);
    } catch {
      continue;
    }
    walk(parsed, 0);
  }
  if (!results.length)
    throw new Error(
      'Okunabilir Recipe verisi bulunamadı. Tarif metnini yapıştırarak devam edebilirsin.',
    );
  return results;
}
