import type { AppState, Diet, Equipment } from './model';
import { suggestDinners } from './planning';
export type MenuRequest = {
  evenings: number;
  people: number | null;
  minutes: number | null;
  diets: Diet[];
  noOven: boolean;
};
export function parseMenuRequest(input: string): MenuRequest {
  let text = input.toLocaleLowerCase('tr').trim();
  if (!text || text.length > 300) throw new Error('1–300 karakterlik bir menü isteği yaz.');
  const result: MenuRequest = {
    evenings: 5,
    people: null,
    minutes: null,
    diets: [],
    noOven: false,
  };
  const take = (pattern: RegExp, apply: (m: RegExpMatchArray) => void) => {
    const match = text.match(pattern);
    if (match) {
      apply(match);
      text = text.replace(pattern, ' ');
    }
  };
  take(/\b(\d{1,2})\s*akşam/u, (m) => {
    result.evenings = Number(m[1]);
  });
  take(/\b(\d{1,2})\s*kişi(?:lik)?/u, (m) => {
    result.people = Number(m[1]);
  });
  take(/\b(\d{1,3})\s*(?:dakika|dk)/u, (m) => {
    result.minutes = Number(m[1]);
  });
  for (const [word, diet] of [
    ['vegan', 'vegan'],
    ['vejetaryen', 'vegetarian'],
    ['glutensiz', 'glutenFree'],
  ] as const)
    take(new RegExp(word, 'u'), () => {
      result.diets.push(diet);
    });
  take(/fırınsız/u, () => {
    result.noOven = true;
  });
  text = text.replace(/bu hafta|menü|planla|hazırla|lütfen|ve|[,.;:]/gu, '').trim();
  if (text)
    throw new Error(
      'Bu isteği güvenle eşleştiremedim. Akşam sayısı, kişi sayısı, dakika, vegan/vejetaryen/glutensiz ve fırınsız ifadelerini kullan.',
    );
  if (
    result.evenings < 1 ||
    result.evenings > 7 ||
    (result.people !== null && (result.people < 1 || result.people > 12)) ||
    (result.minutes !== null && (result.minutes < 5 || result.minutes > 600))
  )
    throw new Error('1–7 akşam, 1–12 kişi ve 5–600 dakika aralığını kullan.');
  return result;
}
export function assistantMenu(state: AppState, week: string, request: MenuRequest) {
  if (!state.profile) throw new Error('Önce sofra tercihlerini tamamla.');
  const equipment: Equipment[] | null = request.noOven
    ? (
        state.experience.equipment ?? ['hob', 'blender', 'fridge', 'airfryer', 'multicooker']
      ).filter((e) => e !== 'oven')
    : state.experience.equipment;
  const adjusted: AppState = {
    ...state,
    profile: {
      ...state.profile,
      people: request.people ?? state.profile.people,
      diets: [...new Set([...state.profile.diets, ...request.diets])],
    },
    experience: {
      ...state.experience,
      equipment,
      maxMinutes:
        request.minutes === null
          ? state.experience.maxMinutes
          : Math.min(state.experience.maxMinutes ?? 600, request.minutes),
    },
  };
  return suggestDinners(adjusted, week, request.evenings);
}
