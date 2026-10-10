import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { extractPageRecipes, type PageRecipe } from '../domain/recipePage';
import { recipeSourceSchema } from '../domain/recipeMedia';
import { importRecipeUrl, urlImportEnabled } from '../integrations/recipeImport';
import { Button, Field, Notice } from './components';
import { Text } from './Text';
import { styles as s } from './theme';
export function RecipeSourceImport({
  mode,
  onSelect,
}: {
  mode: 'url' | 'data';
  onSelect: (recipe: PageRecipe, url: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [data, setData] = useState('');
  const [found, setFound] = useState<{ recipes: PageRecipe[]; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const inspect = async () => {
    setError('');
    setFound(null);
    setBusy(true);
    try {
      if (mode === 'url') {
        const result = await importRecipeUrl(url);
        if (live.current) setFound({ recipes: result.recipes, url: result.sourceUrl });
      } else {
        if (url.trim() && !recipeSourceSchema.shape.url.safeParse(url.trim()).success)
          throw new Error('Kaynak için geçerli bir HTTPS bağlantısı gir veya alanı boş bırak.');
        setFound({ recipes: extractPageRecipes(data), url: url.trim() });
      }
    } catch (e) {
      if (live.current) setError(e instanceof Error ? e.message : 'Tarif okunamadı.');
    } finally {
      if (live.current) setBusy(false);
    }
  };
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.muted}>
        {mode === 'url'
          ? 'Desteklenen bir tarifin bağlantısını gir. Malzemeler ve adımlar önce kontrol edebileceğin bir taslağa gelir.'
          : 'Gelişmiş aktarım: elindeki Recipe JSON veya JSON-LD içeren HTML metnini yapıştır. Bu işlem çevrimdışı çalışır; metin çalıştırılmaz.'}
      </Text>
      <Field
        label={mode === 'url' ? 'Tarif bağlantısı' : 'Kaynak bağlantısı (isteğe bağlı)'}
        value={url}
        editable={!busy}
        maxLength={2000}
        onChangeText={(value) => {
          setUrl(value);
          setFound(null);
        }}
        placeholder="https://…"
      />
      {mode === 'data' && (
        <Field
          label="Tarif kaynak verisi"
          value={data}
          onChangeText={(value) => {
            setData(value);
            setFound(null);
          }}
          multiline
          maxLength={1000000}
          placeholder="Recipe JSON veya HTML"
        />
      )}
      {mode === 'url' && !urlImportEnabled && (
        <Notice text="Bağlantıdan aktarım hizmeti henüz kurulmadı. Şimdilik Metin sekmesinden tarifi yapıştırabilirsin." />
      )}
      <Button
        label={
          busy
            ? 'Tarif okunuyor…'
            : mode === 'url'
              ? 'Bağlantıdaki tarifleri getir'
              : 'Kaynak verisini incele'
        }
        disabled={busy || (mode === 'url' ? !urlImportEnabled || !url.trim() : !data.trim())}
        onPress={() => void inspect()}
      />
      {!!error && <Notice text={error} />}
      {found && (
        <>
          <Text style={s.h2}>{found.recipes.length} tarif bulundu</Text>
          {found.recipes.map((recipe, index) => (
            <View key={index} style={s.card}>
              <Text style={s.h3}>{recipe.title}</Text>
              <Text style={s.muted}>
                {recipe.ingredients.length} malzeme · {recipe.steps.length} adım
                {recipe.author ? ' · ' + recipe.author : ''}
              </Text>
              <Button
                label={recipe.title + ' taslağını incele'}
                onPress={() => onSelect(recipe, found.url)}
              />
            </View>
          ))}
        </>
      )}
      <Text style={s.muted}>
        Görseller ve besin değerleri otomatik alınmaz. Kullanma hakkın olan tarifleri aktar;
        gramajları ve kaynağı kaydetmeden önce kontrol et.
      </Text>
    </View>
  );
}
