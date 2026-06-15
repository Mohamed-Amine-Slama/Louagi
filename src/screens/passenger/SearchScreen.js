import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import {
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { RideCard } from '../../components/RideCard';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { Row } from '../../components/Section';
import { FadeSlideIn, PressableScale } from '../../components/motion';
import { CityPickerModal } from '../../components/CityPicker';
import { ridesApi } from '../../api';
import { spacing, radius } from '../../theme';
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
      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.sm, gap: spacing.md }}>
        <Row align="center" gap={spacing.sm}>
          <PressableScale
            onPress={() => nav.canGoBack() && nav.goBack()}
            hitSlop={10}
            scaleTo={0.9}
            style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
          </PressableScale>
          <Text variant="headlineSm">{t("search:title", "Find a ride")}</Text>
        </Row>

        <Card padding={spacing.sm}>
          <View style={{ position: "relative" }}>
            <Pressable onPress={() => setEditing("origin")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.secondaryContainer }} />
              <Text variant="bodyLg" color={colors.onSurface} numberOfLines={1} style={{ flex: 1 }}>
                {origin || t("search:anyOrigin", "Anywhere")}
              </Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginStart: 36 }} />
            <Pressable onPress={() => setEditing("destination")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
              <MaterialIcons name="place" size={18} color={colors.primary} />
              <Text variant="bodyLg" color={colors.onSurface} numberOfLines={1} style={{ flex: 1 }}>
                {destination || t("search:anyDestination", "Anywhere")}
              </Text>
            </Pressable>
            <PressableScale
              onPress={() => { setOrigin(destination); setDestination(origin); }}
              hitSlop={10}
              scaleTo={0.9}
              style={{ position: "absolute", end: 8, top: "50%", marginTop: -18, width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", justifyContent: "center" }}
            >
              <MaterialIcons name="swap-vert" size={18} color={colors.primary} />
            </PressableScale>
          </View>
          <Row justify="space-between" align="center" style={{ paddingHorizontal: 12, paddingTop: spacing.sm, paddingBottom: 4 }}>
            <Row gap={6} align="center">
              <MaterialIcons name="event" size={15} color={colors.onSurfaceVariant} />
              <Text variant="labelSm" color={colors.onSurfaceVariant}>{formatDate(date)}</Text>
            </Row>
            <Row gap={6} align="center">
              <MaterialIcons name="person" size={15} color={colors.onSurfaceVariant} />
              <Text variant="labelSm" color={colors.onSurfaceVariant}>{t("common:seatsCount", { count: Number(seats) || 1 })}</Text>
            </Row>
          </Row>
        </Card>
      </View>

      {/* ─── Day strip ───────────────────────────────────────────────────── */}
      <View style={{ paddingTop: spacing.md, gap: spacing.md }}>
        <FadeSlideIn index={0}>
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
                <Chip
                  key={d.toISOString()}
                  label={`${formatWeekday(d, { locale })} ${d.getDate()}`}
                  selected={same}
                  onPress={() => setDate(d)}
                />
              );
            })}
          </ScrollView>
        </FadeSlideIn>

        <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
          {/* ─── Filter toolbar ──────────────────────────────────────────── */}
          <FadeSlideIn index={1}>
          <Row align="center" justify="space-between">
            <PressableScale
              onPress={toggleFilters}
              scaleTo={0.94}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
                backgroundColor: filtersOpen ? colors.secondaryContainer : colors.surfaceContainerHigh,
              }}
            >
              <MaterialIcons
                name="tune"
                size={16}
                color={filtersOpen ? colors.onSecondaryContainer : colors.onSurface}
              />
              <Text
                variant="labelMd"
                color={filtersOpen ? colors.onSecondaryContainer : colors.onSurface}
              >
                {t('search:filters')}
              </Text>
              {activeFilterCount > 0 && (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 5,
                    borderRadius: radius.full,
                    backgroundColor: filtersOpen
                      ? colors.onSecondaryContainer
                      : colors.secondaryContainer,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    variant="labelSm"
                    color={filtersOpen ? colors.secondaryContainer : colors.onSecondaryContainer}
                  >
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </PressableScale>

            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {rides.length} {t('search:results', 'results')}
            </Text>
          </Row>
          </FadeSlideIn>

          {/* ─── Collapsible filter panel ────────────────────────────────── */}
          {filtersOpen && (
            <FadeSlideIn>
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
                    <PressableScale
                      onPress={closeFilters}
                      hitSlop={10}
                      scaleTo={0.9}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: radius.full,
                        backgroundColor: colors.surfaceContainerHigh,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons name="close" size={16} color={colors.onSurface} />
                    </PressableScale>
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
                      selected={filters.priceMax === p}
                      onPress={() => setFilters((f) => ({ ...f, priceMax: p }))}
                      label={p == null ? t('search:anyPrice') : t('search:priceLte', { price: p })}
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
                      selected={filters.ratingMin === rating}
                      onPress={() => setFilters((f) => ({ ...f, ratingMin: rating }))}
                      label={rating === 0 ? t('search:anyRating', 'Any') : t('search:ratingPlus', { rating })}
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
                      selected={sort === opt.k}
                      onPress={() => setSort(opt.k)}
                      label={opt.label}
                    />
                  ))}
                </FilterRow>
              </Card>
            </FadeSlideIn>
          )}

          {/* ─── Results (RideCard untouched) ────────────────────────────── */}
          {loading ? (
            <SkeletonList count={4} lines={2} />
          ) : rides.length === 0 ? (
            <EmptyState
              icon="search-off"
              title={t('search:noResultsTitle')}
              body={t('search:noResultsBody')}
            />
          ) : (
            rides.map((r, index) => (
              <FadeSlideIn key={r.id} index={Math.min(index, 8)}>
                <RideCard
                  ride={r}
                  onPress={() => nav.navigate('RideDetail', { id: r.id })}
                />
              </FadeSlideIn>
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
