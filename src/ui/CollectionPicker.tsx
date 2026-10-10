import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { makeId } from '../domain/state';
import { Text } from './Text';
import { Button, Chip, Field, Notice } from './components';
import { styles as s } from './theme';
export function CollectionPicker({ recipeId }: { recipeId: string }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const selected = state.experience.collections.filter((c) => c.recipeIds.includes(recipeId));
  return (
    <View style={{ gap: 10 }}>
      <Button
        label={selected.length ? 'Koleksiyonlarım · ' + selected.length : 'Koleksiyona ekle'}
        icon="albums-outline"
        secondary
        onPress={() => setOpen(!open)}
      />
      {open && (
        <View style={[s.card, { gap: 12 }]}>
          <Text style={s.h3}>Tarifini nerede saklayalım?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {state.experience.collections.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={c.recipeIds.includes(recipeId)}
                onPress={() => {
                  dispatch({ type: 'collectionRecipe', id: c.id, recipeId });
                  setNotice('Koleksiyonun güncellendi.');
                }}
              />
            ))}
          </View>
          <Field
            label="Yeni koleksiyon adı"
            placeholder="Örneğin: Hafta içi favorilerim"
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
          <Button
            label="Oluştur ve tarifi ekle"
            disabled={!name.trim()}
            onPress={() => {
              const existing = state.experience.collections.find(
                (c) => c.name.toLocaleLowerCase('tr') === name.trim().toLocaleLowerCase('tr'),
              );
              dispatch({
                type: 'collection',
                value: {
                  id: existing?.id ?? makeId('collection'),
                  name: name.trim(),
                  recipeIds: [...(existing?.recipeIds ?? []), recipeId],
                },
              });
              setName('');
              setNotice('Tarif koleksiyonuna eklendi.');
            }}
          />
          {!!notice && <Notice text={notice} />}
        </View>
      )}
    </View>
  );
}
