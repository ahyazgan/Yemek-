import { Equipment } from '../domain/model';

// Requirements follow the written method, not inferred alternative cooking methods.
export const recipeEquipment: Record<string, Equipment[]> = {
  mercimek: ['hob', 'blender'],
  menemen: ['hob'],
  bulgur: ['hob'],
  nohut: ['hob'],
  kabak: ['hob'],
  tavuk: ['hob'],
  ispanak: ['hob'],
  fasulye: ['hob'],
  ezogelin: ['hob'],
  kisir: ['hob'],
  coban: [],
  omlet: ['hob'],
  makarna: ['hob'],
  firinsebze: ['oven'],
  mantar: ['hob'],
  sutlac: ['hob', 'fridge'],
  yayla: ['hob'],
  pirasa: ['hob'],
  bezelye: ['hob'],
  barbunya: ['hob'],
  mucver: ['oven'],
  semizotu: [],
  brokoli: ['hob', 'blender'],
  irmik: ['hob', 'fridge'],
};
