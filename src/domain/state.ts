import {
  AppState,
  Meal,
  Profile,
  Recipe,
  SavedList,
  Experience,
  ExtraItem,
  CookedMeal,
  RecipeCollection,
  Ingredient,
} from './model';
import { recipes } from '../data/catalog';
import { allIngredients, ingredientNameKey, ingredientUses } from './ingredients';
import { recipeUses } from './sharing';
import { emptyCompanion, Companion } from './companion';
import type { HouseholdDemo } from './household';
import { applyShoppingChange, type ShoppingChange } from './shoppingSession';

export const initialState = (): AppState => ({
  customIngredients: [],
  version: 1,
  profile: null,
  recipes: JSON.parse(JSON.stringify(recipes)),
  meals: [],
  pantry: {},
  checked: {},
  savedLists: [],
  experience: {
    tools: emptyCompanion(),
    equipment: null,
    collections: [],
    favorites: [],
    excludedIngredients: [],
    maxMinutes: null,
    extras: [],
    cooked: [],
    preferredMarket: null,
    reminder: { enabled: false, day: 0, time: '18:00' },
  },
});
export type Action =
  | { type: 'shoppingCheck'; value: ShoppingChange }
  | { type: 'householdDemo'; value: HouseholdDemo | null }
  | { type: 'tools'; value: Partial<Companion> }
  | { type: 'deleteRecipe'; id: string }
  | { type: 'ingredient'; value: Ingredient }
  | { type: 'deleteIngredient'; id: string }
  | { type: 'collection'; value: RecipeCollection }
  | { type: 'deleteCollection'; id: string }
  | { type: 'collectionRecipe'; id: string; recipeId: string }
  | { type: 'profile'; value: Profile }
  | { type: 'meal'; value: Meal }
  | { type: 'addMeals'; values: Meal[] }
  | { type: 'removeMeal'; id: string }
  | { type: 'pantry'; id: string; grams: number }
  | { type: 'check'; week: string; key: string }
  | { type: 'saveList'; value: SavedList }
  | { type: 'deleteList'; id: string }
  | { type: 'checkSaved'; id: string; key: string }
  | { type: 'checkSavedExtra'; id: string; extraId: string }
  | { type: 'recipe'; value: Recipe }
  | { type: 'favorite'; id: string }
  | {
      type: 'experience';
      value: Partial<
        Pick<
          Experience,
          'excludedIngredients' | 'maxMinutes' | 'preferredMarket' | 'reminder' | 'equipment'
        >
      >;
    }
  | { type: 'extra'; value: ExtraItem }
  | { type: 'removeExtra'; id: string }
  | { type: 'cooked'; value: CookedMeal };
