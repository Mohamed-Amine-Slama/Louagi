import React, { memo, useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, Pressable, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { Row, Stack } from '../../components/Section';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { messagesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatTime } from '../../i18n/format';

export default function ChatListScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const res = await messagesApi.listChats({ actor: user });
      setChats(res);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = search.trim()
    ? chats.filter((c) => (c.other_user?.full_name || '').toLowerCase().includes(search.toLowerCase()))
    : chats;

  return (
    <Screen padded={false} scroll={false}>
      {/* Header */}
      <Row gap={spacing.md} align="center" style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.sm }}>
        <PressableScale onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs'))} hitSlop={10} scaleTo={0.9} style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
        </PressableScale>
        <Stack gap={1} style={{ flex: 1 }}>
          <Text variant="headlineMd">{t('passenger:messages')}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>{t('chat:inboxSubtitle')}</Text>
        </Stack>
      </Row>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Row gap={spacing.sm} align="center" style={{ backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, paddingHorizontal: spacing.md, height: 44 }}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('chat:searchConversations')}
            placeholderTextColor={colors.onSurfaceVariant}
            style={{ flex: 1, color: colors.onSurface, fontSize: 16, paddingVertical: 0 }}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </Row>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={chatKeyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 }}
        ItemSeparatorComponent={ChatSeparator}
        ListEmptyComponent={loading ? <ChatListSkeleton /> : <EmptyChatList />}
        renderItem={({ item, index }) => (
          <FadeSlideIn index={Math.min(index, 8)}>
            <ChatRow item={item} onPress={(userId, userName, phoneNumber) => nav.navigate('Chat', { userId, userName, phoneNumber })} />
          </FadeSlideIn>
        )}
      />
    </Screen>
  );
}

const chatKeyExtractor = (item) => item.other_user?.id ?? item.other_user?.full_name ?? 'fallback';

const ChatSeparator = memo(() => {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: withAlpha(colors.outlineVariant, 0.5), marginStart: 75 }} />;
});

const ChatListSkeleton = memo(() => (
  <SkeletonList count={6} lines={0} gap={spacing.sm} style={{ paddingTop: spacing.xs }} />
));

const EmptyChatList = memo(() => {
  const { t } = useLocale();
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        icon="chat-bubble-outline"
        title={t('driver:noMessagesTitle', 'No Messages Yet')}
        body={t('driver:noMessagesBody', 'Your conversations will appear here.')}
      />
    </View>
  );
});

const ChatRow = memo(({ item, onPress }) => {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const hasUnread = item.unread_count > 0;
  return (
    <PressableScale
      onPress={() => onPress(item.other_user?.id, item.other_user?.full_name, item.other_user?.phone_number)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: spacing.sm }}
    >
      <View>
        <Avatar name={item.other_user?.full_name} size={50} />
        {hasUnread ? (
          <View style={{ position: 'absolute', top: -2, end: -2, minWidth: 20, height: 20, borderRadius: radius.full, backgroundColor: colors.secondaryContainer, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text variant="labelXs" color={colors.onSecondaryContainer}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
          </View>
        ) : null}
      </View>
      <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
        <Row justify="space-between" align="center" gap={spacing.sm}>
          <Text variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>{item.other_user?.full_name ?? t('chat:unknownContact')}</Text>
          <Text variant="labelSm" color={hasUnread ? colors.secondaryContainer : colors.onSurfaceVariant}>{formatTime(item.updated_at, { locale })}</Text>
        </Row>
        <Text variant="bodyMd" color={hasUnread ? colors.onSurface : colors.onSurfaceVariant} numberOfLines={1}>
          {item.last_message || t('chat:noMessagesYet')}
        </Text>
      </Stack>
    </PressableScale>
  );
});
