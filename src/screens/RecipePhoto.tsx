import React, { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { selectRecipePhoto } from '../integrations/recipePhoto';
import {
  photoUsage,
  MAX_PHOTOS_LENGTH,
  withRecipePhoto,
  type RecipePhoto as Photo,
} from '../domain/recipeMedia';
import { Button, Empty, Field, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
export function RecipePhoto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, getState, dispatch } = useApp();
  const recipe = state.recipes.find((r) => r.id === id);
  const [photo, setPhoto] = useState<Photo | null>(recipe?.photo ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  if (!recipe)
    return (
      <Page>
        <Empty title="Tarif bulunamadı" description="Tarif defterinden tekrar seç." />
      </Page>
    );
  const select = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await selectRecipePhoto();
      if (live.current && result) {
        setPhoto(result);
        setConfirmRemove(false);
      }
    } catch {
      if (live.current)
        setError(
          'Fotoğraf açılamadı. İzinleri kontrol et veya 15 MB altında başka bir fotoğraf seç.',
        );
    } finally {
      if (live.current) setBusy(false);
    }
  };
  const save = (value: Photo | null) => {
    try {
      dispatch({ type: 'recipe', value: withRecipePhoto(getState(), id, value) });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fotoğraf kaydedilemedi.');
    }
  };
  return (
    <Page maxWidth={680}>
      <Text style={s.eyebrow}>KENDİ SOFRANDAN</Text>
      <Text style={s.title}>Tarif fotoğrafım</Text>
      <Text style={s.h3}>{recipe.title}</Text>
      <Text style={s.muted}>
        Kendi çektiğin veya kullanma hakkın olan bir fotoğraf seç. Küçük bir kopyası tarifinle
        saklanır ve çevrimdışı açılır.
      </Text>
      {!!error && <Notice text={error} />}
      {photo ? (
        <View style={s.card}>
          <Image
            testID="photo-preview"
            source={{ uri: photo.dataUri }}
            accessibilityLabel="Seçtiğin tarif fotoğrafı"
            style={{ width: '100%', aspectRatio: 1, borderRadius: 22 }}
            resizeMode="cover"
          />
          <Field
            label="Fotoğraf açıklaması"
            value={photo.caption}
            maxLength={140}
            onChangeText={(caption) => setPhoto({ ...photo, caption })}
          />
        </View>
      ) : (
        <Empty
          title="Sofranın fotoğrafını ekle"
          description="Galerinden bir yemek fotoğrafı seçerek başla."
        />
      )}
      <Button
        label={busy ? 'Fotoğraf hazırlanıyor…' : 'Galeriden fotoğraf seç'}
        secondary={!!photo}
        disabled={busy}
        onPress={() => void select()}
      />
      {photo && <Button label="Fotoğrafı kaydet" disabled={busy} onPress={() => save(photo)} />}
      {recipe.photo &&
        (confirmRemove ? (
          <>
            <Notice text="Tarifteki fotoğraf kaldırılacak. Telefonunun galerisindeki asıl fotoğraf silinmez." />
            <Button
              label="Evet, tarif fotoğrafını kaldır"
              disabled={busy}
              onPress={() => save(null)}
            />
            <Button label="Vazgeç" secondary onPress={() => setConfirmRemove(false)} />
          </>
        ) : (
          <Button
            label="Fotoğrafı kaldır"
            secondary
            disabled={busy}
            onPress={() => setConfirmRemove(true)}
          />
        ))}
      <Text style={s.muted}>
        Fotoğraf alanı: %{Math.round((photoUsage(state.recipes) / MAX_PHOTOS_LENGTH) * 100)} dolu.
        Bulut eşitlemeyi açarsan fotoğraf da kişisel yedeğine dahil olur; topluluğa otomatik
        paylaşılmaz.
      </Text>
    </Page>
  );
}
