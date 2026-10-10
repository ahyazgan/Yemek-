import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { equipmentKeys, matchesEquipment } from '../domain/equipment';
import { EquipmentPicker } from '../ui/EquipmentPicker';
import { Button, Chip, Notice, Page } from '../ui/components';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';

export function EquipmentScreen() {
  const { state, dispatch } = useApp();
  const [notice, setNotice] = useState('');
  const value = state.experience.equipment;
  return (
    <Page maxWidth={700}>
      <Text style={s.eyebrow}>MUTFAĞINA GÖRE</Text>
      <Text style={s.title}>Ekipmanlarım</Text>
      <Text style={s.muted}>
        Evindeki cihazları seç; kişisel tarif önerilerin ve otomatik menün bu cihazlarla
        hazırlanabilen yemeklerden oluşsun.
      </Text>
      <View style={s.card}>
        <Chip
          label="Ekipmanlarıma göre öner"
          selected={value !== null}
          onPress={() => {
            dispatch({
              type: 'experience',
              value: { equipment: value === null ? [...equipmentKeys] : null },
            });
            setNotice('Ekipman tercihin kaydedildi.');
          }}
        />
        {value !== null && (
          <>
            <Text style={s.h3}>Mutfağımda var</Text>
            <EquipmentPicker
              value={value}
              onChange={(equipment) => {
                dispatch({ type: 'experience', value: { equipment } });
                setNotice('Ekipman tercihin kaydedildi.');
              }}
            />
            <Text style={s.muted}>
              Hiçbir cihaz seçmezsen yalnızca cihaz gerektirmeyen tarifler önerilir. Ekipmanı
              belirtilmemiş kişisel tarifler, bilgileri tamamlanana kadar önerilere girmez.
            </Text>
          </>
        )}
      </View>
      <Text style={s.h3}>
        {state.recipes.filter((r) => matchesEquipment(r, value)).length} tarif ekipman seçimine
        uygun
      </Text>
      <Text style={s.muted}>
        Beslenme ve süre tercihlerin bu sayıyı ayrıca daraltabilir. Tencere, tava, bıçak gibi temel
        araçların bulunduğu varsayılır. Seçimin mevcut menünü değiştirmez.
      </Text>
      {!!notice && <Notice text={notice} />}
      <Button label="Haftamı hazırla" onPress={() => router.push('/prepare-week')} />
      <Button label="Tarifleri keşfet" secondary onPress={() => router.navigate('/')} />
    </Page>
  );
}
