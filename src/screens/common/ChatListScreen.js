import React, { memo, useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, Pressable, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Text } from '../../components/Text';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn, PressableScale } from '../../components/motion';

import { messagesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatTime } from '../../i18n/format';

export default function ChatListScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = search.trim()
    ? chats.filter(c =>
        (c.other_user?.full_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : chats;

  return (
    <Screen padded={false} scroll={false}>
      <ScreenHeader title={t('passenger:messages')} showBack />

      {/* Search Bar */}
      <FadeSlideIn index={0} style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: radius.full,
          paddingHorizontal: spacing.md,
          height: 44,
          gap: spacing.sm,
        }}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('chat:searchConversations')}
            placeholderTextColor={colors.onSurfaceVariant}
            style={{
              flex: 1,
              color: colors.onSurface,
              fontSize: 16,
              paddingVertical: 0,
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          )}
        </View>
      </FadeSlideIn>

      <FlatList
        data={filtered}
        keyExtractor={chatKeyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing.md, flexGrow: 1 }}
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
  return (
    <View style={{
      height: 1,
      backgroundColor: withAlpha(colors.outlineVariant, 0.3),
      marginStart: 72,
    }} />
  );
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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.xs,
      }}
    >
      <Avatar name={item.other_user?.full_name} size={52} badge />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            variant="headlineSm"
            numberOfLines={1}
            style={{ flex: 1, fontWeight: hasUnread ? '700' : '500' }}
          >
            {item.other_user?.full_name ?? t('chat:unknownContact')}
          </Text>
          <Text
            variant="labelSm"
            color={hasUnread ? colors.primary : colors.onSurfaceVariant}
            style={{ fontWeight: hasUnread ? '600' : '400', marginStart: spacing.sm }}
          >
            {formatTime(item.updated_at, { locale })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            variant="bodyMd"
            color={hasUnread ? colors.onSurface : colors.onSurfaceVariant}
            numberOfLines={1}
            style={{ flex: 1, fontWeight: hasUnread ? '600' : '400' }}
          >
            {item.last_message || t('chat:noMessagesYet')}
          </Text>
          {hasUnread && (
            <View style={{
              minWidth: 22, height: 22, borderRadius: radius.full,
              backgroundColor: colors.secondaryContainer, alignItems: 'center',
              justifyContent: 'center', paddingHorizontal: 6, marginStart: spacing.sm,
            }}>
              <Text variant="labelSm" color={colors.onSecondaryContainer} style={{ fontWeight: '700' }}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
});
