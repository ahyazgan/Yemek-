import React from 'react';
import { Image, ImageSourcePropType, StyleProp, ImageStyle, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { photoAliases } from '../data/catalog-airfryer';
import { useApp } from '../state/AppProvider';

const photos: Record<string, ImageSourcePropType> = {
  cilbir: require('../../assets/recipes/cilbir.png'),
  'peynirli-krep': require('../../assets/recipes/peynirli-krep.png'),
  'peynirli-biber': require('../../assets/recipes/peynirli-biber.png'),
  'domates-corbasi': require('../../assets/recipes/domates-corbasi.png'),
  'sebzeli-pirinc-corbasi': require('../../assets/recipes/sebzeli-pirinc-corbasi.png'),
  'firin-limonlu-tavuk': require('../../assets/recipes/firin-limonlu-tavuk.png'),
  'kabak-dolmasi': require('../../assets/recipes/kabak-dolmasi.png'),
  'firinda-peynirli-makarna': require('../../assets/recipes/firinda-peynirli-makarna.png'),
  'nohutlu-sebze': require('../../assets/recipes/nohutlu-sebze.png'),
  piyaz: require('../../assets/recipes/piyaz.png'),
  'nohut-salatasi': require('../../assets/recipes/nohut-salatasi.png'),
  'havuc-tarator': require('../../assets/recipes/havuc-tarator.png'),
  cacik: require('../../assets/recipes/cacik.png'),
  'un-helvasi': require('../../assets/recipes/un-helvasi.png'),
  yayla: require('../../assets/recipes/yayla.png'),
  pirasa: require('../../assets/recipes/pirasa.png'),
  bezelye: require('../../assets/recipes/bezelye.png'),
  barbunya: require('../../assets/recipes/barbunya.png'),
  mucver: require('../../assets/recipes/mucver.png'),
  semizotu: require('../../assets/recipes/semizotu.png'),
  brokoli: require('../../assets/recipes/brokoli.png'),
  irmik: require('../../assets/recipes/irmik.png'),
  mercimek: require('../../assets/recipes/mercimek.png'),
  menemen: require('../../assets/recipes/menemen.png'),
  bulgur: require('../../assets/recipes/bulgur.png'),
  nohut: require('../../assets/recipes/nohut.png'),
  kabak: require('../../assets/recipes/kabak.png'),
  tavuk: require('../../assets/recipes/tavuk.png'),
  ispanak: require('../../assets/recipes/ispanak.png'),
  fasulye: require('../../assets/recipes/fasulye.png'),
  ezogelin: require('../../assets/recipes/ezogelin.png'),
  kisir: require('../../assets/recipes/kisir.png'),
  coban: require('../../assets/recipes/coban.png'),
  omlet: require('../../assets/recipes/omlet.png'),
  makarna: require('../../assets/recipes/makarna.png'),
  firinsebze: require('../../assets/recipes/firinsebze.png'),
  mantar: require('../../assets/recipes/mantar.png'),
  sutlac: require('../../assets/recipes/sutlac.png'),
};

// Images are illustrative and bundled locally so the recipe catalog works offline.
export function RecipeImage({ id, style }: { id: string; style?: StyleProp<ImageStyle> }) {
  const { state } = useApp();
  const photo = state.recipes.find((r) => r.id === id)?.photo;
  if (photo)
    return (
      <Image
        source={{ uri: photo.dataUri }}
        accessibilityLabel={photo.caption || 'Kişisel tarif fotoğrafı'}
        resizeMode="cover"
        style={[{ width: '100%', height: 200, backgroundColor: '#F5EDE3' }, style]}
      />
    );
  const photoId = photoAliases[id] ?? id;
  if (!photos[photoId])
    return (
      <View
        accessible={false}
        style={[
          {
            width: '100%',
            height: 200,
            backgroundColor: '#FFCF51',
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <Ionicons name="restaurant-outline" size={36} color="#D84025" />
      </View>
    );
  return (
    <Image
      source={photos[photoId] ?? photos.mercimek}
      accessible={false}
      resizeMode="cover"
      style={[{ width: '100%', height: 200, backgroundColor: '#F5EDE3' }, style]}
    />
  );
}
