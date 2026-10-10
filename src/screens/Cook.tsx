import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { makeId } from '../domain/state';
import { timerRemaining } from '../domain/experience';
import { Text } from '../ui/Text';
import { Button, Chip, Empty, Field, Notice, Page } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { colors, styles as s } from '../ui/theme';
import { allIngredients } from '../domain/ingredients';
import { amountLabel, grams } from '../domain/logic';
import { recipeFingerprint } from '../domain/companion';
import { CookAwake } from '../ui/CookAwake';

export function Cook() {
  const focused = useIsFocused();
  const { id, servings: servingsParam } = useLocalSearchParams<{ id: string; servings?: string }>();
  const { state, dispatch } = useApp();
  const ingredients = allIngredients(state);
  const recipe = state.recipes.find((r) => r.id === id);
  const requested = Number(servingsParam);
  const servings =
    Number.isInteger(requested) && requested >= 1 && requested <= 12
      ? requested
      : (state.profile?.people ?? 2);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const fingerprint = recipe ? recipeFingerprint(recipe) : '';
  const savedSession = state.experience.tools.cooking[id];
  const session =
    savedSession?.fingerprint === fingerprint && savedSession.servings === servings
      ? savedSession
      : { fingerprint, step: 0, servings, deadline: null, seconds: 300 };
  const step = Math.min(session.step, (recipe?.steps.length ?? 1) - 1);
  const { deadline, seconds } = session;
  const updateSession = (value: Partial<typeof session>) =>
    dispatch({
      type: 'tools',
      value: {
        cooking: { ...state.experience.tools.cooking, [id]: { ...session, ...value } },
      },
    });
  const [now, setNow] = useState(Date.now);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [finished, setFinished] = useState(false);
  const [entryId] = useState(() => makeId('cooked'));
  useEffect(() => {
    if (deadline === null) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [deadline]);
  const remaining = timerRemaining(deadline, now, seconds);
  if (!recipe)
    return (
      <Page>
        <Empty title="Tarif bulunamadı" description="Tarif defterinden bir yemek seç." />
      </Page>
    );
  return (
    <Page maxWidth={680}>
      {focused && !finished && <CookAwake />}
      <Text style={s.eyebrow}>BİRLİKTE PİŞİRELİM</Text>
      <Text style={s.title}>{recipe.title}</Text>
      <Text style={s.muted}>
        {servings} kişilik hazırlanıyor · {recipe.minutes} dk toplam süre
      </Text>
      <RecipeImage
        id={id}
        style={{ width: 160, height: 160, borderRadius: 80, alignSelf: 'center' }}
      />
      {finished ? (
        <View style={s.card}>
          <Text style={s.h2}>Ellerine sağlık!</Text>
          <Text style={s.text}>Yemeğin ve notun pişirme geçmişine eklendi.</Text>
          <Button label="Pişirdiklerimi gör" onPress={() => router.replace('/history')} />
        </View>
      ) : (
        <>
          <Button
            label={ingredientsOpen ? 'Malzemeleri gizle' : servings + ' kişilik malzemeleri gör'}
            secondary
            onPress={() => setIngredientsOpen(!ingredientsOpen)}
          />
          {ingredientsOpen && (
            <View testID="cook-ingredients" style={s.card}>
              {recipe.ingredients.map((part, i) => (
                <View key={part.ingredientId + i} style={s.between}>
                  <Text style={[s.text, { flex: 1 }]}>
                    {ingredients.find((item) => item.id === part.ingredientId)?.name}
                  </Text>
                  <Text style={s.h3}>
                    {amountLabel(
                      (grams(part.quantity, part.unit) * servings) / recipe.baseServings,
                    )}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={s.card}>
            <Text style={[s.eyebrow, { color: colors.green }]}>
              ADIM {step + 1} / {recipe.steps.length}
            </Text>
            <View style={{ height: 5, backgroundColor: colors.line, borderRadius: 5 }}>
              <View
                style={{
                  height: 5,
                  backgroundColor: colors.green,
                  width: (((step + 1) / recipe.steps.length) * 100 + '%') as `${number}%`,
                }}
              />
            </View>
            <Text style={[s.h2, { fontSize: 23, lineHeight: 34 }]}>{recipe.steps[step]}</Text>
            <Button
              label="Önceki adım"
              secondary
              disabled={step === 0}
              onPress={() => updateSession({ step: step - 1 })}
            />
            {step < recipe.steps.length - 1 && (
              <Button label="Sonraki adım" onPress={() => updateSession({ step: step + 1 })} />
            )}
          </View>
          <View style={s.card}>
            <Text style={s.h3}>Mutfak sayacı</Text>
            <Text accessibilityLiveRegion="polite" style={[s.title, { textAlign: 'center' }]}>
              {String(Math.floor(remaining / 60)).padStart(2, '0')}:
              {String(remaining % 60).padStart(2, '0')}
            </Text>
            {deadline !== null && remaining === 0 && (
              <Notice text="Süre doldu. Yemeğini kontrol et." />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[1, 5, 10, 20].map((minutes) => (
                <Chip
                  key={minutes}
                  label={minutes + ' dakika'}
                  selected={deadline === null && seconds === minutes * 60}
                  onPress={() => {
                    updateSession({ deadline: null, seconds: minutes * 60 });
                  }}
                />
              ))}
            </View>
            <Button
              label={deadline === null ? 'Sayacı başlat' : 'Sayacı duraklat'}
              secondary
              disabled={deadline === null && seconds === 0}
              onPress={() => {
                if (deadline === null) {
                  const timestamp = Date.now();
                  setNow(timestamp);
                  updateSession({ deadline: timestamp + seconds * 1000 });
                } else {
                  updateSession({
                    seconds: timerRemaining(deadline, Date.now(), seconds),
                    deadline: null,
                  });
                }
              }}
            />
            <Text style={[s.muted, { fontSize: 12 }]}>
              Adımın ve sayacın kaydedilir; geri geldiğinde kaldığın yerden devam eder. Arka planda
              sesli alarm göndermez.
            </Text>
          </View>
          {step === recipe.steps.length - 1 && (
            <View style={s.card}>
              <Text style={s.h2}>Nasıl oldu?</Text>
              <Text style={s.muted}>Puan ve not yalnızca senin tarif defterinde saklanır.</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip
                    key={n}
                    label={n + ' yıldız'}
                    selected={rating === n}
                    onPress={() => setRating(rating === n ? 0 : n)}
                  />
                ))}
              </View>
              <Field
                label="Bir sonraki sefere notum"
                multiline
                maxLength={600}
                value={note}
                onChangeText={setNote}
              />
              <Button
                label="Pişirdim, kaydet"
                onPress={() => {
                  dispatch({
                    type: 'cooked',
                    value: {
                      id: entryId,
                      recipeId: id,
                      at: new Date().toISOString(),
                      rating,
                      note,
                    },
                  });
                  const cooking = { ...state.experience.tools.cooking };
                  delete cooking[id];
                  dispatch({ type: 'tools', value: { cooking } });
                  setFinished(true);
                }}
              />
            </View>
          )}
        </>
      )}
    </Page>
  );
}
