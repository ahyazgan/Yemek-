import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { pantrySuggestions } from '../domain/discovery';
import { matchesExperience } from '../domain/experience';
import { amountLabel, filterRecipes } from '../domain/logic';
import { allIngredients } from '../domain/ingredients';
import { Text } from '../ui/Text';
import { Button, Chip, Empty, Page, Stepper } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { styles as s } from '../ui/theme';
export function PantryRecipes() {
  const { state } = useApp();
  const ingredients = allIngredients(state);
  const [people, setPeople] = useState(state.profile?.people ?? 2);
  const [onlyReady, setOnlyReady] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const candidates = filterRecipes(
    state.recipes,
    '',
    'all',
    'all',
    state.profile,
    true,
    ingredients,
  ).filter((r) => matchesExperience(r, state.experience));
  const suggestions = pantrySuggestions(candidates, state.pantry, people).filter(
    (r) => !onlyReady || r.match.missing === 0,
  );
  return (
    <Page maxWidth={840}>
      <Text style={s.eyebrow}>MUTFAĞINDAN İLHAM AL</Text>
      <Text style={s.title}>Evdekilerle ne pişirsem?</Text>
      <Text style={s.muted}>
        Kaydettiğin stok miktarlarına ve tercihlerine göre sıraladık. Su sayılmaz; yağ, tuz ve
        baharatların da miktarı kontrol edilir.
      </Text>
      <View style={[s.card, { backgroundColor: '#DEE8CB' }]}>
        <Stepper label="Kişi sayısı" value={people} onChange={setPeople} />
        <Chip
          label="Sadece tüm malzemeleri yeterli olanlar"
          selected={onlyReady}
          onPress={() => setOnlyReady(!onlyReady)}
        />
        <Button
          label="Evdeki malzemelerimi düzenle"
          secondary
          onPress={() => router.push('/kitchen')}
        />
      </View>
      {suggestions.map(({ recipe, match }) => (
        <View key={recipe.id} testID="pantry-suggestion" style={s.card}>
          <View style={s.row}>
            <RecipeImage id={recipe.id} style={{ width: 88, height: 88, borderRadius: 44 }} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.h3}>{recipe.title}</Text>
              <Text style={s.muted}>
                {recipe.minutes} dk · {people} kişilik
              </Text>
              <Text style={s.h3}>
                {match.covered}/{match.total} malzemenin miktarı yeterli
              </Text>
            </View>
          </View>
          <Text style={s.muted}>
            {match.missing === 0
              ? 'Kaydettiğin stokla bu tarifi hazırlayabilirsin.'
              : match.missing + ' malzemeyi tamamlaman gerekiyor.'}
          </Text>
          <View style={{ gap: 8 }}>
            <Button
              label={recipe.title + ' tarifini aç'}
              onPress={() =>
                router.push({
                  pathname: '/recipe/[id]',
                  params: { id: recipe.id, servings: String(people) },
                })
              }
            />
            {!!match.missing && (
              <Button
                label={expanded === recipe.id ? 'Eksikleri gizle' : 'Eksik miktarları gör'}
                secondary
                onPress={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
              />
            )}
          </View>
          {expanded === recipe.id &&
            match.parts
              .filter((p) => p.missing >= 0.0001)
              .map((p) => (
                <View key={p.ingredientId} style={s.between}>
                  <Text style={s.text}>
                    {ingredients.find((i) => i.id === p.ingredientId)?.name}
                  </Text>
                  <Text style={s.h3}>{amountLabel(p.missing)}</Text>
                </View>
              ))}
        </View>
      ))}
      {!suggestions.length && (
        <Empty
          title={onlyReady ? 'Tüm malzemeleri yeten tarif yok' : 'Önce mutfağına bakalım'}
          description="Evdeki malzemelerini gram olarak kaydet. Tercihlerinle eşleşen tarifler burada sıralanır."
        />
      )}
    </Page>
  );
}
