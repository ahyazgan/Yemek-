import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { stories } from '../data/stories';
import { storyRecipes } from '../domain/content';
import { useApp } from '../state/AppProvider';
import { Text } from '../ui/Text';
import { Button, Empty, Page } from '../ui/components';
import { RecipeImage } from '../ui/RecipeImage';
import { RecipeLinks } from '../ui/ContentCards';
import { styles as s } from '../ui/theme';

export function Inspiration() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useApp();
  const story = stories.find((item) => item.id === id);
  if (!story)
    return (
      <Page>
        <Empty
          title="Seçki bulunamadı"
          description="Tarifler ekranından başka bir sofra fikri seç."
        >
          <Button label="Tariflere dön" onPress={() => router.navigate('/')} />
        </Empty>
      </Page>
    );
  const recipes = storyRecipes(state, story.recipeIds);
  return (
    <Page maxWidth={850}>
      <View style={[s.card, { backgroundColor: story.color, padding: 24, gap: 18 }]}>
        <Text style={s.eyebrow}>SOFRA FİKİRLERİ</Text>
        <Text style={s.title}>{story.title}</Text>
        <Text style={s.text}>{story.description}</Text>
        {recipes[0] && (
          <RecipeImage
            id={recipes[0].id}
            style={{ width: 190, height: 190, borderRadius: 95, alignSelf: 'center' }}
          />
        )}
      </View>
      <Text style={s.h2}>Mutfağa girmeden</Text>
      {story.notes.map((note) => (
        <Text key={note} style={s.text}>
          • {note}
        </Text>
      ))}
      <Text style={s.h2}>Bu seçkiden sana uygun {recipes.length} tarif</Text>
      <Text style={s.muted}>
        Beslenme, bütçe, süre ve istemediğin malzeme tercihlerin uygulanır. Beğendiğin tariften gün
        ve porsiyon seçerek menüne ekle.
      </Text>
      <RecipeLinks recipes={recipes} />
      {!recipes.length && (
        <Empty
          title="Tercihlerine uygun tarif kalmadı"
          description="Seçkideki tarifler mevcut mutfak tercihlerine uymuyor."
        >
          <Button label="Damak zevkimi düzenle" secondary onPress={() => router.push('/taste')} />
        </Empty>
      )}
      <Button label="Tüm tariflere dön" secondary onPress={() => router.navigate('/')} />
    </Page>
  );
}
