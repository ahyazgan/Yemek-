import React from 'react';
import { View } from 'react-native';
import { Equipment } from '../domain/model';
import { equipmentKeys, equipmentLabels } from '../domain/equipment';
import { Chip } from './components';

export function EquipmentPicker({
  value,
  onChange,
}: {
  value: Equipment[];
  onChange: (value: Equipment[]) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {equipmentKeys.map((item) => (
        <Chip
          key={item}
          label={equipmentLabels[item]}
          selected={value.includes(item)}
          onPress={() =>
            onChange(value.includes(item) ? value.filter((e) => e !== item) : [...value, item])
          }
        />
      ))}
    </View>
  );
}
