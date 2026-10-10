import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { Recipe } from '../domain/model';
import { availableSubstitutions } from '../domain/substitutions';
import { makeId } from '../domain/state';
import { Button } from './components';
import { Text } from './Text';
import { styles as s } from './theme';
export function RecipeAlternatives({ recipe }: { recipe: Recipe }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const alternatives = availableSubstitutions(state, recipe);
  if (!alternatives.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <Button label="Malzeme alternatiflerini gör" secondary onPress={() => setOpen(!open)} />
      {open &&
        alternatives.map((v) => (
          <View style={s.card} key={v.id}>
            <Text style={s.h3}>{v.title}</Text>
            <Text style={s.text}>{v.note}</Text>
            <Text style={s.muted}>
              Kendi tariflerine ayrı bir kopya eklenir. Menüne almak için yeni tariften gününü seç.
            </Text>
            <Button
              label={v.title + ' kopyasını oluştur'}
              onPress={() => {
                const id = makeId('custom');
                dispatch({ type: 'recipe', value: { ...v.recipe, id } });
                router.push({ pathname: '/recipe/[id]', params: { id } });
              }}
            />
          </View>
        ))}
    </View>
  );
}
