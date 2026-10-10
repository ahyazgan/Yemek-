import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useIsFocused } from 'expo-router';
import { Recipe } from '../domain/model';
import { recipeFingerprint } from '../domain/companion';
import { Button, Notice } from './components';
import { Text } from './Text';
import { styles as s } from './theme';
function RecipeVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  const focused = useIsFocused();
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!focused) player.pause();
  }, [focused, player]);
  useEffect(() => {
    const listener = player.addListener('statusChange', ({ status }) =>
      setError(status === 'error'),
    );
    return () => listener.remove();
  }, [player]);
  return (
    <View style={{ gap: 8 }}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16 }}
      />
      {error && (
        <Notice text="Video yüklenemedi. Bağlantını ve video adresini kontrol et; yazılı adımlarla devam edebilirsin." />
      )}
    </View>
  );
}
export function RecipeEnrichment({ recipe }: { recipe: Recipe }) {
  const [play, setPlay] = useState(false);
  const data = recipe.enrichment;
  if (!data || data.fingerprint !== recipeFingerprint(recipe)) return null;
  return (
    <>
      {data.nutrition && (
        <View style={s.card}>
          <Text style={s.h2}>Porsiyon başına besin notu</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[
              [data.nutrition.kcal, 'kcal'],
              [data.nutrition.protein, 'g protein'],
              [data.nutrition.carbs, 'g karbonhidrat'],
              [data.nutrition.fat, 'g yağ'],
            ].map(([n, label]) => (
              <Text style={s.h3} key={label}>
                {n} {label}
              </Text>
            ))}
          </View>
          <Text style={s.muted}>
            Kullanıcı tarafından girildi · {data.nutrition.source} · {data.nutrition.recordedOn}
          </Text>
        </View>
      )}
      {data.video && (
        <View style={s.card}>
          <Text style={s.h2}>Videolu anlatım</Text>
          <Text style={s.muted}>{data.video.credit} · İnternet bağlantısı kullanır.</Text>
          {play ? (
            <RecipeVideo key={data.video.url} url={data.video.url} />
          ) : (
            <Button
              label="Tarif videosunu yükle"
              secondary
              icon="play-outline"
              onPress={() => setPlay(true)}
            />
          )}
        </View>
      )}
    </>
  );
}
