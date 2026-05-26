import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Row } from '../../components/Section';

import { messagesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../theme';
import { formatTime } from '../../i18n/format';

export default function ChatListScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const nav = useNavigation();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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

  return (
    <Screen padded={false} scroll={false}>
      <ScreenHeader title={t('passenger:messages')} showBack />
      
      <FlatList
        data={chats}
        keyExtractor={(item) => item.other_user.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="chat-bubble-outline"
              title={t('driver:noMessagesTitle', 'No Messages Yet')}
              body={t('driver:noMessagesBody', 'Your conversations will appear here.')}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('Chat', { userId: item.other_user.id, userName: item.other_user.full_name })}
          >
            <Card>
              <Row gap={spacing.md}>
                <Avatar name={item.other_user.full_name} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Row justify="space-between">
                    <Text variant="headlineSm" numberOfLines={1} style={{ flex: 1 }}>
                      {item.other_user.full_name}
                    </Text>
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      {formatTime(item.updated_at, { locale })}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text
                      variant="bodyMd"
                      color={item.unread_count > 0 ? colors.onSurface : colors.onSurfaceVariant}
                      numberOfLines={1}
                      style={{ flex: 1, fontWeight: item.unread_count > 0 ? '600' : '400' }}
                    >
                      {item.last_message}
                    </Text>
                    {item.unread_count > 0 && (
                      <Badge label={String(item.unread_count)} variant="error" />
                    )}
                  </Row>
                </View>
              </Row>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
