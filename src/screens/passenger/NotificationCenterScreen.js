import React, { memo, useCallback, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { Row, Stack } from '../../components/Section';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { notificationsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatDate, formatTime } from '../../i18n/format';

// Icon per notification category (backend sets 'admin' on broadcasts; other
// categories are reserved for future ride/delivery events).
const CATEGORY_ICONS = {
  admin: 'campaign',
  booking: 'event-seat',
  message: 'chat-bubble-outline',
  delivery: 'local-shipping',
};

function timestampLabel(iso, locale) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? formatTime(iso, { locale }) : formatDate(iso, { locale });
}

export default function NotificationCenterScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const res = await notificationsApi.listNotifications({ actor: user });
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!unread) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationsApi.markNotificationRead({ actor: user, all: true });
  };

  const openNotification = async (item) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      notificationsApi.markNotificationRead({ actor: user, notificationId: item.id });
    }
    if (item.data?.screen) {
      nav.navigate(item.data.screen, item.data.params || {});
    }
  };

  return (
    // No floating tab bar in this modal, so drop Screen's tab-bar clearance.
    <Screen padded={false} scroll={false} contentStyle={{ paddingBottom: insets.bottom }}>
      {/* Header */}
      <Row gap={spacing.md} align="center" style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <PressableScale
          onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs'))}
          hitSlop={10}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('common:close')}
          style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="close" size={20} color={colors.onSurface} />
        </PressableScale>
        <Stack gap={1} style={{ flex: 1 }}>
          <Text variant="headlineSm">{t('notifications:title')}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>{t('notifications:subtitle')}</Text>
        </Stack>
        {unread > 0 ? (
          <PressableScale
            onPress={markAllRead}
            hitSlop={8}
            scaleTo={0.94}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing.sm,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: withAlpha(colors.primary, 0.08),
            }}
          >
            <MaterialIcons name="done-all" size={16} color={colors.primary} />
            <Text variant="labelSm" color={colors.primary}>{t('notifications:markAllRead')}</Text>
          </PressableScale>
        ) : null}
      </Row>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 }}
        ItemSeparatorComponent={NotificationSeparator}
        ListEmptyComponent={loading ? <NotificationSkeleton /> : <EmptyNotifications />}
        renderItem={({ item, index }) => (
          <FadeSlideIn index={Math.min(index, 8)}>
            <NotificationRow item={item} onPress={openNotification} />
          </FadeSlideIn>
        )}
      />
    </Screen>
  );
}

const NotificationSeparator = memo(() => {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: withAlpha(colors.outlineVariant, 0.5), marginStart: 66 }} />;
});

const NotificationSkeleton = memo(() => (
  <SkeletonList count={6} lines={2} gap={spacing.sm} style={{ paddingTop: spacing.xs }} />
));

const EmptyNotifications = memo(() => {
  const { t } = useLocale();
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        icon="notifications-none"
        title={t('notifications:emptyTitle')}
        body={t('notifications:emptyBody')}
      />
    </View>
  );
});

const NotificationRow = memo(({ item, onPress }) => {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const unread = !item.read;
  const icon = CATEGORY_ICONS[item.category] || 'notifications-none';
  return (
    <PressableScale
      onPress={() => onPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        paddingVertical: 13,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: unread ? withAlpha(colors.primary, 0.05) : 'transparent',
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.full,
          backgroundColor: unread ? withAlpha(colors.primary, 0.12) : colors.surfaceContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={20} color={unread ? colors.primary : colors.onSurfaceVariant} />
      </View>
      <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
        <Row justify="space-between" align="center" gap={spacing.sm}>
          <Text variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>{item.title}</Text>
          <Text variant="labelSm" color={unread ? colors.primary : colors.onSurfaceVariant}>
            {timestampLabel(item.created_at, locale)}
          </Text>
        </Row>
        <Text variant="bodyMd" color={unread ? colors.onSurface : colors.onSurfaceVariant} numberOfLines={2}>
          {item.body}
        </Text>
      </Stack>
      {unread ? (
        <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary, marginTop: 6 }} />
      ) : null}
    </PressableScale>
  );
});
