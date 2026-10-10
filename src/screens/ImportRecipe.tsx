import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { allIngredients } from '../domain/ingredients';
import { Equipment } from '../domain/model';
import {
  ImportDraft,
  ImportRow,
  importExample,
  parseRecipeText,
  resolveImportRows,
} from '../domain/recipeImport';
import { makeId } from '../domain/state';
import { useApp } from '../state/AppProvider';
import { recipeSchemaFor } from '../storage/schema';
import { IngredientCreator } from '../ui/IngredientCreator';
import { EquipmentPicker } from '../ui/EquipmentPicker';
import { Button, Chip, Field, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
import { RecipeSourceImport } from '../ui/RecipeSourceImport';
import { pageRecipeDraft } from '../domain/recipePage';
import type { Recipe } from '../domain/model';

function IngredientReview({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: ImportRow;
  index: number;
  onChange: (value: ImportRow) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState('');
  const { state } = useApp();
  const ingredients = allIngredients(state);
  const [choosing, setChoosing] = useState(!row.ingredientId);
  const matches = ingredients.filter((i) =>
    i.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
  );
  return (
    <View testID={`import-row-${index}`} style={s.card}>
      <Text style={s.h3}>
        {index + 1}. {row.source}
      </Text>
      {!!row.warning && <Text style={s.muted}>{row.warning}</Text>}
      <Text style={s.text}>
        Eşleşen: {ingredients.find((i) => i.id === row.ingredientId)?.name ?? 'Henüz seçilmedi'}
      </Text>
      <Button
        label={`${index + 1}. malzemeyi seç / değiştir`}
        secondary
        onPress={() => setChoosing(!choosing)}
      />
      {choosing && (
        <>
          <Field
            label={`${index + 1}. malzeme için ara`}
            value={query}
            onChangeText={setQuery}
            placeholder="Örn. soğan"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {matches.slice(0, 8).map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={row.ingredientId === item.id}
                onPress={() => {
                  onChange({ ...row, ingredientId: item.id });
                  setChoosing(false);
                }}
              />
            ))}
          </View>
          <Text style={s.muted}>
            {matches.length
              ? 'Diğer malzemeler için ara. Malzemenin çiğ / pişmiş durumunu da kontrol et.'
              : 'Bu malzeme katalogda yok. Hazırlık durumunu belirterek yeni malzeme oluşturabilirsin.'}
          </Text>
        </>
      )}
      <IngredientCreator
        initialName={query}
        onCreated={(item) => {
          onChange({ ...row, ingredientId: item.id });
          setChoosing(false);
        }}
      />
      <Field
        label={`${index + 1}. malzeme gram miktarı`}
        value={row.grams}
        onChangeText={(grams) => onChange({ ...row, grams })}
        keyboardType="decimal-pad"
        maxLength={12}
      />
      <Button label={`${index + 1}. satırı tariften çıkar`} secondary onPress={onRemove} />
    </View>
  );
}

