import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { buildShoppingList, dateLabel, itemKey, mealsInWeek } from '../domain/logic';
import { Button, Empty, Page, WeekPicker } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
export function ReadyToCook() {
  const { state, week } = useApp();
  const meals = mealsInWeek(state, week);
  const items = buildShoppingList(meals, state.recipes, state.pantry, allIngredients(state));
  const checked = state.checked[week] ?? [];
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>ÖNLÜĞÜNÜ TAK</Text>
      <Text style={s.title}>Pişirme sırası sende</Text>
      <WeekPicker />
      <Text style={s.muted}>
        Evde olanlar ve listede aldım diye işaretlediklerin hazırlık durumunu belirler. Tariflere
        her zaman başlayabilirsin.
      </Text>
      {!meals.length && (
        <Empty
          title="Henüz yemek seçmedin"
          description="Haftanın menüsünü hazırlayıp buradan pişirmeye başlayabilirsin."
        />
      )}
      {meals.map((meal) => {
        const recipe = state.recipes.find((r) => r.id === meal.recipeId)!;
        const missing = items.filter(
          (i) =>
            i.ingredientId !== 'water' &&
            i.grams > 0 &&
            recipe.ingredients.some((p) => p.ingredientId === i.ingredientId) &&
            !checked.includes(itemKey(i)),
        );
        return (
          <View key={meal.id} style={s.card}>
            <View style={s.row}>
              <RecipeImage id={recipe.id} style={{ width: 70, height: 70, borderRadius: 35 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{recipe.title}</Text>
                <Text style={s.muted}>
                  {dateLabel(meal.date, { weekday: 'long' })} ·{' '}
                  {meal.slot === 'dinner' ? 'Akşam' : 'Öğle'} · {meal.servings} kişilik
                </Text>
              </View>
            </View>
            <Text style={s.muted}>
              {missing.length
                ? `${missing.length} malzeme listende bekliyor: ${missing.map((i) => i.name).join(', ')}`
                : 'Malzemeler hazır görünüyor ✓'}
            </Text>
            <Button
              label={recipe.title + ' pişirmeye başla'}
              onPress={() =>
                router.push({
                  pathname: '/cook/[id]',
                  params: { id: recipe.id, servings: String(meal.servings) },
                })
              }
            />
          </View>
        );
      })}
      <Button label="Haftamı hazırla" secondary onPress={() => router.push('/prepare-week')} />
    </Page>
  );
}
