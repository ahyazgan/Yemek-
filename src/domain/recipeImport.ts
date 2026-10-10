import { ingredients } from '../data/catalog';
import { Ingredient, RecipeIngredient } from './model';

export type ImportRow = { source: string; ingredientId: string; grams: string; warning: string };
export type ImportDraft = {
  title: string;
  servings: string;
  minutes: string;
  rows: ImportRow[];
  steps: string;
};
const normalize = (text: string) =>
  text
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ');
const aliases: Record<string, string[]> = {
  egg: ['yumurta', 'kabuksuz yumurta'],
  flour: ['un'],
  sugar: ['şeker'],
};
const ingredientNames = (dictionary: Ingredient[]) =>
  dictionary.flatMap((item) =>
    [item.name, ...(aliases[item.id] ?? [])].map((name) => ({
      name: normalize(name),
      id: item.id,
    })),
  );

// Only explicit mass units are converted. Cups, spoons, pieces and volume depend on the food.
export function importIngredient(
  source: string,
  dictionary: Ingredient[] = ingredients,
): ImportRow {
  const names = ingredientNames(dictionary);
  const line = source
    .trim()
    .replace(/^[-•*]\s+/, '')
    .replace(/(\d)([½¼¾])/g, '$1 $2')
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4');
  const measured = line.match(
    /^(\d+(?:[.,]\d+)*(?:\s+\d+\/\d+|\/\d+)?)\s*(kg|kilogram|g|gr|gram)(?=\s|$)\s+(.+)$/i,
  );
  let grams = '';
  let name = normalize(line);
  if (measured) {
    const raw = measured[1];
    let amount: number;
    if (raw.includes('/')) {
      const [whole, fraction] = raw.includes(' ') ? raw.split(/\s+/) : ['0', raw];
      const [numerator, denominator] = fraction.split('/').map(Number);
      amount = Number(whole) + numerator / denominator;
    } else {
      const value = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(raw) ? raw.replace(/\./g, '') : raw;
      amount = Number(value.replace(',', '.'));
    }
    const value = amount * (/^(kg|kilogram)$/i.test(measured[2]) ? 1000 : 1);
    if (Number.isFinite(value) && value > 0 && value <= 10000000)
      grams = String(Math.round(value * 1000) / 1000);
    name = normalize(measured[3]);
  }
  // For unmeasured rows, a suffix is only a suggested catalog mapping; weight remains mandatory.
  const matches = names.filter(
    (entry) => name === entry.name || (!measured && name.endsWith(' ' + entry.name)),
  );
  const ids = [...new Set(matches.map((entry) => entry.id))];
  const ingredientId = ids.length === 1 ? ids[0] : '';
  return {
    source,
    ingredientId,
    grams,
    warning: [
      !grams ? 'Gram miktarını kontrol edip gir.' : '',
      !ingredientId ? 'Katalogdan doğru malzemeyi seç.' : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export function parseRecipeText(text: string, dictionary: Ingredient[] = ingredients): ImportDraft {
  if (text.length > 20000) throw new Error('Bir seferde en fazla 20.000 karakter aktarabilirsin.');
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 150) throw new Error('Tarifi 150 satırın altında tut.');
  const header = (line: string) => normalize(line).replace(/:$/, '').trim();
  const ingredientAt = lines.findIndex((line) => header(line) === 'malzemeler');
  const stepsAt = lines.findIndex((line) =>
    ['yapilisi', 'hazirlanisi', 'adimlar'].includes(header(line)),
  );
  if (ingredientAt < 1 || stepsAt <= ingredientAt + 1 || stepsAt >= lines.length - 1)
    throw new Error(
      'Tarif adını, “Malzemeler” ve “Yapılışı” başlıklarını ekle. Her malzemeyi ve adımı ayrı satıra yaz.',
    );
  const metadata = lines.slice(0, ingredientAt);
  const servings =
    metadata
      .map((line) => line.match(/^(?:porsiyon|kişi sayısı)\s*:\s*(\d+)\s*(?:kişi(?:lik)?)?$/i)?.[1])
      .find(Boolean) ?? '';
  const minutes =
    metadata
      .map((line) => line.match(/^(?:süre|toplam süre)\s*:\s*(\d+)\s*(?:dk|dakika)?$/i)?.[1])
      .find(Boolean) ?? '';
  const rows = lines
    .slice(ingredientAt + 1, stepsAt)
    .map((line) => importIngredient(line, dictionary));
  const steps = lines.slice(stepsAt + 1).map((line) => line.replace(/^(?:\d+[.)]|[-•*])\s+/, ''));
  if (rows.length > 60 || steps.length > 40)
    throw new Error('Bir tarifte en fazla 60 malzeme satırı ve 40 adım aktarabilirsin.');
  return { title: metadata[0], servings, minutes, rows, steps: steps.join('\n') };
}

export function resolveImportRows(
  rows: ImportRow[],
  dictionary: Ingredient[] = ingredients,
): RecipeIngredient[] {
  if (!rows.length) throw new Error('En az bir malzeme ekle.');
  const totals = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    const value = Number(row.grams.trim().replace(',', '.'));
    if (
      !dictionary.some((item) => item.id === row.ingredientId) ||
      !row.grams.trim() ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 10000000
    )
      throw new Error(`${index + 1}. malzemenin eşleşmesini ve gram miktarını tamamla.`);
    totals.set(row.ingredientId, (totals.get(row.ingredientId) ?? 0) + value);
  }
  return [...totals].map(([ingredientId, quantity]) => ({
    ingredientId,
    quantity: Math.round(quantity * 1000) / 1000,
    unit: 'g',
  }));
}

export const importExample = `Soğanlı bulgur pilavım
Porsiyon: 4
Süre: 30 dk

Malzemeler
300 g pilavlık bulgur
120 g soğan
25 g zeytinyağı
650 g su
4 g tuz

Yapılışı
1. Soğanı doğra ve yağda yumuşat.
2. Yıkanmış bulguru ekleyip birkaç dakika çevir.
3. Sıcak su ve tuzu ekle. Kapağı kapalı, kısık ateşte suyunu çekene kadar pişir.
4. Ocağı kapatıp 10 dakika dinlendir.`;