export function ImportRecipe() {
  const { state, dispatch } = useApp();
  const ingredients = allIngredients(state);
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<'text' | 'url' | 'data'>('text');
  const [origin, setOrigin] = useState<Recipe['source']>(null);
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [equipment, setEquipment] = useState<Equipment[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const update = (value: Partial<ImportDraft>) => {
    setDraft((current) => (current ? { ...current, ...value } : null));
    setConfirmed(false);
    setError('');
  };
  const save = () => {
    if (!draft || !confirmed) return;
    try {
      const parts = resolveImportRows(draft.rows, ingredients);
      const result = recipeSchemaFor(ingredients).safeParse({
        id: makeId('custom'),
        title: draft.title,
        description: 'Kendi defterimden aktardığım tarif.',
        source: origin,
        baseServings: Number(draft.servings),
        minutes: Number(draft.minutes),
        ingredients: parts,
        steps: draft.steps
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        equipment,
        diets: [],
        category: 'main',
        budget: 'balanced',
        color: '#FFCF51',
        art: 'stew',
      });
      if (!result.success)
        throw new Error(
          'Tarif adı 2–100 karakter, kişi sayısı 1–12, toplam süre 1–600 tam dakika olmalı. En az bir geçerli malzeme ve 3 karakterlik yapılış adımı ekle.',
        );
      dispatch({ type: 'recipe', value: result.data });
      router.replace({ pathname: '/recipe/[id]', params: { id: result.data.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tarif kaydedilemedi. Bilgileri kontrol et.');
    }
  };
  return (
    <Page maxWidth={720}>
      <Text style={s.eyebrow}>TARİF DEFTERİNİ BÜYÜT</Text>
      <Text style={s.title}>{draft ? 'Son bir kontrol' : 'Tarif aktar'}</Text>
      {!draft ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip
              label="Metin"
              selected={mode === 'text'}
              onPress={() => {
                setMode('text');
                setOrigin(null);
                setError('');
              }}
            />
            <Chip
              label="Bağlantı"
              selected={mode === 'url'}
              onPress={() => {
                setMode('url');
                setError('');
              }}
            />
            <Chip
              label="Kaynak verisi"
              selected={mode === 'data'}
              onPress={() => {
                setMode('data');
                setError('');
              }}
            />
          </View>
          {mode === 'text' ? (
            <>
              <Text style={s.muted}>
                Kendi tarifini yapıştır. Malzemeleri ve adımları ayırıp düzenlenebilir bir taslak
                hazırlayalım. Metin bu cihazda işlenir.
              </Text>
              <Notice text="İlk satıra tarif adını yaz. Malzemeler ve Yapılışı başlıklarını kullan; her malzeme ve adım ayrı satırda olsun. g / kg otomatik çevrilir. Bardak, kaşık, ml ve adet ölçülerini gram olarak sen tamamlarsın." />
              <Field
                label="Tarif metni"
                value={source}
                onChangeText={setSource}
                multiline
                maxLength={20000}
                placeholder={importExample}
              />
              <Button
                label="Örnek metni kullan"
                secondary
                onPress={() => {
                  setSource(importExample);
                  setError('');
                }}
              />
              <Button
                label="Tarifi incele"
                disabled={!source.trim()}
                onPress={() => {
                  try {
                    setDraft(parseRecipeText(source, ingredients));
                    setConfirmed(false);
                    setError('');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
              <Text style={s.muted}>
                Tarifi kaydetmeden önce her eşleşmeyi kontrol edebilirsin. Fotoğraftan yazı okuma
                henüz yok.
              </Text>
            </>
          ) : (
            <RecipeSourceImport
              key={mode}
              mode={mode}
              onSelect={(recipe, url) => {
                setDraft(pageRecipeDraft(recipe, ingredients));
                setOrigin(
                  url ? { url, author: recipe.author, importedAt: new Date().toISOString() } : null,
                );
                setConfirmed(false);
                setError('');
              }}
            />
          )}
        </>
      ) : (
        <>
          {origin && (
            <Notice
              text={
                'Kaynak korunacak: ' +
                new URL(origin.url).hostname +
                (origin.author ? ' · ' + origin.author : '')
              }
            />
          )}
          <Text style={s.muted}>
            {draft.rows.length} malzeme satırı bulundu. Miktarlar tarifin tamamı içindir. Aynı
            malzemenin satırları kaydederken birleştirilir.
          </Text>
          <Field
            label="Aktarılan tarif adı"
            value={draft.title}
            onChangeText={(title) => update({ title })}
            maxLength={100}
          />
          <Field
            label="Tarif kaç kişilik?"
            value={draft.servings}
            onChangeText={(servings) => update({ servings })}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Field
            label="Toplam süre (dk)"
            value={draft.minutes}
            onChangeText={(minutes) => update({ minutes })}
            keyboardType="number-pad"
            maxLength={3}
          />
          {draft.rows.map((row, index) => (
            <IngredientReview
              key={`${index}-${row.source}`}
              row={row}
              index={index}
              onChange={(value) =>
                update({ rows: draft.rows.map((r, i) => (i === index ? value : r)) })
              }
              onRemove={() => update({ rows: draft.rows.filter((_, i) => i !== index) })}
            />
          ))}
          <Field
            label="Aktarılan yapılış adımları"
            value={draft.steps}
            onChangeText={(steps) => update({ steps })}
            multiline
            maxLength={12000}
          />
          <View style={s.card}>
            <Text style={s.h3}>Gerekli ekipmanlar</Text>
            <Chip
              label="Ekipman bilgisini belirt"
              selected={equipment !== null}
              onPress={() => {
                setEquipment(equipment === null ? [] : null);
                setConfirmed(false);
              }}
            />
            {equipment !== null && (
              <EquipmentPicker
                value={equipment}
                onChange={(value) => {
                  setEquipment(value);
                  setConfirmed(false);
                }}
              />
            )}
            <Text style={s.muted}>
              Bilgiyi açıp cihaz seçmezsen bu tarif cihaz gerektirmeyen olarak kaydedilir.
            </Text>
          </View>
          <Notice text="Beslenme etiketleri otomatik eklenmez. Tarif kaydolduktan sonra kategorisini, açıklamasını, bütçe grubunu ve etiketlerini Tarifi düzenle bölümünden tamamlayabilirsin." />
          <Chip
            label="Malzemeleri, gramajları ve adımları kontrol ettim"
            selected={confirmed}
            onPress={() => setConfirmed(!confirmed)}
          />
          <Button label="Tarif defterime kaydet" disabled={!confirmed} onPress={save} />
          <Button
            label="Metne geri dön"
            secondary
            onPress={() => {
              setDraft(null);
              setError('');
              setConfirmed(false);
            }}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </Page>
  );
}
