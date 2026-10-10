import React from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { amountLabel, buildShoppingList, mealsInWeek } from '../domain/logic';
import { allIngredients } from '../domain/ingredients';
import { preparationTasks } from '../domain/companion';
import { Empty, Page, WeekPicker } from '../ui/components';
import { Text } from '../ui/Text';
import { colors, styles as s } from '../ui/theme';

export function BatchPrep() {
  const { state, dispatch, week } = useApp();
  const tasks = preparationTasks(state, week);
  const checked = state.experience.tools.prepChecks[week] ?? [];
  const items = buildShoppingList(
    mealsInWeek(state, week),
    state.recipes,
    {},
    allIngredients(state),
  );
  const ids = [...new Set(tasks.map((t) => t.recipe.id))];
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>BİRLİKTE HAZIRLA</Text>
      <Text style={s.title}>Haftanın mutfak planı</Text>
      <Text style={s.muted}>
        Aynı tarifin porsiyonları birleşir. Malzemelerini ölç, her yemeğin adımlarını sırayla
        tamamla.
      </Text>
      <WeekPicker />
      {!tasks.length ? (
        <Empty
          title="Önce haftanı planla"
          description="Menüne eklediğin tariflerin hazırlık adımları burada birleşir."
        />
      ) : (
        <>
          <View style={[s.card, { backgroundColor: colors.yellow }]}>
            <Text style={s.h2}>
              {ids.length} tarif · {tasks.filter((t) => checked.includes(t.key)).length}/
              {tasks.length} adım
            </Text>
            <Text style={s.muted}>
              Malzemeleri toplam porsiyona göre ölç. Büyük miktarları gerekirse partiler halinde,
              tarifteki pişirme adımlarını izleyerek hazırla.
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Tezgâha alacakların</Text>
            {items.map((i) => (
              <View key={i.ingredientId} style={s.between}>
                <Text style={[s.text, { flex: 1 }]}>{i.name}</Text>
                <Text style={s.h3}>{amountLabel(i.totalGrams)}</Text>
              </View>
            ))}
          </View>
          {ids.map((id) => {
            const group = tasks.filter((t) => t.recipe.id === id);
            return (
              <View key={id} style={s.card}>
                <Text style={s.h2}>{group[0].recipe.title}</Text>
                <Text style={s.muted}>
                  {group[0].servings} porsiyon toplam · temel tarif {group[0].recipe.baseServings}{' '}
                  kişilik
                </Text>
                {group.map((t) => (
                  <Pressable
                    key={t.key}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t.recipe.title + ' adım ' + (t.step + 1)}
                    accessibilityState={{ checked: checked.includes(t.key) }}
                    aria-checked={checked.includes(t.key)}
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}
                    onPress={() => {
                      const next = checked.includes(t.key)
                        ? checked.filter((k) => k !== t.key)
                        : [...checked, t.key];
                      dispatch({
                        type: 'tools',
                        value: {
                          prepChecks: {
                            ...state.experience.tools.prepChecks,
                            [week]: next.filter((k) => tasks.some((task) => task.key === k)),
                          },
                        },
                      });
                    }}
                  >
                    <Text
                      style={[
                        s.text,
                        { textDecorationLine: checked.includes(t.key) ? 'line-through' : 'none' },
                      ]}
                    >
                      {checked.includes(t.key) ? '✓' : '○'} {t.step + 1}. {t.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </>
      )}
    </Page>
  );
}