const toggle = (items: string[], value: string) =>
  items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'shoppingCheck':
      return applyShoppingChange(state, action.value);
    case 'householdDemo':
      return { ...state, householdDemo: action.value };
    case 'tools':
      return {
        ...state,
        experience: { ...state.experience, tools: { ...state.experience.tools, ...action.value } },
      };
    case 'deleteRecipe':
      if (!action.id.startsWith('custom-') || recipeUses(state, action.id).length) return state;
      return {
        ...state,
        recipes: state.recipes.filter((r) => r.id !== action.id),
        experience: {
          ...state.experience,
          tools: {
            ...state.experience.tools,
            feedback: Object.fromEntries(
              Object.entries(state.experience.tools.feedback).filter(([id]) => id !== action.id),
            ),
            cooking: Object.fromEntries(
              Object.entries(state.experience.tools.cooking).filter(([id]) => id !== action.id),
            ),
          },
          favorites: state.experience.favorites.filter((id) => id !== action.id),
          collections: state.experience.collections.map((c) => ({
            ...c,
            recipeIds: c.recipeIds.filter((id) => id !== action.id),
          })),
        },
      };
    case 'deleteIngredient': {
      if (
        !state.customIngredients.some((i) => i.id === action.id) ||
        ingredientUses(state, action.id).length
      )
        return state;
      const pantry = { ...state.pantry };
      delete pantry[action.id];
      return {
        ...state,
        pantry,
        customIngredients: state.customIngredients.filter((i) => i.id !== action.id),
        experience: {
          ...state.experience,
          tools: {
            ...state.experience.tools,
            prices: Object.fromEntries(
              Object.entries(state.experience.tools.prices).filter(([id]) => id !== action.id),
            ),
            pantryDates: Object.fromEntries(
              Object.entries(state.experience.tools.pantryDates).filter(([id]) => id !== action.id),
            ),
          },
        },
      };
    }
    case 'ingredient': {
      if (!action.value.id.startsWith('ingredient-')) return state;
      const name = action.value.name.trim();
      if (
        !name ||
        allIngredients(state).some(
          (i) => i.id !== action.value.id && ingredientNameKey(i.name) === ingredientNameKey(name),
        )
      )
        return state;
      return {
        ...state,
        customIngredients: [
          ...state.customIngredients.filter((i) => i.id !== action.value.id),
          { ...action.value, name },
        ],
      };
    }
    case 'collection': {
      const name = action.value.name.trim().slice(0, 60);
      if (!name) return state;
      const value = {
        ...action.value,
        name,
        recipeIds: [...new Set(action.value.recipeIds)].filter((id) =>
          state.recipes.some((r) => r.id === id),
        ),
      };
      const collections = state.experience.collections.some((c) => c.id === value.id)
        ? state.experience.collections.map((c) => (c.id === value.id ? value : c))
        : [...state.experience.collections, value];
      return { ...state, experience: { ...state.experience, collections } };
    }
    case 'deleteCollection':
      return {
        ...state,
        experience: {
          ...state.experience,
          collections: state.experience.collections.filter((c) => c.id !== action.id),
        },
      };
    case 'collectionRecipe':
      if (!state.recipes.some((r) => r.id === action.recipeId)) return state;
      return {
        ...state,
        experience: {
          ...state.experience,
          collections: state.experience.collections.map((c) =>
            c.id === action.id ? { ...c, recipeIds: toggle(c.recipeIds, action.recipeId) } : c,
          ),
        },
      };
    case 'checkSavedExtra':
      return {
        ...state,
        savedLists: state.savedLists.map((list) =>
          list.id === action.id
            ? {
                ...list,
                extras: (list.extras ?? []).map((i) =>
                  i.id === action.extraId ? { ...i, checked: !i.checked } : i,
                ),
              }
            : list,
        ),
      };
    case 'favorite':
      return {
        ...state,
        experience: {
          ...state.experience,
          favorites: toggle(state.experience.favorites, action.id),
        },
      };
    case 'experience':
      return { ...state, experience: { ...state.experience, ...action.value } };
    case 'extra':
      return {
        ...state,
        experience: {
          ...state.experience,
          extras: [
            ...state.experience.extras.filter((i) => i.id !== action.value.id),
            action.value,
          ],
        },
      };
    case 'removeExtra':
      return {
        ...state,
        experience: {
          ...state.experience,
          extras: state.experience.extras.filter((i) => i.id !== action.id),
        },
      };
    case 'cooked':
      return {
        ...state,
        experience: {
          ...state.experience,
          cooked: [
            action.value,
            ...state.experience.cooked.filter((i) => i.id !== action.value.id),
          ],
        },
      };
    case 'profile':
      return { ...state, profile: action.value };
    case 'meal':
      return {
        ...state,
        meals: [
          ...state.meals.filter(
            (m) => !(m.date === action.value.date && m.slot === action.value.slot),
          ),
          action.value,
        ],
      };
    case 'removeMeal':
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) };
    case 'addMeals': {
      const occupied = new Set(state.meals.map((meal) => meal.date + ':' + meal.slot));
      const additions = action.values.filter((meal) => {
        const key = meal.date + ':' + meal.slot;
        if (occupied.has(key)) return false;
        occupied.add(key);
        return true;
      });
      return additions.length ? { ...state, meals: [...state.meals, ...additions] } : state;
    }
    case 'pantry':
      return { ...state, pantry: { ...state.pantry, [action.id]: action.grams } };
    case 'check':
      return {
        ...state,
        checked: {
          ...state.checked,
          [action.week]: toggle(state.checked[action.week] ?? [], action.key),
        },
      };
    case 'saveList':
      return { ...state, savedLists: [action.value, ...state.savedLists] };
    case 'deleteList':
      return { ...state, savedLists: state.savedLists.filter((l) => l.id !== action.id) };
    case 'checkSaved':
      return {
        ...state,
        savedLists: state.savedLists.map((l) =>
          l.id === action.id ? { ...l, checked: toggle(l.checked, action.key) } : l,
        ),
      };
    case 'recipe':
      return {
        ...state,
        recipes: state.recipes.some((r) => r.id === action.value.id)
          ? state.recipes.map((r) => (r.id === action.value.id ? action.value : r))
          : [...state.recipes, action.value],
      };
  }
}
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
