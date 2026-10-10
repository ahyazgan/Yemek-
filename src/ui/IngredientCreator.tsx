import React, { useState } from 'react';
import { View } from 'react-native';
import { Category, Ingredient } from '../domain/model';
import { allIngredients, ingredientNameKey } from '../domain/ingredients';
import { makeId } from '../domain/state';
import { useApp } from '../state/AppProvider';
import { customIngredientSchema } from '../storage/schema';
import { Button, Chip, Field } from './components';
import { Text } from './Text';
import { styles as s } from './theme';

export function IngredientCreator({
  initialName = '',
  onCreated,
}: {
  initialName?: string;
  onCreated?: (ingredient: Ingredient) => void;
}) {
  const { getState, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const categories: Category[] = [
    'Sebze & meyve',
    'Bakliyat & tahıl',
    'Süt & yumurta',
    'Et & tavuk',
    'Temel gıda',
  ];
  return (
    <View style={{ gap: 12 }}>
      <Button
        label={open ? 'Yeni malzemeyi kapat' : 'Yeni malzeme oluştur'}
        secondary
        icon="add"
        onPress={() => {
          if (!open) {
            setName(initialName);
            setError('');
          }
          setOpen(!open);
        }}
      />
      {open && (
        <View style={s.card}>
          <Text style={s.h3}>Kendi malzemem</Text>
          <Text style={s.muted}>
            Malzemenin hazırlık durumunu da yaz: örneğin kuru nohut ve haşlanmış nohut ayrı
            malzemelerdir. Miktarları gram olarak gireceksin.
          </Text>
          <Field label="Yeni malzemenin adı" value={name} onChangeText={setName} maxLength={100} />
          <Text style={s.muted}>Alışverişte hangi bölümde?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={category === item}
                onPress={() => setCategory(item)}
              />
            ))}
          </View>
          <Button
            label="Malzemeyi defterime ekle"
            onPress={() => {
              const state = getState();
              const existing = allIngredients(state).find(
                (i) => ingredientNameKey(i.name) === ingredientNameKey(name),
              );
              if (existing) {
                onCreated?.(existing);
                setOpen(false);
                return;
              }
              const result = customIngredientSchema.safeParse({
                id: makeId('ingredient'),
                name,
                category,
              });
              if (!result.success) {
                setError('2–100 karakterlik bir ad yaz ve alışveriş bölümünü seç.');
                return;
              }
              if (state.customIngredients.length >= 300) {
                setError('En fazla 300 kişisel malzeme saklayabilirsin.');
                return;
              }
              dispatch({ type: 'ingredient', value: result.data });
              onCreated?.(result.data);
              setOpen(false);
              setError('');
            }}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
