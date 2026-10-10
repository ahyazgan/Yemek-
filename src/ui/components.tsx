import { Text } from './Text';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, styles as s } from './theme';
import { addDays, dateLabel } from '../domain/logic';
import { useApp } from '../state/AppProvider';

export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 28,
        backgroundColor: secondary ? colors.lime : colors.green,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      })}
    >
      {icon && <Ionicons name={icon} size={18} color={secondary ? colors.ink : '#fff'} />}
      <Text
        style={{
          fontWeight: '600',
          fontSize: 15,
          color: secondary ? colors.ink : '#fff',
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={{
        height: 44,
        width: 44,
        borderRadius: 22,
        backgroundColor: colors.soft,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={icon} size={21} color={colors.ink} />
    </Pressable>
  );
}
export function Chip({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 15,
        paddingVertical: 11,
        borderRadius: 24,
        backgroundColor: selected ? colors.green : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.green : colors.line,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? 'white' : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Stepper({
  value,
  onChange,
  label = 'Kişi sayısı',
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  return (
    <View style={s.between}>
      <Text style={[s.h3, { flex: 1 }]}>{label}</Text>
      <View style={s.row}>
        <IconButton
          label={`${label} azalt`}
          icon="remove"
          onPress={() => onChange(value - 1)}
          disabled={value <= 1}
        />
        <Text
          accessibilityLabel={`${value} kişi`}
          style={[s.h3, { minWidth: 24, textAlign: 'center' }]}
        >
          {value}
        </Text>
        <IconButton
          label={`${label} artır`}
          icon="add"
          onPress={() => onChange(value + 1)}
          disabled={value >= 12}
        />
      </View>
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[s.input, props.multiline && { minHeight: 100, textAlignVertical: 'top' }]}
        {...props}
      />
    </View>
  );
}
export function Page({
  children,
  maxWidth = 1160,
  gap = 20,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  gap?: number;
}) {
  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.page}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { maxWidth, gap }]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function WeekPicker() {
  const { week, setWeek } = useApp();
  return (
    <View style={s.between}>
      <IconButton
        label="Önceki hafta"
        icon="chevron-back"
        onPress={() => setWeek(addDays(week, -7))}
      />
      <Text
        style={{ fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1, textAlign: 'center' }}
      >
        {dateLabel(week, { day: 'numeric', month: 'short' })} –{' '}
        {dateLabel(addDays(week, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
      <IconButton
        label="Sonraki hafta"
        icon="chevron-forward"
        onPress={() => setWeek(addDays(week, 7))}
      />
    </View>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={[s.card, { padding: 28, alignItems: 'center' }]}>
      <Ionicons name="leaf-outline" size={32} color={colors.green} />
      <Text style={[s.h2, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[s.muted, { textAlign: 'center' }]}>{description}</Text>
      {children}
    </View>
  );
}
export function Notice({ text }: { text: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: colors.lime, padding: 14, borderRadius: 14 }}
    >
      <Text style={s.text}>{text}</Text>
    </View>
  );
}
