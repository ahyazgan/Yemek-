import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { Recipe } from '../domain/model';
import { recipeFingerprint } from '../domain/companion';
import { localDate } from '../domain/logic';
import { allIngredients } from '../domain/ingredients';
import { recipeSchemaFor } from '../storage/schema';
import { Button, Chip, Empty, Field, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
export function RecipeNotes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useApp();
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe)
    return (
      <Page>
        <Empty title="Tarif bulunamadı" description="Tarif defterinden bir yemek seç." />
      </Page>
    );
  return <Editor key={recipe.id} recipe={recipe} />;
}
function Editor({ recipe }: { recipe: Recipe }) {
  const { state, dispatch } = useApp();
  const data = recipe.enrichment;
  const [url, setUrl] = useState(data?.video?.url ?? '');
  const [credit, setCredit] = useState(data?.video?.credit ?? '');
  const [nutritionOn, setNutritionOn] = useState(!!data?.nutrition);
  const [values, setValues] = useState({
    kcal: String(data?.nutrition?.kcal ?? ''),
    protein: String(data?.nutrition?.protein ?? ''),
    carbs: String(data?.nutrition?.carbs ?? ''),
    fat: String(data?.nutrition?.fat ?? ''),
  });
  const [source, setSource] = useState(data?.nutrition?.source ?? '');
  const [date, setDate] = useState(data?.nutrition?.recordedOn ?? localDate(new Date()));
  const [notice, setNotice] = useState('');
  return (
    <Page maxWidth={680}>
      <Text style={s.title}>Video ve besin notları</Text>
      <Text style={s.h3}>{recipe.title}</Text>
      {data && data.fingerprint !== recipeFingerprint(recipe) && (
        <Notice text="Tarif değiştiği için eski notlar gösterilmiyor. Bu tarife uygunluğunu kontrol edip yeniden kaydet." />
      )}
      {!!notice && <Notice text={notice} />}
      <View style={s.card}>
        <Text style={s.h2}>Kendi video bağlantın</Text>
        <Text style={s.muted}>
          Kullanım hakkına sahip olduğun doğrudan HTTPS video dosyasını ekle. Sosyal medya sayfa
          bağlantıları video dosyası değildir. Boş bırakırsan video kaldırılır.
        </Text>
        <Field
          label="Video dosyası adresi"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          maxLength={2000}
        />
        <Field
          label="Video sahibi / kaynak"
          value={credit}
          onChangeText={setCredit}
          maxLength={200}
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Besin bilgisi</Text>
        <Text style={s.muted}>
          Bir porsiyon için kaynağında yazan değerleri gir. Sofra hesaplamaz veya doğrulanmış sağlık
          bilgisi olarak sunmaz.
        </Text>
        <Chip
          label="Besin notu ekle"
          selected={nutritionOn}
          onPress={() => setNutritionOn(!nutritionOn)}
        />
        {nutritionOn && (
          <>
            {(
              [
                ['kcal', 'Enerji (kcal)'],
                ['protein', 'Protein (g)'],
                ['carbs', 'Karbonhidrat (g)'],
                ['fat', 'Yağ (g)'],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={values[key]}
                onChangeText={(value) => setValues({ ...values, [key]: value })}
                keyboardType="decimal-pad"
              />
            ))}
            <Field
              label="Besin bilgisinin kaynağı"
              value={source}
              onChangeText={setSource}
              maxLength={300}
            />
            <Field
              label="Bilgi tarihi (YYYY-AA-GG)"
              value={date}
              onChangeText={setDate}
              maxLength={10}
            />
          </>
        )}
      </View>
      <Button
        label="Tarif notlarını kaydet"
        onPress={() => {
          if (nutritionOn && Object.values(values).some((v) => !v.trim()))
            return setNotice('Dört besin değerini ve kaynağını doldur.');
          const result = recipeSchemaFor(allIngredients(state)).safeParse({
            ...recipe,
            enrichment: {
              fingerprint: recipeFingerprint(recipe),
              video: url.trim() ? { url: url.trim(), credit: credit.trim() } : null,
              nutrition: nutritionOn
                ? {
                    kcal: Number(values.kcal.replace(',', '.')),
                    protein: Number(values.protein.replace(',', '.')),
                    carbs: Number(values.carbs.replace(',', '.')),
                    fat: Number(values.fat.replace(',', '.')),
                    source,
                    recordedOn: date,
                  }
                : null,
            },
          });
          if (!result.success)
            return setNotice(
              'Video HTTPS adresini, kaynakları, tarihi ve sayısal besin değerlerini kontrol et.',
            );
          dispatch({ type: 'recipe', value: result.data });
          router.back();
        }}
      />
    </Page>
  );
}
