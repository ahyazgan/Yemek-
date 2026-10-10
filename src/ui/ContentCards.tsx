import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { stories } from '../data/stories';
import { Recipe } from '../domain/model';
import { Text } from './Text';
import { RecipeImage } from './RecipeImage';
import { colors, styles as s } from './theme';
import { useApp } from '../state/AppProvider';
import { eligibleContent } from '../domain/content';

export function StoryCards({ recipes }: { recipes: Recipe[] }) {
  const { state } = useApp();
  const allowed = new Set(eligibleContent(state).map((r) => r.id));
  const ids = new Set(recipes.filter((r) => allowed.has(r.id)).map((r) => r.id));
  const visible = stories.filter((story) => story.recipeIds.some((id) => ids.has(id)));
  if (!visible.length) return null;
  return (
    <View style={{ gap: 12, marginVertical: 8 }}>
      <Text style={s.h2}>Sofra fikirleri</Text>
      <Text style={s.muted}>Biraz ilham, birkaç mutfak sırrı.</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingBottom: 4 }}
      >
        {visible.map((story) => (
          <Pressable
            key={story.id}
            accessibilityRole="button"
            accessibilityLabel={story.title + ' seçkisini aç'}
            onPress={() => router.push({ pathname: '/inspiration/[id]', params: { id: story.id } })}
            style={({ pressed }) => ({
              width: 236,
              borderRadius: 24,
              padding: 18,
              gap: 10,
              backgroundColor: story.color,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <RecipeImage
              id={story.recipeIds.find((id) => ids.has(id))!}
              style={{ width: 112, height: 112, borderRadius: 56, alignSelf: 'center' }}
            />
            <Text style={[s.h3, { minHeight: 44 }]}>{story.title}</Text>
            <Text style={[s.muted, { fontSize: 13, minHeight: 36 }]}>{story.subtitle}</Text>
            <View style={s.between}>
              <Text style={s.muted}>
                {story.recipeIds.filter((id) => ids.has(id)).length} tarif
              </Text>
              <Ionicons name="arrow-forward" size={20} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function RecipeLinks({ recipes, servings }: { recipes: Recipe[]; servings?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {recipes.map((recipe) => (
        <Pressable
          key={recipe.id}
          accessibilityRole="button"
          accessibilityLabel={recipe.title + ' tarifini incele'}
          onPress={() =>
            router.push({
              pathname: '/recipe/[id]',
              params: { id: recipe.id, ...(servings ? { servings: String(servings) } : {}) },
            })
          }
          style={({ pressed }) => [s.card, s.row, { gap: 14, opacity: pressed ? 0.8 : 1 }]}
        >
          <RecipeImage id={recipe.id} style={{ width: 76, height: 76, borderRadius: 38 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.h3}>{recipe.title}</Text>
            <Text style={s.muted}>
              {recipe.minutes} dk ·{' '}
              {recipe.details?.difficulty === 'medium'
                ? 'Biraz özen'
                : recipe.details
                  ? 'Kolay'
                  : 'Ev yapımı'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}
