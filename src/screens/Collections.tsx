import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { makeId } from '../domain/state';
import { Text } from '../ui/Text';
import { Button, Chip, Empty, Field, Notice, Page } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { colors, styles as s } from '../ui/theme';
export function Collections() {
  const { state, dispatch } = useApp();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const collection = state.experience.collections.find((c) => c.id === id);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [manage, setManage] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  if (id && !collection)
    return (
      <Page>
        <Empty title="Koleksiyon bulunamadı" description="Bu koleksiyon kaldırılmış olabilir." />
        <Button label="Koleksiyonlarıma dön" onPress={() => router.replace('/collections')} />
      </Page>
    );
  return (
    <Page maxWidth={840}>
      <Text style={s.eyebrow}>SANA AİT BİR TARİF DEFTERİ</Text>
      <Text style={s.title}>{collection?.name ?? 'Koleksiyonlarım'}</Text>
      <Text style={s.muted}>
        {collection
          ? collection.recipeIds.length + ' tarif · Cihazında saklanır'
          : 'Hafta içi kurtarıcıları, misafir sofraları, pazar kahvaltıları… Sevdiğin tarifleri bir araya getir.'}
      </Text>
      {!collection && (
        <>
          <View style={[s.card, { backgroundColor: '#F9E9AD' }]}>
            <Text style={s.h2}>Yeni bir sayfa aç</Text>
            <Field
              label="Koleksiyon adı"
              value={name}
              onChangeText={setName}
              maxLength={60}
              placeholder="Örneğin: Hızlı akşamlar"
            />
            <Button
              label="Koleksiyon oluştur"
              disabled={!name.trim()}
              icon="add"
              onPress={() => {
                const existing = state.experience.collections.find(
                  (c) => c.name.toLocaleLowerCase('tr') === name.trim().toLocaleLowerCase('tr'),
                );
                if (existing) {
                  setNotice('Bu isimde bir koleksiyonun zaten var.');
                  return;
                }
                dispatch({
                  type: 'collection',
                  value: { id: makeId('collection'), name: name.trim(), recipeIds: [] },
                });
                setName('');
                setNotice('Koleksiyonun hazır. Tarif eklemek için aç.');
              }}
            />
          </View>
          {state.experience.collections.map((c, index) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={c.name + ' koleksiyonunu aç'}
              onPress={() => router.push({ pathname: '/collections/[id]', params: { id: c.id } })}
              style={[s.card, { backgroundColor: ['#F9E9AD', '#DEE8CB', '#E7DEF0'][index % 3] }]}
            >
              <View style={s.between}>
                <View style={{ flex: 1 }}>
                  <Text style={s.h2}>{c.name}</Text>
                  <Text style={s.muted}>{c.recipeIds.length} tarif</Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color={colors.ink} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {c.recipeIds.slice(0, 4).map((recipeId) => (
                  <RecipeImage
                    key={recipeId}
                    id={recipeId}
                    style={{ width: 60, height: 60, borderRadius: 30 }}
                  />
                ))}
                {!c.recipeIds.length && <Text style={s.muted}>İlk tarifini seç →</Text>}
              </View>
            </Pressable>
          ))}
        </>
      )}
      {collection && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Tarif ekle / çıkar" selected={manage} onPress={() => setManage(!manage)} />
            <Chip
              label="Adını değiştir"
              selected={editing}
              onPress={() => {
                setName(collection.name);
                setEditing(!editing);
              }}
            />
          </View>
          {editing && (
            <View style={s.card}>
              <Field
                label="Yeni koleksiyon adı"
                value={name}
                onChangeText={setName}
                maxLength={60}
              />
              <Button
                label="Koleksiyon adını kaydet"
                disabled={!name.trim()}
                onPress={() => {
                  dispatch({ type: 'collection', value: { ...collection, name } });
                  setEditing(false);
                }}
              />
            </View>
          )}
          {manage && (
            <View style={s.card}>
              <Text style={s.h2}>Bu koleksiyonda olsun</Text>
              <Field label="Koleksiyona tarif ara" value={query} onChangeText={setQuery} />
              <View style={{ gap: 8 }}>
                {state.recipes
                  .filter((r) =>
                    r.title.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
                  )
                  .map((r) => (
                    <Chip
                      key={r.id}
                      label={r.title}
                      selected={collection.recipeIds.includes(r.id)}
                      onPress={() =>
                        dispatch({ type: 'collectionRecipe', id: collection.id, recipeId: r.id })
                      }
                    />
                  ))}
              </View>
            </View>
          )}
          {!collection.recipeIds.length && !manage && (
            <Empty
              title="Bu sayfa seninle dolacak"
              description="Tarif ekle / çıkar düğmesinden yemeklerini seç."
            />
          )}
          {!manage &&
            collection.recipeIds.map((recipeId) => {
              const recipe = state.recipes.find((r) => r.id === recipeId)!;
              return (
                <Pressable
                  key={recipeId}
                  style={[s.card, s.row]}
                  accessibilityRole="button"
                  accessibilityLabel={recipe.title + ' tarifini aç'}
                  onPress={() =>
                    router.push({ pathname: '/recipe/[id]', params: { id: recipeId } })
                  }
                >
                  <RecipeImage id={recipeId} style={{ width: 84, height: 84, borderRadius: 42 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.h3}>{recipe.title}</Text>
                    <Text style={s.muted}>{recipe.minutes} dk</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.ink} />
                </Pressable>
              );
            })}
          {confirm ? (
            <View style={s.card}>
              <Text style={s.text}>
                Koleksiyon silinecek. İçindeki tarifler, favorilerin ve menün korunur.
              </Text>
              <Button
                label="Evet, koleksiyonu sil"
                onPress={() => {
                  dispatch({ type: 'deleteCollection', id: collection.id });
                  router.replace('/collections');
                }}
              />
              <Button label="Vazgeç" secondary onPress={() => setConfirm(false)} />
            </View>
          ) : (
            <Button label="Koleksiyonu sil" secondary onPress={() => setConfirm(true)} />
          )}
          <Button
            label="Tüm koleksiyonlarım"
            secondary
            onPress={() => router.replace('/collections')}
          />
        </>
      )}
      {!!notice && <Notice text={notice} />}
      <Button
        label="Favorilerim"
        secondary
        icon="heart-outline"
        onPress={() => router.push('/favorites')}
      />
    </Page>
  );
}
