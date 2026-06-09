// Two exports:
//   <CityPicker>      - labelled trigger + modal in one (used by LandingScreen)
//   <CityPickerModal> - controlled modal only (used by SearchScreen banner so
//                        we can render our own compact trigger)
//
// Both share the same fuzzy ranking, modal layout, and styling so swapping
// between the two doesn't surprise the user.

import React, { useMemo, useState } from 'react';
import {
  View,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { spacing, radius, shadows, typography } from '../theme';

const normalizeForSearch = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function rankCities(cities, rawQuery) {
  const q = normalizeForSearch(rawQuery);
  if (!q) return cities;
  const scored = [];
  for (const c of cities) {
    const n = normalizeForSearch(c);
    let score;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.includes(q)) score = 2;
    else continue;
    scored.push({ c, score });
  }
  scored.sort((a, b) => a.score - b.score || a.c.localeCompare(b.c));
  return scored.map((s) => s.c);
}

export function CityPickerModal({ visible, label, value, onChange, onClose, cities }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => rankCities(cities, query), [cities, query]);

  const close = () => {
    setQuery('');
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: 'rgba(3, 22, 52, 0.45)' }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}
          pointerEvents="box-none"
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              backgroundColor: colors.surfaceContainerLowest,
              borderRadius: radius.xl,
              paddingVertical: spacing.sm,
              maxHeight: '100%',
              ...shadows.floating,
            }}
          >
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {label}
              </Text>
              <Text variant="headlineSm">{t('landing:chooseCity')}</Text>
            </View>
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                  height: 44,
                }}
              >
                <MaterialIcons
                  name="search"
                  size={20}
                  color={colors.onSurfaceVariant}
                  style={{ marginEnd: spacing.sm }}
                />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('landing:searchCity')}
                  placeholderTextColor={colors.outline}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  style={{
                    flex: 1,
                    color: colors.onSurface,
                    paddingVertical: 0,
                    ...typography.bodyMd,
                  }}
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }}
              ListEmptyComponent={
                <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                  <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                    {t('landing:noCitiesMatch')}
                  </Text>
                </View>
              }
              renderItem={({ item: c }) => (
                <Pressable
                  onPress={() => {
                    onChange(c);
                    close();
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    paddingHorizontal: spacing.md,
                    marginVertical: 2,
                    borderRadius: radius.lg,
                    backgroundColor:
                      c === value
                        ? colors.primaryFixed
                        : pressed
                          ? colors.surfaceContainer
                          : 'transparent',
                  })}
                >
                  <Text variant="bodyLg" color={c === value ? colors.primary : colors.onSurface}>
                    {c}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export function CityPicker({ label, value, onChange, cities }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.surfaceContainer,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md - 2,
        }}
      >
        <Text variant="labelSm" color={colors.onSurfaceVariant}>
          {label}
        </Text>
        <Text variant="bodyLg">{value}</Text>
      </Pressable>
      <CityPickerModal
        visible={open}
        label={label}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
        cities={cities}
      />
    </View>
  );
}
