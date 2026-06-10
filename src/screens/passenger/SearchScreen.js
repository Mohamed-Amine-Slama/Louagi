import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import {
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { RideCard } from '../../components/RideCard';
import { EmptyState } from '../../components/EmptyState';
import { Row } from '../../components/Section';
import { CityPickerModal } from '../../components/CityPicker';
import { ridesApi } from '../../api';
import { spacing, radius, withAlpha } from '../../theme';
import { formatDate, formatWeekday } from '../../i18n/format';

const DEFAULT_FILTERS = { priceMax: null, ratingMin: 0 };

export default function SearchScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const nav = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const [origin, setOrigin] = useState(params.origin || '');
  const [destination, setDestination] = useState(params.destination || '');
  const [seats, setSeats] = useState(String(params.seats || 1));
  const [date, setDate] = useState(new Date());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState('departure');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null); // 'origin' | 'destination' | null

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);

  // Sync route params → state when navigation arrives with new search criteria
  // (e.g. user picks new cities on the home Landing screen and re-submits).
  // React Navigation may reuse the same screen instance, so useState's lazy
  // initializer doesn't re-run — we mirror the params explicitly.
  useEffect(() => {
    if (params.origin != null) setOrigin(params.origin);
    if (params.destination != null) setDestination(params.destination);
    if (params.seats != null) setSeats(String(params.seats));
  }, [params.origin, params.destination, params.seats]);

  // Load the city catalog once for the in-screen picker.
  useEffect(() => {
    let cancelled = false;
    ridesApi.listCities().then((list) => {
      if (!cancelled) setCities(Array.isArray(list) ? list : []);
    });
    return () => { cancelled = true; };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    const r = await ridesApi.searchRides({
      origin,
      destination,
      date,
      seats: Number(seats) || 1,
      filters,
      sort,
    });
    setRides(r);
    setLoading(false);
  }, [origin, destination, seats, date, filters, sort]);

  useEffect(() => {
    run();
  }, [run]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );

  // Active filter count (used for the badge on the Filters pill). Sort isn't
  // counted — it's a presentation choice, not a constraint.
  const activeFilterCount =
    (filters.priceMax != null ? 1 : 0) + (filters.ratingMin > 0 ? 1 : 0);

  const toggleFilters = useCallback(() => setFiltersOpen((open) => !open), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSort('departure');
  }, []);

  return (
    <Screen padded={false}>
      {/* ─── Banner ──────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          gap: spacing.md,
        }}
      >
        <Row align="center" gap={spacing.sm}>
          <Pressable
            onPress={() => nav.canGoBack() && nav.goBack()}
            hitSlop={10}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: withAlpha(colors.onPrimary, 0.16),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.onPrimary} />
          </Pressable>
          <Text variant="labelMd" color={colors.onPrimaryContainer}>
            {t('search:title', 'Find a ride')}
          </Text>
        </Row>

        <View
          style={{
            backgroundColor: withAlpha(colors.onPrimary, 0.12),
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Row align="center" gap={spacing.sm}>
            <View style={{ flex: 1, gap: 2 }}>
              <Pressable
                onPress={() => setEditing('origin')}
                hitSlop={6}
                style={{ paddingVertical: 6 }}
              >
                <Row align="center" gap={spacing.xs}>
                  <MaterialIcons name="trip-origin" size={14} color={colors.onPrimary} />
                  <Text variant="bodyMd" color={colors.onPrimary} numberOfLines={1}>
                    {origin || t('search:anyOrigin', 'Anywhere')}
                  </Text>
                </Row>
              </Pressable>
              <View
                style={{
                  height: 1,
                  backgroundColor: withAlpha(colors.onPrimary, 0.15),
                  marginVertical: 2,
                }}
              />
              <Pressable
                onPress={() => setEditing('destination')}
                hitSlop={6}
                style={{ paddingVertical: 6 }}
              >
                <Row align="center" gap={spacing.xs}>
                  <MaterialIcons name="place" size={14} color={colors.onPrimary} />
                  <Text variant="bodyMd" color={colors.onPrimary} numberOfLines={1}>
                    {destination || t('search:anyDestination', 'Anywhere')}
                  </Text>
                </Row>
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                setOrigin(destination);
                setDestination(origin);
              }}
              hitSlop={10}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: withAlpha(colors.onPrimary, 0.16),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="swap-vert" size={20} color={colors.onPrimary} />
            </Pressable>
          </Row>
        </View>

        <Row gap={spacing.sm} align="center">
          <Row gap={4} align="center" style={{ flex: 1 }}>
            <MaterialIcons name="event" size={14} color={colors.onPrimaryContainer} />
            <Text variant="labelSm" color={colors.onPrimaryContainer}>
              {formatDate(date)}
            </Text>
          </Row>
          <Row gap={4} align="center">
            <MaterialIcons name="person" size={14} color={colors.onPrimaryContainer} />
            <Text variant="labelSm" color={colors.onPrimaryContainer}>
              {t('common:seatsCount', { count: Number(seats) || 1 })}
            </Text>
          </Row>
        </Row>
      </View>

      {/* ─── Day strip ───────────────────────────────────────────────────── */}
      <View style={{ paddingTop: spacing.md, gap: spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMargin,
            gap: spacing.sm,
          }}
        >
          {days.map((d) => {
            const same = d.toDateString() === date.toDateString();
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => setDate(d)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: same ? colors.primary : colors.surfaceContainer,
                }}
              >
                <Text variant="labelMd" color={same ? colors.onPrimary : colors.onSurface}>
                  {formatWeekday(d, { locale })} {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
          {/* ─── Filter toolbar ──────────────────────────────────────────── */}
          <Row align="center" justify="space-between">
            <Pressable
              onPress={toggleFilters}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
                backgroundColor: filtersOpen ? colors.primary : colors.surfaceContainerHigh,
              }}
            >
              <MaterialIcons
                name="tune"
                size={16}
                color={filtersOpen ? colors.onPrimary : colors.onSurface}
              />
              <Text
                variant="labelMd"
                color={filtersOpen ? colors.onPrimary : colors.onSurface}
              >
                {t('search:filters')}
              </Text>
              {activeFilterCount > 0 && (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 5,
                    borderRadius: 9,
                    backgroundColor: filtersOpen
                      ? withAlpha(colors.onPrimary, 0.25)
                      : colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    variant="labelSm"
                    color={filtersOpen ? colors.onPrimary : colors.onPrimary}
                    style={{ fontSize: 11, fontWeight: '700' }}
                  >
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {rides.length} {t('search:results', 'results')}
            </Text>
          </Row>

          {/* ─── Collapsible filter panel ────────────────────────────────── */}
          {filtersOpen && (
            <Card style={{ gap: spacing.md }}>
              <Row align="center" justify="space-between">
                <Text variant="labelMd">{t('search:filters')}</Text>
                <Row gap={spacing.sm} align="center">
                  {activeFilterCount > 0 && (
                    <Pressable onPress={resetFilters} hitSlop={8}>
                      <Text variant="labelSm" color={colors.primary}>
                        {t('search:reset', 'Reset')}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={closeFilters}
                    hitSlop={10}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.surfaceContainerHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="close" size={16} color={colors.onSurface} />
                  </Pressable>
                </Row>
              </Row>

              <FilterRow
                icon="payments"
                label={t('search:maxPrice')}
                colors={colors}
              >
                {[null, 15, 25, 40].map((p) => (
                  <Chip
                    key={String(p)}
                    active={filters.priceMax === p}
                    onPress={() => setFilters((f) => ({ ...f, priceMax: p }))}
                    label={p == null ? t('search:anyPrice') : t('search:priceLte', { price: p })}
                    colors={colors}
                  />
                ))}
              </FilterRow>

              <FilterRow
                icon="star-outline"
                label={t('search:minRating', 'Min rating')}
                colors={colors}
              >
                {[0, 3, 4, 4.5].map((rating) => (
                  <Chip
                    key={String(rating)}
                    active={filters.ratingMin === rating}
                    onPress={() => setFilters((f) => ({ ...f, ratingMin: rating }))}
                    label={rating === 0 ? t('search:anyRating', 'Any') : t('search:ratingPlus', { rating })}
                    colors={colors}
                  />
                ))}
              </FilterRow>

              <FilterRow icon="sort" label={t('search:sortBy')} colors={colors}>
                {[
                  { k: 'departure', label: t('search:sortEarliest') },
                  { k: 'price', label: t('search:sortCheapest') },
                  { k: 'rating', label: t('search:sortBestRated') },
                ].map((opt) => (
                  <Chip
                    key={opt.k}
                    active={sort === opt.k}
                    accent="secondary"
                    onPress={() => setSort(opt.k)}
                    label={opt.label}
                    colors={colors}
                  />
                ))}
              </FilterRow>
            </Card>
          )}

          {/* ─── Results (RideCard untouched) ────────────────────────────── */}
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : rides.length === 0 ? (
            <EmptyState
              icon="search-off"
              title={t('search:noResultsTitle')}
              body={t('search:noResultsBody')}
            />
          ) : (
            rides.map((r) => (
              <RideCard
                key={r.id}
                ride={r}
                onPress={() => nav.navigate('RideDetail', { id: r.id })}
              />
            ))
          )}
        </View>
      </View>

      {/* ─── City pickers (single modal driven by `editing`) ───────────────── */}
      <CityPickerModal
        visible={editing === 'origin'}
        label={t('landing:from')}
        value={origin}
        cities={cities}
        onChange={(city) => setOrigin(city)}
        onClose={() => setEditing(null)}
      />
      <CityPickerModal
        visible={editing === 'destination'}
        label={t('landing:to')}
        value={destination}
        cities={cities}
        onChange={(city) => setDestination(city)}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

// ─── Small bits ───────────────────────────────────────────────────────────────

function FilterRow({ icon, label, children, colors }) {
  return (
    <View>
      <Row align="center" gap={spacing.xs} style={{ marginBottom: 6 }}>
        <MaterialIcons name={icon} size={14} color={colors.onSurfaceVariant} />
        <Text variant="labelSm" color={colors.onSurfaceVariant}>
          {label}
        </Text>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {children}
      </View>
    </View>
  );
}

function Chip({ active, onPress, label, accent = 'primary', colors }) {
  const bgActive = accent === 'secondary' ? colors.secondaryContainer : colors.primary;
  const fgActive = accent === 'secondary' ? colors.onSecondaryContainer : colors.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: active ? bgActive : colors.surfaceContainerHigh,
        borderWidth: active ? 0 : 1,
        borderColor: withAlpha(colors.outlineVariant, 0.4),
      }}
    >
      <Text variant="labelSm" color={active ? fgActive : colors.onSurface}>
        {label}
      </Text>
    </Pressable>
  );
}
