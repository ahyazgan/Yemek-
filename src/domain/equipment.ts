import { Equipment, Recipe } from './model';

export const equipmentLabels: Record<Equipment, string> = {
  hob: 'Ocak',
  oven: 'Fırın',
  blender: 'Blender',
  fridge: 'Buzdolabı',
  airfryer: 'Airfryer',
  multicooker: 'Çok amaçlı pişirici',
};
export const equipmentKeys = Object.keys(equipmentLabels) as Equipment[];
export function matchesEquipment(recipe: Recipe, available: Equipment[] | null) {
  if (available === null) return true;
  // An unspecified requirement is not the same as a recipe requiring no appliances.
  return recipe.equipment != null && recipe.equipment.every((item) => available.includes(item));
}
export function missingEquipment(recipe: Recipe, available: Equipment[] | null) {
  return available === null
    ? []
    : (recipe.equipment ?? []).filter((item) => !available.includes(item));
}
