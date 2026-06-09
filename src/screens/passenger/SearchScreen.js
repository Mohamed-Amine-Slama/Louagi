import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { RideCard } from '../../components/RideCard';
import { EmptyState } from '../../components/EmptyState';
import { Section, Row } from '../../components/Section';
import { Badge } from '../../components/Badge';
import { ScreenHeader } from '../../components/Header';
import { ridesApi } from '../../api';
import { spacing, radius } from '../../theme';
import { formatDate, formatWeekday } from '../../i18n/format';

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
  const [filters, setFilters] = useState({ priceMax: null, ratingMin: 0 });
  const [sort, setSort] = useState('departure');

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Screen padded={false}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.containerMargin,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          gap: spacing.md,
        }}
      >
        <Row justify="space-between" align="center">
          <View>
            <Text variant="headlineSm" color={colors.onPrimary}>
              {origin} → {destination}
            </Text>
            <Text variant="labelSm" color={colors.onPrimaryContainer}>
              {t('search:headerSummary', {
                date: formatDate(date),
                seatsLabel: t('common:seatsCount', { count: Number(seats) || 1 }),
              })}
            </Text>
          </View>
        </Row>
      </View>

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
                <Text
                  variant="labelMd"
                  color={same ? colors.onPrimary : colors.onSurface}
                >
                  {formatWeekday(d, { locale })} {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.containerMargin, gap: spacing.md }}>
          <Card style={{ gap: spacing.md }}>
            <Text variant="labelMd">{t('search:filters')}</Text>
            <View>
              <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginBottom: 6 }}>
                {t('search:maxPrice')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {[null, 15, 25, 40].map((p) => {
                  const active = filters.priceMax === p;
                  return (
                    <Pressable
                      key={String(p)}
                      onPress={() => setFilters((f) => ({ ...f, priceMax: p }))}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: 6,
                        borderRadius: radius.full,
                        backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
                      }}
                    >
                      <Text
                        variant="labelSm"
                        color={active ? colors.onPrimary : colors.onSurface}
                      >
                        {p == null ? t('search:anyPrice') : t('search:priceLte', { price: p })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View>
              <Text variant="labelSm" color={colors.onSurfaceVariant} style={{ marginBottom: 6 }}>
                {t('search:sortBy')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {[
                  { k: 'departure', label: t('search:sortEarliest') },
                  { k: 'price', label: t('search:sortCheapest') },
                  { k: 'rating', label: t('search:sortBestRated') },
                ].map((opt) => {
                  const active = sort === opt.k;
                  return (
                    <Pressable
                      key={opt.k}
                      onPress={() => setSort(opt.k)}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: 6,
                        borderRadius: radius.full,
                        backgroundColor: active ? colors.secondaryContainer : colors.surfaceContainerHigh,
                      }}
                    >
                      <Text
                        variant="labelSm"
                        color={active ? colors.onSecondaryContainer : colors.onSurface}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

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
            <RideCard key={r.id} ride={r} onPress={() => nav.navigate('RideDetail', { id: r.id })} />
          ))
        )}
        </View>
      </View>
    </Screen>
  );
}
