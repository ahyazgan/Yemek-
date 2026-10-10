import { Text } from '../ui/Text';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { dateLabel, mealsInWeek, weekDays } from '../domain/logic';
import { Button, IconButton, Page, WeekPicker } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { RecipeImage } from '../ui/RecipeImage';

export function Planner() {
  const { state, dispatch, week } = useApp();
  const [expanded, setExpanded] = useState(week);
  const days = weekDays(week);
  const activeDay = expanded === '' ? '' : days.includes(expanded) ? expanded : week;
  const count = mealsInWeek(state, week).length;
  return (
    <View style={s.page}>
      <Page maxWidth={780}>
        <View style={{ gap: 6, alignItems: 'center', paddingTop: 12 }}>
          <Text style={s.title}>Haftanın menüsü</Text>
          <Text style={s.muted}>{count} öğün planlandı</Text>
        </View>
        <WeekPicker />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Button label="Bütçem" secondary onPress={() => router.push('/budget')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Toplu hazırlık" secondary onPress={() => router.push('/batch-prep')} />
          </View>
        </View>
        <Button label="Ev halkıyla paylaş" secondary onPress={() => router.push('/household')} />
        <Button
          label="Haftamı hazırla"
          secondary
          icon="sparkles-outline"
          onPress={() => router.push('/prepare-week')}
        />
        <View style={{ gap: 10 }}>
          {days.map((date) => {
            const dayMeals = state.meals.filter((m) => m.date === date);
            const open = date === activeDay;
            return (
              <View
                key={date}
                style={[
                  s.card,
                  { padding: 16, gap: 12, borderWidth: open ? 1 : 0, borderColor: colors.peach },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' }) + ' menüsü'
                  }
                  accessibilityState={{ expanded: open }}
                  onPress={() => setExpanded(open ? '' : date)}
                  style={[s.between, { minHeight: 44 }]}
                >
                  <View style={[s.row, { gap: 12 }]}>
                    <View
                      style={{
                        width: 42,
                        minHeight: 42,
                        borderRadius: 24,
                        backgroundColor: open ? colors.yellow : colors.soft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={[s.h3, { color: open ? colors.green : colors.ink }]}>
                        {dateLabel(date, { day: 'numeric' })}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.h3}>{dateLabel(date, { weekday: 'long' })}</Text>
                      {!open && (
                        <Text style={[s.muted, { fontSize: 12 }]}>
                          {dayMeals.length ? dayMeals.length + ' öğün seçildi' : 'Yemek ekle'}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={19}
                    color={colors.muted}
                  />
                </Pressable>
                {(['lunch', 'dinner'] as const).map((slot) => {
                  const meal = dayMeals.find((m) => m.slot === slot);
                  const recipe = state.recipes.find((r) => r.id === meal?.recipeId);
                  const label = slot === 'lunch' ? 'Öğle' : 'Akşam';
                  if (!open && !meal) return null;
                  return meal && recipe ? (
                    <View key={slot} style={{ gap: 8 }}>
                      <View style={[s.row, { gap: 10 }]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={recipe.title + ' detayları'}
                          onPress={() =>
                            router.push({
                              pathname: '/recipe/[id]',
                              params: { id: recipe.id, date, slot },
                            })
                          }
                          style={[s.row, { flex: 1, gap: 12 }]}
                        >
                          <RecipeImage
                            id={recipe.id}
                            style={{ width: 66, height: 66, borderRadius: 33 }}
                          />
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={s.h3}>{recipe.title}</Text>
                            <Text style={[s.muted, { fontSize: 12 }]}>
                              {label} · {meal.servings} kişilik
                            </Text>
                          </View>
                        </Pressable>
                        <IconButton
                          label={date + ' ' + label + ' öğününü kaldır'}
                          icon="close"
                          onPress={() => dispatch({ type: 'removeMeal', id: meal.id })}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={date + ' ' + label + ' yemeğini değiştir'}
                        onPress={() =>
                          router.push({ pathname: '/choose-recipe', params: { date, slot } })
                        }
                        style={{
                          minHeight: 44,
                          borderRadius: 22,
                          backgroundColor: colors.soft,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Ionicons name="swap-horizontal-outline" size={17} color={colors.green} />
                        <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>
                          Değiştir
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      key={slot}
                      accessibilityRole="button"
                      accessibilityLabel={date + ' ' + label + ' yemek ekle'}
                      onPress={() =>
                        router.push({ pathname: '/choose-recipe', params: { date, slot } })
                      }
                      style={[
                        s.between,
                        {
                          minHeight: 48,
                          paddingHorizontal: 14,
                          backgroundColor: colors.soft,
                          borderRadius: 12,
                        },
                      ]}
                    >
                      <Text style={s.muted}>{label} yemeği ekle</Text>
                      <Ionicons name="add" size={21} color={colors.green} />
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
        <Button label="Başka yemek seç" secondary icon="add" onPress={() => router.navigate('/')} />
      </Page>
      {count > 0 && (
        <View
          style={{
            padding: 14,
            borderTopWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ width: '100%', maxWidth: 740, alignSelf: 'center' }}>
            <Button
              label="Alışveriş listemi gör"
              icon="bag-outline"
              onPress={() => router.navigate('/list')}
            />
          </View>
        </View>
      )}
    </View>
  );
}
