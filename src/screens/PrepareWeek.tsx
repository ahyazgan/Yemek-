import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { suggestDinners } from '../domain/planning';
import { makeId } from '../domain/state';
import { dateLabel } from '../domain/logic';
import { budgetLabels, dietLabels } from '../domain/model';
import { Button, Chip, Notice, Page, WeekPicker } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { Text } from '../ui/Text';
import { colors, styles as s } from '../ui/theme';

export function PrepareWeek() {
  const { state, dispatch, week } = useApp();
  const [target, setTarget] = useState(5);
  const [variation, setVariation] = useState(0);
  const insets = useSafeAreaInsets();
  if (!state.profile) return null;
  const result = suggestDinners(state, week, target, variation);
  const { suggestions, existingCount, missingCount } = result;
  const add = () => {
    dispatch({
      type: 'addMeals',
      values: suggestions.map((meal) => ({ ...meal, id: makeId('meal') })),
    });
    router.dismissTo('/plan');
  };
  return (
    <View style={s.page}>
      <Page maxWidth={780}>
        <View style={{ alignItems: 'center', gap: 8, paddingTop: 12 }}>
          <Text style={[s.title, { textAlign: 'center' }]}>Haftanı birlikte hazırlayalım</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>
            {state.profile.people} kişilik · {budgetLabels[state.profile.budget]} ·{' '}
            {state.profile.diets.map((diet) => dietLabels[diet]).join(', ') || 'Tüm yemekler'}
          </Text>
        </View>
        <WeekPicker />
        <Button
          label="Sofra asistanına yaz"
          secondary
          icon="chatbubble-outline"
          onPress={() => router.push('/menu-assistant')}
        />
        <Button
          label="TL bütçeme göre planla"
          secondary
          icon="wallet-outline"
          onPress={() => router.push('/budget')}
        />
        <View style={[s.card, { alignItems: 'center' }]}>
          <Text style={s.h3}>Bu hafta kaç akşam pişireceksin?</Text>
          <View style={[s.row, { gap: 8 }]}>
            {[3, 5, 7].map((count) => (
              <Chip
                key={count}
                label={count + ' akşam'}
                selected={target === count}
                onPress={() => {
                  setTarget(count);
                  setVariation(0);
                }}
              />
            ))}
          </View>
          <Text style={[s.muted, { fontSize: 12, textAlign: 'center' }]}>
            Tercihlerine uygun, farklı yemekler öneriyoruz.
          </Text>
        </View>
        {existingCount > 0 && (
          <Notice
            text={
              existingCount + ' akşam yemeğin korunacak. Öneriler yalnızca boş akşamlara eklenir.'
            }
          />
        )}
        {suggestions.length > 0 && (
          <View style={s.between}>
            <Text style={s.h2}>{suggestions.length} yeni öneri</Text>
            <Text style={[s.muted, { fontSize: 12 }]}>Henüz menüne eklenmedi</Text>
          </View>
        )}
        {suggestions.map((meal) => {
          const recipe = state.recipes.find((item) => item.id === meal.recipeId)!;
          return (
            <View
              key={meal.date}
              testID="suggested-dinner"
              style={[s.card, s.row, { padding: 14 }]}
            >
              <RecipeImage id={recipe.id} style={{ width: 72, height: 72, borderRadius: 36 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.green, fontSize: 12 }}>
                  {dateLabel(meal.date, { weekday: 'long' })} · Akşam
                </Text>
                <Text style={s.h3}>{recipe.title}</Text>
                <Text style={[s.muted, { fontSize: 12 }]}>
                  {recipe.minutes} dk · {meal.servings} kişilik
                </Text>
              </View>
            </View>
          );
        })}
        {missingCount > 0 && (
          <View style={s.card}>
            <Text style={s.h3}>Bu tercihlerle seçeneklerimiz sınırlı</Text>
            <Text style={s.muted}>
              {target} akşamı farklı yemeklerle tamamlamak için {missingCount} tarif daha gerekiyor.
              Mevcut önerileri ekleyebilir, aynı yemeği başka bir güne kendin seçebilir veya
              tercihlerini değiştirebilirsin.
            </Text>
            <Button
              label="Tercihlerimi düzenle"
              secondary
              onPress={() => router.push('/preferences')}
            />
          </View>
        )}
        {existingCount >= target && (
          <View style={[s.card, { backgroundColor: colors.yellow }]}>
            <Text style={s.h2}>Menün zaten hazır</Text>
            <Text style={s.text}>
              Bu hafta {existingCount} akşam yemeğin var. Menüm ekranından yemekleri değiştirebilir
              veya alışveriş listene geçebilirsin.
            </Text>
          </View>
        )}
        {suggestions.length > 0 && (
          <Button
            label="Başka öneriler"
            secondary
            icon="shuffle-outline"
            disabled={result.candidateCount <= 1}
            onPress={() => setVariation((value) => value + 1)}
          />
        )}
        <Text style={[s.muted, { fontSize: 12, textAlign: 'center' }]}>
          Menüye ekledikten sonra her yemeği değiştirebilirsin. Alışveriş listen porsiyonlara göre
          hazırlanır.
        </Text>
      </Page>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderColor: colors.line,
        }}
      >
        <View style={{ width: '100%', maxWidth: 740, alignSelf: 'center' }}>
          <Button
            label={suggestions.length ? suggestions.length + ' yemeği menüme ekle' : 'Menüme git'}
            icon={suggestions.length ? 'checkmark' : 'arrow-forward'}
            onPress={suggestions.length ? add : () => router.dismissTo('/plan')}
          />
        </View>
      </View>
    </View>
  );
}
