import type { Companion } from './companion';
import type { RecipePhoto } from './recipeMedia';
import type { HouseholdDemo } from './household';
export type Diet = 'vegetarian' | 'vegan' | 'glutenFree';
export type Budget = 'economic' | 'balanced' | 'flexible';
export type Equipment = 'hob' | 'oven' | 'blender' | 'fridge' | 'airfryer' | 'multicooker';
export type Category =
  'Sebze & meyve' | 'Bakliyat & tahıl' | 'Süt & yumurta' | 'Et & tavuk' | 'Temel gıda';
export type Profile = { people: number; diets: Diet[]; budget: Budget };
export type Ingredient = { id: string; name: string; category: Category };
export type RecipeIngredient = { ingredientId: string; quantity: number; unit: 'g' | 'kg' };
export type RecipeCategory = 'main' | 'soup' | 'breakfast' | 'salad' | 'side' | 'dessert';
export type RecipeCollection = { id: string; name: string; recipeIds: string[] };
export type RecipeDetails = {
  prepMinutes: number;
  cookMinutes: number;
  restMinutes: number;
  difficulty: 'easy' | 'medium';
  tips: string[];
  servingSuggestion: string;
};
export type Recipe = {
  photo?: RecipePhoto | null;
  source?: { url: string; author: string; importedAt: string } | null;
  enrichment?: {
    fingerprint: string;
    video: { url: string; credit: string } | null;
    nutrition: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
      source: string;
      recordedOn: string;
    } | null;
  } | null;
  equipment?: Equipment[] | null;
  details?: RecipeDetails | null;
  category?: RecipeCategory;
  id: string;
  title: string;
  description: string;
  minutes: number;
  baseServings: number;
  diets: Diet[];
  budget: Budget;
  color: string;
  art: 'soup' | 'rice' | 'stew' | 'greens' | 'eggs';
  ingredients: RecipeIngredient[];
  steps: string[];
};
export type Meal = {
  id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  recipeId: string;
  servings: number;
};
export type ShoppingItem = {
  ingredientId: string;
  name: string;
  category: Category;
  totalGrams: number;
  pantryGrams: number;
  grams: number;
  recipeTitles: string[];
};
export type SavedList = {
  extras?: ExtraItem[];
  id: string;
  name: string;
  createdAt: string;
  week: string;
  items: ShoppingItem[];
  checked: string[];
};
export type AppState = {
  householdDemo?: HouseholdDemo | null;
  customIngredients: Ingredient[];
  version: 1;
  profile: Profile | null;
  recipes: Recipe[];
  meals: Meal[];
  pantry: Record<string, number>;
  checked: Record<string, string[]>;
  savedLists: SavedList[];
  experience: Experience;
};
export type ExtraItem = {
  id: string;
  week: string;
  name: string;
  quantity: number;
  unit: 'adet' | 'paket' | 'g' | 'ml';
  checked: boolean;
};
export type CookedMeal = { id: string; recipeId: string; at: string; rating: number; note: string };
export type Experience = {
  tools: Companion;
  equipment: Equipment[] | null;
  collections: RecipeCollection[];
  favorites: string[];
  excludedIngredients: string[];
  maxMinutes: number | null;
  extras: ExtraItem[];
  cooked: CookedMeal[];
  preferredMarket: 'migros' | 'trendyol' | 'carrefoursa' | null;
  reminder: { enabled: boolean; day: number; time: string };
};
export const dietLabels: Record<Diet, string> = {
  vegetarian: 'Vejetaryen',
  vegan: 'Vegan',
  glutenFree: 'Glutensiz',
};
export const budgetLabels: Record<Budget, string> = {
  economic: 'Ekonomik',
  balanced: 'Dengeli',
  flexible: 'Esnek',
};
