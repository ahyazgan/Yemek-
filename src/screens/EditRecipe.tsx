import { Text } from '../ui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { grams } from '../domain/logic';
import {
  Budget,
  Diet,
  Equipment,
  Recipe,
  RecipeCategory,
  budgetLabels,
  dietLabels,
} from '../domain/model';
import { recipeCategoryLabels } from '../domain/discovery';
import { recipeSchemaFor } from '../storage/schema';
import { Button, Chip, Empty, Field, IconButton, Page, Stepper } from '../ui/components';
import { styles as s } from '../ui/theme';
import { makeId } from '../domain/state';
import { EquipmentPicker } from '../ui/EquipmentPicker';
import { IngredientCreator } from '../ui/IngredientCreator';

export function EditRecipe({ creating = false }: { creating?: boolean }) {
  const params = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const ingredients = allIngredients(state);
  const [draft] = useState<Recipe>(() => ({
    id: makeId('custom'),
    title: '',
    description: '',
    minutes: 30,
    baseServings: 2,
    diets: [],
    budget: 'balanced',
    color: '#FFCF51',
    art: 'stew',
    ingredients: [],
    steps: [],
  }));
  const recipe = creating ? draft : state.recipes.find((r) => r.id === params.id);
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [minutes, setMinutes] = useState(String(recipe?.minutes ?? 30));
  const [servings, setServings] = useState(recipe?.baseServings ?? 4);
  const [steps, setSteps] = useState(recipe?.steps.join('\n') ?? '');
  const [detailsOn, setDetailsOn] = useState(!!recipe?.details);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [prep, setPrep] = useState(String(recipe?.details?.prepMinutes ?? 0));
  const [cook, setCook] = useState(String(recipe?.details?.cookMinutes ?? recipe?.minutes ?? 30));
  const [rest, setRest] = useState(String(recipe?.details?.restMinutes ?? 0));
  const [difficulty, setDifficulty] = useState<'easy' | 'medium'>(
    recipe?.details?.difficulty ?? 'easy',
  );
  const [tips, setTips] = useState(recipe?.details?.tips.join('\n') ?? '');
  const [servingSuggestion, setServingSuggestion] = useState(
    recipe?.details?.servingSuggestion ?? '',
  );
  const [parts, setParts] = useState(
    recipe?.ingredients.map((p) => ({
      id: p.ingredientId,
      value: String(grams(p.quantity, p.unit)),
    })) ?? [],
  );
  const [diets, setDiets] = useState<Diet[]>(recipe?.diets ?? []);
  const [budget, setBudget] = useState<Budget>(recipe?.budget ?? 'balanced');
  const [category, setCategory] = useState<RecipeCategory>(recipe?.category ?? 'main');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [equipment, setEquipment] = useState<Equipment[] | null>(recipe?.equipment ?? null);
  if (!recipe)
    return (
      <Page>
        <Empty title="Tarif bulunamadı" description="Başka bir tarif seç." />
      </Page>
    );
  const save = () => {
    const result = recipeSchemaFor(ingredients).safeParse({
      ...recipe,
      title,
      equipment,
      description,
      minutes: detailsOn ? Number(prep) + Number(cook) + Number(rest) : Number(minutes),
      details: detailsOn
        ? {
            prepMinutes: Number(prep),
            cookMinutes: Number(cook),
            restMinutes: Number(rest),
            difficulty,
            tips: tips
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
            servingSuggestion,
          }
        : null,
      baseServings: servings,
      diets,
      budget,
      category,
      steps: steps
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: parts.map((p) => ({
        ingredientId: p.id,
        quantity: Number(p.value.replace(',', '.')),
        unit: 'g',
      })),
    });
    if (!result.success) {
      setError(
        'Başlık en az 2, açıklama en az 5 karakter olmalı. Süreler tam sayı, toplam süre 1–600 dakika olmalı. Miktarlar sıfırdan büyük olmalı; en az bir malzeme ve adım ekle. En fazla 8 püf noktası yaz; her biri 3–600 karakter olabilir.',
      );
      return;
    }
    dispatch({ type: 'recipe', value: result.data });
    if (creating) router.replace({ pathname: '/recipe/[id]', params: { id: result.data.id } });
    else router.back();
  };
  return (
    <Page>
      <Text style={s.title}>{creating ? 'Yeni tarifim' : 'Tarife kendi dokunuşun'}</Text>
      <Text style={s.muted}>
        Düzenleme bu cihazda saklanır. Mevcut planındaki miktarlar yeniden hesaplanır; kayıtlı
        listelerin değişmez.
      </Text>
      <Field label="Tarif adı" value={title} onChangeText={setTitle} maxLength={100} />
      <Field
        label="Kısa açıklama"
        multiline
        value={description}
        onChangeText={setDescription}
        maxLength={600}
      />
      {!detailsOn ? (
        <Field
          label="Hazırlama ve pişirme süresi (dk)"
          keyboardType="number-pad"
          value={minutes}
          onChangeText={setMinutes}
        />
      ) : (
        <Text style={s.h3}>Toplam süre: {Number(prep) + Number(cook) + Number(rest)} dk</Text>
      )}
      <Button
        label={detailsOpen ? 'Süre ve püf noktalarını kapat' : 'Süre ve püf noktalarını düzenle'}
        secondary
        onPress={() => setDetailsOpen(!detailsOpen)}
      />
      {detailsOpen && (
        <View style={s.card}>
          <Chip
            label="Ayrıntılı tarif bilgisi"
            selected={detailsOn}
            onPress={() => {
              if (detailsOn) setMinutes(String(Number(prep) + Number(cook) + Number(rest)));
              else {
                setPrep('0');
                setCook(minutes);
                setRest('0');
              }
              setDetailsOn(!detailsOn);
            }}
          />
          {detailsOn && (
            <>
              <Field
                label="Hazırlık (dk)"
                keyboardType="number-pad"
                value={prep}
                onChangeText={setPrep}
              />
              <Field
                label="Pişirme (dk)"
                keyboardType="number-pad"
                value={cook}
                onChangeText={setCook}
              />
              <Field
                label="Dinlenme / soğuma (dk)"
                keyboardType="number-pad"
                value={rest}
                onChangeText={setRest}
              />
              <Text style={s.muted}>
                Aynı anda yaptığın işleri iki kez sayma; toplam süre, tarife başlayıp servise hazır
                olana kadar geçen süredir.
              </Text>
              <View style={s.row}>
                <Chip
                  label="Kolay"
                  selected={difficulty === 'easy'}
                  onPress={() => setDifficulty('easy')}
                />
                <Chip
                  label="Biraz özen"
                  selected={difficulty === 'medium'}
                  onPress={() => setDifficulty('medium')}
                />
              </View>
              <Field
                label="Püf noktaları (her satır ayrı)"
                multiline
                value={tips}
                onChangeText={setTips}
                maxLength={4807}
              />
              <Field
                label="Servis önerisi"
                multiline
                value={servingSuggestion}
                onChangeText={setServingSuggestion}
                maxLength={600}
              />
            </>
          )}
        </View>
      )}
      <Stepper label="Tarifin temel porsiyonu" value={servings} onChange={setServings} />
      <Text style={s.h2}>Malzemeler</Text>
      <Text style={s.muted}>Aşağıdaki miktarları {servings} kişilik tarifin tamamı için gir.</Text>
      {parts.map((p, i) => (
        <View key={p.id} style={[s.row, { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <Field
              label={`${ingredients.find((x) => x.id === p.id)?.name} (g)`}
              keyboardType="decimal-pad"
              value={p.value}
              onChangeText={(value) =>
                setParts((previous) =>
                  previous.map((part, index) => (index === i ? { ...part, value } : part)),
                )
              }
            />
          </View>
          <IconButton
            label={`${ingredients.find((x) => x.id === p.id)?.name} tariften çıkar`}
            icon="close"
            onPress={() => setParts((previous) => previous.filter((_, index) => index !== i))}
          />
        </View>
      ))}
      <Field
        label="Tarife malzeme ekle"
        placeholder="Malzeme adı ara"
        value={search}
        onChangeText={setSearch}
      />
      {search !== '' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {ingredients
            .filter(
              (i) =>
                !parts.some((p) => p.id === i.id) &&
                i.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')),
            )
            .map((i) => (
              <Chip
                key={i.id}
                label={`+ ${i.name}`}
                selected={false}
                onPress={() => {
                  setParts([...parts, { id: i.id, value: '100' }]);
                  setSearch('');
                }}
              />
            ))}
        </View>
      )}
      <IngredientCreator
        initialName={search}
        onCreated={(item) => {
          if (!parts.some((part) => part.id === item.id))
            setParts([...parts, { id: item.id, value: '100' }]);
          setSearch('');
        }}
      />
      <Field
        label="Yapılışı (her satır ayrı bir adım)"
        multiline
        value={steps}
        onChangeText={setSteps}
      />
      <Text style={s.h3}>Tarif kategorisi</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(recipeCategoryLabels).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={category === key}
            onPress={() => setCategory(key as RecipeCategory)}
          />
        ))}
      </View>
      <Text style={s.h3}>Beslenme etiketleri</Text>
      <View style={s.card}>
        <Text style={s.h3}>Gerekli ekipmanlar</Text>
        <Chip
          label="Ekipman bilgisini belirt"
          selected={equipment !== null}
          onPress={() => setEquipment(equipment === null ? [] : null)}
        />
        {equipment !== null && <EquipmentPicker value={equipment} onChange={setEquipment} />}
        <Text style={s.muted}>
          {equipment === null
            ? 'Ekipman bilgisi henüz belirtilmedi.'
            : equipment.length
              ? 'Yazdığın yapılış için gerekli cihazları seç.'
              : 'Bu tarif temel mutfak araçlarıyla, cihaz kullanmadan hazırlanır.'}
        </Text>
      </View>
      <Text style={s.muted}>
        Malzeme değiştirdiğinde etiketleri, püf noktalarını ve servis önerisini de kontrol et.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(Object.keys(dietLabels) as Diet[]).map((d) => (
          <Chip
            key={d}
            label={dietLabels[d]}
            selected={diets.includes(d)}
            onPress={() =>
              setDiets(diets.includes(d) ? diets.filter((x) => x !== d) : [...diets, d])
            }
          />
        ))}
      </View>
      <Text style={s.h3}>Göreceli bütçe</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(Object.keys(budgetLabels) as Budget[]).map((b) => (
          <Chip
            key={b}
            label={budgetLabels[b]}
            selected={budget === b}
            onPress={() => setBudget(b)}
          />
        ))}
      </View>
      {error !== '' && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        label={creating ? 'Yeni tarifi kaydet' : 'Tarif değişikliklerini kaydet'}
        onPress={save}
      />
    </Page>
  );
}
