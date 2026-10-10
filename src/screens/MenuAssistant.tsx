import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { assistantMenu, MenuRequest, parseMenuRequest } from '../domain/menuAssistant';
import { makeId } from '../domain/state';
import { dateLabel } from '../domain/logic';
import { Button, Chip, Field, Notice, Page, WeekPicker } from '../ui/components';
import { Text } from '../ui/Text';
import { RecipeImage } from '../ui/RecipeImage';
import { styles as s } from '../ui/theme';
export function MenuAssistant() {
  const { state, dispatch, week } = useApp();
  const [text, setText] = useState('3 akşam, 2 kişilik, 30 dakika, fırınsız');
  const [request, setRequest] = useState<MenuRequest | null>(null);
  const [error, setError] = useState('');
  const result = request ? assistantMenu(state, week, request) : null;
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>SOFRA ASİSTANI</Text>
      <Text style={s.title}>Nasıl bir hafta olsun?</Text>
      <Text style={s.muted}>
        İsteğini tarif defterindeki yemeklerle eşleştirelim. Kayıtlı beslenme, malzeme ve ekipman
        tercihlerin korunur.
      </Text>
      <WeekPicker />
      <Field
        label="Menü isteğin"
        multiline
        maxLength={300}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setRequest(null);
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {['3 akşam, 20 dakika', '5 akşam, vejetaryen', '3 akşam, 2 kişilik, fırınsız'].map(
          (example) => (
            <Chip
              key={example}
              label={example}
              selected={text === example}
              onPress={() => {
                setText(example);
                setRequest(null);
              }}
            />
          ),
        )}
      </View>
      <Button
        label="İsteğime göre öner"
        onPress={() => {
          try {
            setRequest(parseMenuRequest(text));
            setError('');
          } catch (e) {
            setError((e as Error).message);
            setRequest(null);
          }
        }}
      />
      {!!error && <Notice text={error} />}
      {request && result && (
        <>
          <View style={s.card}>
            <Text style={s.h2}>İsteğini böyle anladım</Text>
            <Text style={s.text}>
              {request.evenings} akşam · {request.people ?? state.profile?.people} kişilik
              {request.minutes ? ` · en fazla ${request.minutes} dk` : ''}
              {request.noOven ? ' · fırınsız' : ''}
            </Text>
            <Text style={s.muted}>Önizleme menünü değiştirmez. Mevcut öğünler korunur.</Text>
          </View>
          {result.suggestions.map((meal) => {
            const recipe = state.recipes.find((r) => r.id === meal.recipeId)!;
            return (
              <View style={[s.card, s.row]} key={meal.date}>
                <RecipeImage id={recipe.id} style={{ width: 64, height: 64, borderRadius: 32 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.h3}>{recipe.title}</Text>
                  <Text style={s.muted}>
                    {dateLabel(meal.date, { weekday: 'long' })} · {meal.servings} kişilik ·{' '}
                    {recipe.minutes} dk
                  </Text>
                </View>
              </View>
            );
          })}
          {!!result.missingCount && (
            <Notice
              text={`${result.missingCount} akşam için uygun farklı tarif bulunamadı. Tercihlerin gevşetilmedi.`}
            />
          )}
          {!!result.suggestions.length && (
            <Button
              label="Bu önerileri menüme ekle"
              onPress={() => {
                dispatch({
                  type: 'addMeals',
                  values: result.suggestions.map((m) => ({ ...m, id: makeId('meal') })),
                });
                router.push('/plan');
              }}
            />
          )}
        </>
      )}
      <Text style={[s.muted, { fontSize: 12 }]}>
        Akşam/kişi sayısı, süre, beslenme ve fırınsız seçimlerini destekler. Genel amaçlı yapay zekâ
        değildir; tarif veya fiyat üretmez.
      </Text>
    </Page>
  );
}
