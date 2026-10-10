import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { amountLabel, dateLabel, grams, weekDays } from '../domain/logic';
import { budgetLabels, dietLabels, Meal } from '../domain/model';
import { makeId } from '../domain/state';
import { Button, Chip, Empty, Notice, Page, Stepper, WeekPicker } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { RecipeImage } from '../ui/RecipeImage';
import { CollectionPicker } from '../ui/CollectionPicker';
import { RecipeLinks } from '../ui/ContentCards';
import { relatedRecipes } from '../domain/content';
import { equipmentLabels, missingEquipment } from '../domain/equipment';
import { recipeText } from '../domain/sharing';
import { SharePanel } from '../ui/SharePanel';
import { RecipeAlternatives } from '../ui/RecipeAlternatives';
import { RecipeEnrichment } from '../ui/RecipeEnrichment';
import { money, recipeCost } from '../domain/companion';
import { MAX_PHOTOS_LENGTH, photoUsage } from '../domain/recipeMedia';

export function RecipeDetail() {
  const params = useLocalSearchParams<{
    id: string;
    date?: string;
    slot?: 'lunch' | 'dinner';
    servings?: string;
  }>();
  const { state, dispatch, week } = useApp();
  const ingredients = allIngredients(state);
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const insets = useSafeAreaInsets();
  const photoSize = wide
    ? Math.min((Math.min(width, 1160) - 40) * 0.53 - 48, 450)
    : Math.min(width - 96, 244);
  const recipe = state.recipes.find((r) => r.id === params.id);
  const requestedServings = Number(params.servings);
  const [servings, setServings] = useState(
    state.meals.find((m) => m.date === params.date && m.slot === params.slot)?.servings ??
      (Number.isInteger(requestedServings) && requestedServings >= 1 && requestedServings <= 12
        ? requestedServings
        : undefined) ??
      state.profile?.people ??
      2,
  );
  const [selected, setSelected] = useState(params.date ?? week);
  const [slot, setSlot] = useState<Meal['slot']>(params.slot === 'lunch' ? 'lunch' : 'dinner');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [section, setSection] = useState<'ingredients' | 'steps' | 'notes'>('ingredients');
  const days = weekDays(week);
  const date = days.includes(selected) ? selected : week;
  if (!recipe)
    return (
      <Page>
        <Empty
          title="Tarif bulunamadı"
          description="Tarifler ekranından başka bir yemek seçebilirsin."
        />
      </Page>
    );
  const existing = state.meals.find((m) => m.date === date && m.slot === slot);
  const details = recipe.details;
  const cost = recipeCost(recipe, 1, state.experience.tools.prices);
  const related = relatedRecipes(state, recipe);
  const add = () => {
    dispatch({
      type: 'meal',
      value: { id: existing?.id ?? makeId('meal'), date, slot, recipeId: recipe.id, servings },
    });
    router.dismissTo('/plan');
  };
  return (
    <View style={s.page}>
      <ScrollView
        style={s.page}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { gap: 20 }]}
      >
        <View
          testID="recipe-layout"
          style={{
            flexDirection: wide ? 'row-reverse' : 'column',
            gap: wide ? 20 : 0,
            alignItems: 'stretch',
          }}
        >
          <View
            testID="recipe-photo"
            style={{
              width: wide ? '53%' : '100%',
              minHeight: wide ? 570 : photoSize + 44,
              borderRadius: 24,
              backgroundColor: colors.yellow,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -20,
                left: -20,
                right: -20,
                bottom: -20,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 28,
              }}
            >
              {Array.from({ length: 48 }, (_, i) => (
                <View
                  key={i}
                  style={{
                    width: 60,
                    height: 60,
                    backgroundColor: colors.bg,
                    opacity: 0.55,
                    transform: [{ rotate: '-8deg' }],
                  }}
                />
              ))}
            </View>
            <RecipeImage
              id={recipe.id}
              style={{
                width: photoSize,
                height: photoSize,
                borderRadius: photoSize,
                borderColor: colors.surface,
                borderWidth: 9,
                transform: [{ rotate: '-5deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                backgroundColor: colors.surface,
                paddingVertical: 6,
                paddingHorizontal: 11,
                borderRadius: 20,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.ink }}>Sofra tarifleri</Text>
            </View>
          </View>
          <View
            testID="recipe-summary"
            style={[
              s.card,
              {
                flex: wide ? 1 : undefined,
                marginTop: wide ? 0 : 14,
                padding: wide ? 26 : 20,
                gap: 18,
              },
            ]}
          >
            <Text style={[s.eyebrow, { textAlign: 'center', color: colors.green }]}>
              BUGÜN SOFRADA
            </Text>
            <Text style={[s.title, { textAlign: 'center', fontSize: 28 }]}>{recipe.title}</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>{recipe.description}</Text>
            <Button
              label={
                state.experience.favorites.includes(recipe.id)
                  ? 'Favorilerden çıkar'
                  : 'Favorilerime ekle'
              }
              secondary
              icon={state.experience.favorites.includes(recipe.id) ? 'heart' : 'heart-outline'}
              onPress={() => dispatch({ type: 'favorite', id: recipe.id })}
            />
            <CollectionPicker recipeId={recipe.id} />
            <SharePanel
              title={recipe.title}
              label="Tarifi paylaş"
              text={recipeText(recipe, ingredients, servings)}
            />
            <Button
              label="Kendi kopyamı oluştur"
              secondary
              onPress={() => {
                if (
                  photoUsage(state.recipes) + (recipe.photo?.dataUri.length ?? 0) >
                  MAX_PHOTOS_LENGTH
                ) {
                  setCopyError(
                    'Kopyanın fotoğrafı için alan kalmadı. Önce kullanmadığın bir tarif fotoğrafını kaldır.',
                  );
                  return;
                }
                const id = makeId('custom');
                dispatch({
                  type: 'recipe',
                  value: { ...recipe, id, title: (recipe.title + ' · Kopyam').slice(0, 100) },
                });
                router.push({ pathname: '/edit-recipe/[id]', params: { id } });
              }}
            />
            {!!copyError && <Notice text={copyError} />}
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 16,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.line,
              }}
            >
              <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <Ionicons name="time-outline" size={22} color={colors.green} />
                <Text style={s.h3}>{recipe.minutes} dk</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Toplam süre</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <Ionicons name="restaurant-outline" size={22} color={colors.green} />
                <Text style={s.h3}>{recipe.ingredients.length}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Malzeme</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <Ionicons name="basket-outline" size={22} color={colors.green} />
                <Text style={[s.h3, { fontSize: 13 }]}>{budgetLabels[recipe.budget]}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Bütçe tercihi</Text>
              </View>
            </View>
            <Stepper value={servings} onChange={setServings} label="Porsiyon" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Günü değiştir"
              accessibilityState={{ expanded: scheduleOpen }}
              onPress={() => setScheduleOpen(!scheduleOpen)}
              style={[s.between, { minHeight: 44 }]}
            >
              <View style={[s.row, { flex: 1, gap: 8 }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={[s.muted, { flex: 1, fontSize: 13 }]}>
                  {dateLabel(date, { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                  {slot === 'lunch' ? 'Öğle' : 'Akşam'}
                </Text>
              </View>
              <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>Değiştir</Text>
            </Pressable>
            {scheduleOpen && (
              <>
                <WeekPicker />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {days.map((day) => (
                    <Chip
                      key={day}
                      label={dateLabel(day, { weekday: 'short', day: 'numeric' })}
                      selected={date === day}
                      onPress={() => setSelected(day)}
                    />
                  ))}
                </View>
                <View style={s.row}>
                  <Chip label="Öğle" selected={slot === 'lunch'} onPress={() => setSlot('lunch')} />
                  <Chip
                    label="Akşam"
                    selected={slot === 'dinner'}
                    onPress={() => setSlot('dinner')}
                  />
                </View>
              </>
            )}
            {existing && (
              <Text style={[s.muted, { fontSize: 12 }]}>
                Bu öğünde {state.recipes.find((r) => r.id === existing.recipeId)?.title} var.
                Eklediğinde onun yerini alır.
              </Text>
            )}
            {wide && (
              <Button
                label={existing ? 'Bu öğünü değiştir' : 'Menüme ekle'}
                icon="add"
                onPress={add}
              />
            )}
          </View>
        </View>
        <View style={[s.card, { padding: wide ? 28 : 18, gap: 20 }]}>
          <View testID="recipe-equipment" style={{ gap: 8 }}>
            <Text style={s.h3}>Mutfakta gerekenler</Text>
            <Text style={s.muted}>
              {recipe.equipment == null
                ? 'Ekipman bilgisi henüz belirtilmedi.'
                : recipe.equipment.length
                  ? recipe.equipment.map((e) => equipmentLabels[e]).join(' · ')
                  : 'Temel mutfak araçları yeterli; cihaz gerekmiyor.'}
            </Text>
            {missingEquipment(recipe, state.experience.equipment).length > 0 && (
              <Text style={s.error}>
                Mutfağında seçili olmayan:{' '}
                {missingEquipment(recipe, state.experience.equipment)
                  .map((e) => equipmentLabels[e])
                  .join(', ')}
                . Başlamadan önce ekipmanı kontrol et.
              </Text>
            )}
          </View>
          {details && (
            <>
              <View
                testID="recipe-timing"
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
              >
                {[
                  [details.prepMinutes, 'Hazırlık'],
                  [details.cookMinutes, 'Pişirme'],
                  [details.restMinutes, 'Dinlenme / soğuma'],
                ].map(([minutes, label]) => (
                  <View
                    key={label}
                    style={{
                      flexGrow: 1,
                      backgroundColor: colors.soft,
                      padding: 14,
                      borderRadius: 16,
                      gap: 4,
                    }}
                  >
                    <Text style={s.h3}>{minutes} dk</Text>
                    <Text style={[s.muted, { fontSize: 12 }]}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[s.muted, { fontSize: 12 }]}>
                {details.difficulty === 'medium' ? 'Biraz özen ister' : 'Kolay hazırlanır'} ·
                Süreler yaklaşık ve {recipe.baseServings} kişilik tarif içindir. Porsiyon arttıkça
                kap büyüklüğü ve süre değişebilir.
              </Text>
            </>
          )}
          <Button
            label="Pişirmeye başla"
            icon="restaurant-outline"
            onPress={() =>
              router.push({
                pathname: '/cook/[id]',
                params: { id: recipe.id, servings: String(servings) },
              })
            }
          />
          <View style={s.between}>
            <View style={[s.row, { gap: 8, flexWrap: 'wrap', flex: 1 }]}>
              <Chip
                label="Malzemeler"
                selected={section === 'ingredients'}
                onPress={() => setSection('ingredients')}
              />
              <Chip
                label="Yapılışı"
                selected={section === 'steps'}
                onPress={() => setSection('steps')}
              />
              {details && (
                <Chip
                  label="Püf noktaları"
                  selected={section === 'notes'}
                  onPress={() => setSection('notes')}
                />
              )}
            </View>
            {wide && <Text style={s.muted}>{servings} kişilik</Text>}
          </View>
          {section === 'ingredients' ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {recipe.ingredients.map((part, i) => (
                  <View
                    key={part.ingredientId + i}
                    style={{
                      width: wide ? '23%' : '47%',
                      flexGrow: 1,
                      backgroundColor: colors.soft,
                      padding: 15,
                      borderRadius: 16,
                      gap: 8,
                    }}
                  >
                    <Text style={[s.text, { fontSize: 14 }]}>
                      {ingredients.find((x) => x.id === part.ingredientId)?.name}
                    </Text>
                    <Text style={[s.h3, { color: colors.green }]}>
                      {amountLabel(
                        (grams(part.quantity, part.unit) * servings) / recipe.baseServings,
                      )}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[s.muted, { fontSize: 12 }]}>
                {recipe.diets.map((d) => dietLabels[d]).join(' · ') || 'Karma beslenme'}
              </Text>
              <Text style={[s.muted, { fontSize: 11 }]}>
                Gramajlar çiğ / ayıklanmış ağırlıktır. Bakliyat tarifteki hazırlık durumuna göredir.
                {recipe.photo ? 'Fotoğraf kişisel tarif defterinden.' : 'Görsel temsilidir.'}
              </Text>
            </>
          ) : section === 'steps' ? (
            <View style={{ gap: 24 }}>
              {recipe.steps.map((step, i) => (
                <View key={i} style={[s.row, { alignItems: 'flex-start' }]}>
                  <View
                    style={{
                      height: 32,
                      width: 32,
                      borderRadius: 16,
                      backgroundColor: colors.yellow,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.ink, fontWeight: '600' }}>{i + 1}</Text>
                  </View>
                  <Text style={[s.text, { flex: 1 }]}>{step}</Text>
                </View>
              ))}
            </View>
          ) : details ? (
            <View testID="recipe-notes" style={{ gap: 18 }}>
              <Text style={s.h2}>Lezzeti değiştiren küçük detaylar</Text>
              {details.tips.map((tip, i) => (
                <View key={i} style={[s.row, { alignItems: 'flex-start' }]}>
                  <Ionicons name="bulb-outline" size={22} color={colors.green} />
                  <Text style={[s.text, { flex: 1 }]}>{tip}</Text>
                </View>
              ))}
              {!!details.servingSuggestion && (
                <View style={[s.card, { backgroundColor: '#E4ECCD' }]}>
                  <Text style={s.h3}>Nasıl servis etsem?</Text>
                  <Text style={s.text}>{details.servingSuggestion}</Text>
                  <Text style={[s.muted, { fontSize: 12 }]}>
                    Eşlikçi öneriler malzeme listesine otomatik eklenmez.
                  </Text>
                </View>
              )}
            </View>
          ) : null}
          {cost.missing === 0 && (
            <Text style={s.muted}>
              Kendi fiyat notlarınla {money(cost.cents)} / porsiyon malzeme maliyeti. Paket
              alışveriş tutarı Bütçem ekranında.
            </Text>
          )}
          <RecipeAlternatives recipe={recipe} />
          <RecipeEnrichment recipe={recipe} />
          {recipe.source && (
            <View style={s.card}>
              <Text style={s.h3}>Tarifin kaynağı</Text>
              <Text style={s.muted}>
                {new URL(recipe.source.url).hostname}
                {recipe.source.author ? ' · ' + recipe.source.author : ''}
              </Text>
              <Text style={s.muted}>Kendi defterine aktardığın ve düzenleyebildiğin kopya.</Text>
              <Button
                label="Kaynak tarifi aç"
                secondary
                onPress={() => void Linking.openURL(recipe.source!.url).catch(() => {})}
              />
            </View>
          )}
          <Button
            label={recipe.photo ? 'Fotoğrafımı düzenle' : 'Kendi fotoğrafımı ekle'}
            secondary
            icon="image-outline"
            onPress={() =>
              router.push({ pathname: '/recipe-photo/[id]', params: { id: recipe.id } })
            }
          />
          <Button
            label="Video / besin notu ekle"
            secondary
            onPress={() =>
              router.push({ pathname: '/recipe-notes/[id]', params: { id: recipe.id } })
            }
          />
          <Button
            label="Tarifi düzenle"
            secondary
            icon="create-outline"
            onPress={() =>
              router.push({ pathname: '/edit-recipe/[id]', params: { id: recipe.id } })
            }
          />
          <View style={s.card}>
            <Text style={s.h3}>Önerilerini sana göre ayarlayalım</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['prefer', 'avoid'] as const).map((value) => (
                <Chip
                  key={value}
                  label={value === 'prefer' ? 'Daha sık öner' : 'Bunu önerme'}
                  selected={state.experience.tools.feedback[recipe.id] === value}
                  onPress={() => {
                    const feedback = { ...state.experience.tools.feedback };
                    if (feedback[recipe.id] === value) delete feedback[recipe.id];
                    else feedback[recipe.id] = value;
                    dispatch({ type: 'tools', value: { feedback } });
                  }}
                />
              ))}
            </View>
            <Text style={[s.muted, { fontSize: 12 }]}>
              Mevcut menünü değiştirmez. Tercihini aynı düğmeden geri alabilirsin.
            </Text>
          </View>
        </View>
        {related.length > 0 && (
          <View style={{ gap: 14 }}>
            <Text style={s.h2}>Bunları da sevebilirsin</Text>
            <Text style={s.muted}>Malzemeleri veya türü benzer, tercihlerine uygun tarifler.</Text>
            <RecipeLinks recipes={related} servings={servings} />
          </View>
        )}
      </ScrollView>
      {!wide && (
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Button label={existing ? 'Bu öğünü değiştir' : 'Menüme ekle'} icon="add" onPress={add} />
        </View>
      )}
    </View>
  );
}
