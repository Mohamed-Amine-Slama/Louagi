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
import Animated, { withSpring, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { spacing, radius, shadows, typography, withAlpha } from '../theme';
import { FadeSlideIn, PressableScale, SPRING } from './motion';

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

const sheetEntering = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 56 }, { scale: 0.97 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 160 }),
      transform: [
        { translateY: withSpring(0, SPRING) },
        { scale: withSpring(1, SPRING) },
      ],
    },
  };
};

export function CityPickerModal({ visible, label, value, onChange, onClose, cities }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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
        style={{ flex: 1, backgroundColor: withAlpha(colors.scrim, 0.5) }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg }}
          pointerEvents="box-none"
        >
          <Animated.View
            entering={sheetEntering}
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
                  backgroundColor: searchFocused
                    ? colors.surfaceContainerHighest
                    : colors.surfaceContainer,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                  height: 44,
                  borderWidth: 1.5,
                  borderColor: searchFocused ? colors.primary : withAlpha(colors.primary, 0),
                }}
              >
                <MaterialIcons
                  name="search"
                  size={20}
                  color={searchFocused ? colors.primary : colors.onSurfaceVariant}
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
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
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
              renderItem={({ item: c, index }) => (
                <FadeSlideIn index={Math.min(index, 8)}>
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
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor:
                        c === value
                          ? withAlpha(colors.primary, 0.12)
                          : pressed
                            ? colors.surfaceContainer
                            : 'transparent',
                    })}
                  >
                    <Text variant="bodyLg" color={c === value ? colors.primary : colors.onSurface}>
                      {c}
                    </Text>
                    {c === value ? (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                </FadeSlideIn>
              )}
            />
          </Animated.View>
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
      <PressableScale
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
      </PressableScale>
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
