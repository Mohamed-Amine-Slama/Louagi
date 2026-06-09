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
      <View style={{
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
            placeholder={t('common:search', 'Search conversations...')}
            placeholderTextColor={colors.onSurfaceVariant}
            style={{
              flex: 1,
              color: colors.onSurface,
              fontSize: 15,
              paddingVertical: 0,
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={chatKeyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing.md, flexGrow: 1 }}
        ItemSeparatorComponent={ChatSeparator}
        ListEmptyComponent={!loading ? <EmptyChatList /> : null}
        renderItem={({ item }) => <ChatRow item={item} onPress={(userId, userName, phoneNumber) => nav.navigate('Chat', { userId, userName, phoneNumber })} />}
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
      marginLeft: 72,
    }} />
  );
});

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
    <Pressable
      onPress={() => onPress(item.other_user?.id, item.other_user?.full_name, item.other_user?.phone_number)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        gap: spacing.md,
        backgroundColor: pressed
          ? withAlpha(colors.primary, 0.05)
          : 'transparent',
        borderRadius: radius.lg,
        paddingHorizontal: spacing.xs,
      })}
    >
      <Avatar name={item.other_user?.full_name} size={52} badge />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            variant="headlineSm"
            numberOfLines={1}
            style={{ flex: 1, fontWeight: hasUnread ? '700' : '500' }}
          >
            {item.other_user?.full_name ?? 'Unknown'}
          </Text>
          <Text
            variant="labelSm"
            color={hasUnread ? colors.primary : colors.onSurfaceVariant}
            style={{ fontWeight: hasUnread ? '600' : '400', marginLeft: spacing.sm }}
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
            {item.last_message || t('driver:noMessagesBody', 'No messages yet')}
          </Text>
          {hasUnread && (
            <View style={{
              minWidth: 22, height: 22, borderRadius: 11,
              backgroundColor: colors.primary, alignItems: 'center',
              justifyContent: 'center', paddingHorizontal: 6, marginLeft: spacing.sm,
            }}>
              <Text variant="labelSm" color={colors.onPrimary} style={{ fontSize: 11, fontWeight: '700' }}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
