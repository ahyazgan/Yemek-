import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { Text } from '../ui/Text';
import { Button, Chip, Empty, Field, Notice, Page } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { styles as s } from '../ui/theme';
import { recipeUses } from '../domain/sharing';

export function Library({ kind }: { kind: 'favorites' | 'mine' | 'history' }) {
  const { state, dispatch } = useApp();
  const [deleting, setDeleting] = useState<string | null>(null);
  const list = state.recipes.filter((r) =>
    kind === 'favorites' ? state.experience.favorites.includes(r.id) : r.id.startsWith('custom-'),
  );
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>TARİF DEFTERİN</Text>
      <Text style={s.title}>
        {kind === 'favorites'
          ? 'Favorilerim'
          : kind === 'mine'
            ? 'Benim tariflerim'
            : 'Pişirdiklerim'}
      </Text>
      {kind === 'mine' && (
        <View style={{ gap: 10 }}>
          <Button label="Yeni tarif ekle" icon="add" onPress={() => router.push('/new-recipe')} />
          <Button
            label="Tarif aktar"
            icon="document-text-outline"
            secondary
            onPress={() => router.push('/import-recipe')}
          />
        </View>
      )}
      {kind === 'favorites' && (
        <Button
          label="Koleksiyonlarım"
          icon="albums-outline"
          secondary
          onPress={() => router.push('/collections')}
        />
      )}
      {kind === 'history' ? (
        state.experience.cooked.length ? (
          state.experience.cooked.map((entry) => (
            <View key={entry.id} style={s.card}>
              <Text style={s.h2}>
                {state.recipes.find((r) => r.id === entry.recipeId)?.title ?? 'Tarif'}
              </Text>
              <Text style={s.muted}>
                {new Date(entry.at).toLocaleDateString('tr-TR')} ·{' '}
                {entry.rating ? entry.rating + '/5' : 'Puan verilmedi'}
              </Text>
              {!!entry.note && <Text style={s.text}>{entry.note}</Text>}
              <Button
                label="Tekrar pişir"
                secondary
                onPress={() =>
                  router.push({ pathname: '/cook/[id]', params: { id: entry.recipeId } })
                }
              />
            </View>
          ))
        ) : (
          <Empty
            title="İlk yemeğini pişirelim"
            description="Bir tarif açıp Pişirmeye başla seçeneğini kullan. Tamamladığın yemekler burada birikir."
          />
        )
      ) : list.length ? (
        list.map((recipe) => (
          <View key={recipe.id} style={[s.card, { gap: 12 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recipe.title + ' tarifini aç'}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
              style={s.row}
            >
              <RecipeImage id={recipe.id} style={{ width: 80, height: 80, borderRadius: 40 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{recipe.title}</Text>
                <Text style={s.muted}>
                  {recipe.minutes} dk · {recipe.baseServings} kişilik
                </Text>
              </View>
            </Pressable>
            {kind === 'favorites' && (
              <Button
                label={recipe.title + ' favorilerden çıkar'}
                secondary
                onPress={() => dispatch({ type: 'favorite', id: recipe.id })}
              />
            )}
            {kind === 'mine' && (
              <View style={{ gap: 8 }}>
                {recipeUses(state, recipe.id).length > 0 ? (
                  <Text style={s.muted}>
                    Bu tarif {recipeUses(state, recipe.id).join(' ve ')} kullanılıyor; kayıtlarını
                    korumak için silinemez.
                  </Text>
                ) : deleting === recipe.id ? (
                  <>
                    <Text style={s.error}>
                      Tarif defterinden, favorilerden ve koleksiyonlardan kaldırılacak. Kayıtlı
                      alışveriş listeleri korunur.
                    </Text>
                    <Button
                      label="Tarifi kalıcı sil"
                      onPress={() => {
                        dispatch({ type: 'deleteRecipe', id: recipe.id });
                        setDeleting(null);
                      }}
                    />
                    <Button label="Vazgeç" secondary onPress={() => setDeleting(null)} />
                  </>
                ) : (
                  <Button
                    label={recipe.title + ' tarifini sil'}
                    secondary
                    onPress={() => setDeleting(recipe.id)}
                  />
                )}
              </View>
            )}
          </View>
        ))
      ) : (
        <Empty
          title={kind === 'favorites' ? 'Sevdiğin yemekleri burada sakla' : 'Kendi tarif defterin'}
          description={
            kind === 'favorites'
              ? 'Tarif detayındaki kalbe dokunarak favorilerine ekle.'
              : 'Malzemelerini ve adımlarını gir; alışveriş listen otomatik hesaplansın.'
          }
        />
      )}
      <Button label="Tarifleri keşfet" secondary onPress={() => router.navigate('/')} />
    </Page>
  );
}
export function Taste() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const { excludedIngredients, maxMinutes } = state.experience;
  const ingredients = allIngredients(state);
  return (
    <Page maxWidth={700}>
      <Text style={s.title}>Damak zevkim</Text>
      <Text style={s.muted}>
        Bu seçimler kişisel tarif önerilerini ve haftalık menü hazırlamayı etkiler.
      </Text>
      <View style={s.card}>
        <Text style={s.h2}>Mutfakta ne kadar vaktin var?</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[null, 20, 30, 45, 60].map((value) => (
            <Chip
              key={String(value)}
              label={value ? value + ' dk' : 'Süre sınırı yok'}
              selected={maxMinutes === value}
              onPress={() => {
                dispatch({ type: 'experience', value: { maxMinutes: value } });
                setNotice('Tercihin kaydedildi.');
              }}
            />
          ))}
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Önerilerimde olmasın</Text>
        <Text style={s.muted}>
          Sevmediğin malzemeleri seç. Bu filtre ürün etiketi veya alerjen güvenliği kontrolü yerine
          geçmez.
        </Text>
        <Field label="İstemediğin malzemeyi ara" value={query} onChangeText={setQuery} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ingredients
            .filter(
              (i) =>
                !query || i.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
            )
            .map((i) => (
              <Chip
                key={i.id}
                label={i.name}
                selected={excludedIngredients.includes(i.id)}
                onPress={() => {
                  dispatch({
                    type: 'experience',
                    value: {
                      excludedIngredients: excludedIngredients.includes(i.id)
                        ? excludedIngredients.filter((id) => id !== i.id)
                        : [...excludedIngredients, i.id],
                    },
                  });
                  setNotice('Malzeme tercihin kaydedildi.');
                }}
              />
            ))}
        </View>
      </View>
      {!!notice && <Notice text={notice} />}
      {Object.keys(state.experience.tools.feedback).length > 0 && (
        <View style={s.card}>
          <Text style={s.h2}>Yemek tercihlerim</Text>
          {Object.entries(state.experience.tools.feedback).map(([id, value]) => (
            <View key={id} style={{ gap: 8 }}>
              <Text style={s.text}>
                {state.recipes.find((r) => r.id === id)?.title} ·{' '}
                {value === 'avoid' ? 'Önerme' : 'Daha sık öner'}
              </Text>
              <Button
                label={
                  (state.recipes.find((r) => r.id === id)?.title ?? 'Tarif') + ' tercihini kaldır'
                }
                secondary
                onPress={() => {
                  const feedback = { ...state.experience.tools.feedback };
                  delete feedback[id];
                  dispatch({ type: 'tools', value: { feedback } });
                }}
              />
            </View>
          ))}
        </View>
      )}
      <Button label="Haftamı hazırla" onPress={() => router.push('/prepare-week')} />
      <Button label="Ekipmanlarım" secondary onPress={() => router.push('/equipment')} />
    </Page>
  );
}
