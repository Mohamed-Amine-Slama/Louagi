import React, { useCallback, useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform, Linking, Pressable } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Row } from '../../components/Section';

import { messagesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatTime } from '../../i18n/format';
import { useToast } from '../../components/Toast';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const route = useRoute();
  const nav = useNavigation();
  const toast = useToast();
  
  const { userId, userName, phoneNumber } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    const res = await messagesApi.getMessages({ actor: user, otherUserId: userId });
    setMessages(res);
  }, [user, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Simple polling for new messages in mock mode
      const interval = setInterval(load, 3000);
      return () => clearInterval(interval);
    }, [load])
  );

  const handleSend = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const res = await messagesApi.sendMessage({ actor: user, receiverId: userId, text });
    setBusy(false);
    if (res.ok) {
      setText('');
      setMessages((prev) => [...prev, res.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } else {
      toast.show(res.error, 'error');
    }
  };

  const handleCall = () => {
    if (!phoneNumber) {
      toast.show(t('toast:phoneUnavailable'), 'warning');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.surface }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Custom Header to add Call button for drivers */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md, 
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
      }}>
        <Row gap={spacing.sm}>
          <Pressable onPress={() => nav.goBack()} style={{ padding: 4 }}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text variant="headlineSm">{userName}</Text>
        </Row>
        
        {user.role === 'driver' && (
          <Pressable onPress={handleCall} style={{ padding: 8 }}>
            <MaterialIcons name="call" size={24} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: withAlpha(colors.success, 0.1),
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.full,
                gap: 4
              }}>
                <MaterialIcons name="lock" size={14} color={colors.success} />
                <Text variant="labelSm" color={colors.success}>
                  {t('driver:endToEndEncrypted', 'End-to-End Encrypted')}
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user.id;
            return (
              <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '80%',
                    backgroundColor: isMe ? colors.primary : colors.surfaceContainerHigh,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.xl,
                    borderBottomRightRadius: isMe ? 4 : radius.xl,
                    borderBottomLeftRadius: isMe ? radius.xl : 4,
                  }}
                >
                  <Text variant="bodyMd" color={isMe ? colors.onPrimary : colors.onSurface}>
                    {item.content}
                  </Text>
                  <Text 
                    variant="labelSm" 
                    color={isMe ? withAlpha(colors.onPrimary, 0.7) : colors.onSurfaceVariant}
                    style={{ alignSelf: 'flex-end', marginTop: 4, fontSize: 10 }}
                  >
                    {formatTime(item.created_at, { locale })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Input Area */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        padding: spacing.md, 
        paddingBottom: spacing.lg,
        backgroundColor: colors.surfaceContainerLowest,
        borderTopWidth: 1,
        borderTopColor: colors.outlineVariant,
        gap: spacing.sm
      }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('driver:typeMessage', 'Type a message...')}
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          style={{
            flex: 1,
            backgroundColor: colors.surfaceContainer,
            color: colors.onSurface,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.md,
            paddingTop: 12,
            paddingBottom: 12,
            minHeight: 48,
            maxHeight: 120,
          }}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || busy}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: text.trim() ? colors.primary : colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons 
            name="send" 
            size={20} 
            color={text.trim() ? colors.onPrimary : colors.onSurfaceVariant} 
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
