import React, { useCallback, useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform, Linking, Pressable, Alert } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Row } from '../../components/Section';
import { PressableScale } from '../../components/motion';

import { messagesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha } from '../../theme';
import { formatTime } from '../../i18n/format';
import { useToast } from '../../components/Toast';

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const route = useRoute();
  const nav = useNavigation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  
  const { userId, userName, phoneNumber } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  // Adaptive polling: fast while the conversation is active, backing off to
  // POLL_SLOW_MS when nothing changes. Sending resets to the fast cadence.
  const POLL_FAST_MS = 3000;
  const POLL_SLOW_MS = 12000;
  const pollDelay = useRef(POLL_FAST_MS);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const res = await messagesApi.getMessages({ actor: user, otherUserId: userId });
    if (!Array.isArray(res)) return;
    setMessages((prev) => {
      const changed =
        prev.length !== res.length || prev[prev.length - 1]?.id !== res[res.length - 1]?.id;
      if (changed) {
        pollDelay.current = POLL_FAST_MS;
        return res;
      }
      pollDelay.current = Math.min(Math.round(pollDelay.current * 1.5), POLL_SLOW_MS);
      return prev;
    });
  }, [user, userId]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer = null;
      pollDelay.current = POLL_FAST_MS;
      const tick = async () => {
        await load();
        if (!alive) return;
        timer = setTimeout(tick, pollDelay.current);
      };
      tick();
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }, [load])
  );

  const handleSend = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const res = await messagesApi.sendMessage({ actor: user, receiverId: userId, text });
    setBusy(false);
    if (res.ok) {
      setText('');
      pollDelay.current = POLL_FAST_MS;
      setMessages((prev) => [...prev, res.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } else {
      toast.show(res.error, 'error');
    }
  };

  const deleteMsg = async (messageId, forEveryone) => {
    const res = await messagesApi.deleteMessage({ actor: user, messageId, forEveryone });
    if (res.ok) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } else {
      toast.show(res.error, 'error');
    }
  };

  const handleLongPress = (msg) => {
    Alert.alert(
      t('chat:deleteMessageTitle', 'Delete Message'),
      t('chat:deleteMessageBody', 'Are you sure you want to delete this message?'),
      [
        { text: t('common:cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('chat:deleteForMe', 'Delete for me'), 
          style: 'destructive',
          onPress: () => deleteMsg(msg.id, false)
        },
        ...(msg.sender_id === user?.id ? [{
          text: t('chat:deleteForEveryone', 'Delete for everyone'), 
          style: 'destructive',
          onPress: () => deleteMsg(msg.id, true)
        }] : [])
      ]
    );
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
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Premium Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md, 
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: withAlpha(colors.outlineVariant, 0.3),
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 10,
      }}>
        <Row gap={spacing.md}>
          <PressableScale scaleTo={0.88} onPress={() => nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs')} style={{ padding: 4 }}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </PressableScale>

          <Row gap={spacing.sm}>
            {/* Avatar Placeholder */}
            <View style={{
              width: 40, height: 40, borderRadius: radius.full,
              backgroundColor: colors.primaryFixed,
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Text variant="headlineSm" color={colors.onPrimaryFixed}>
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View>
              <Text variant="headlineSm">{userName}</Text>
              <Text variant="labelSm" color={colors.success}>{t('chat:online')}</Text>
            </View>
          </Row>
        </Row>

        {user?.role === 'driver' && (
          <PressableScale
            scaleTo={0.9}
            onPress={handleCall}
            style={{
              width: 40, height: 40, borderRadius: radius.full,
              backgroundColor: colors.surfaceContainerHigh,
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <MaterialIcons name="call" size={20} color={colors.primary} />
          </PressableScale>
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
            const isMe = item.sender_id === user?.id;
            const onSent = isDark ? colors.onPrimaryContainer : colors.onPrimary;
            return (
              <Animated.View entering={FadeIn.duration(120)}>
                <Pressable
                  onLongPress={() => handleLongPress(item)}
                  style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginVertical: 2 }}
                >
                  {isMe ? (
                    <LinearGradient
                      colors={isDark ? [colors.primaryContainer, colors.primaryContainer] : [colors.primary, colors.primaryContainer]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        maxWidth: '80%',
                        paddingHorizontal: spacing.md,
                        paddingVertical: 12,
                        borderRadius: radius.xl,
                        borderBottomEndRadius: 4,
                        borderBottomStartRadius: radius.xl,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Text variant="bodyMd" color={onSent}>
                        {item.content}
                      </Text>
                      <Text
                        variant="labelXs"
                        color={withAlpha(onSent, 0.75)}
                        style={{ alignSelf: 'flex-end', marginTop: 6 }}
                      >
                        {formatTime(item.created_at, { locale })}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={{
                        maxWidth: '80%',
                        backgroundColor: colors.surfaceContainerHighest,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 12,
                        borderRadius: radius.xl,
                        borderBottomEndRadius: radius.xl,
                        borderBottomStartRadius: 4,
                        shadowColor: colors.onSurface,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <Text variant="bodyMd" color={colors.onSurface}>
                        {item.content}
                      </Text>
                      <Text
                        variant="labelXs"
                        color={colors.onSurfaceVariant}
                        style={{ alignSelf: 'flex-end', marginTop: 6 }}
                      >
                        {formatTime(item.created_at, { locale })}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          }}
        />
      </View>

      {/* Premium Input Area */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: withAlpha(colors.outlineVariant, 0.3),
        gap: spacing.sm
      }}>
        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: radius.xxl,
          paddingEnd: 4,
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('driver:typeMessage', 'Type a message...')}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            style={{
              flex: 1,
              color: colors.onSurface,
              paddingHorizontal: spacing.md,
              paddingTop: Platform.OS === 'ios' ? 14 : 10,
              paddingBottom: Platform.OS === 'ios' ? 14 : 10,
              minHeight: 48,
              maxHeight: 120,
              fontSize: 16,
            }}
          />
          <PressableScale
            scaleTo={0.88}
            onPress={handleSend}
            disabled={!text.trim() || busy}
            style={{
              width: 40,
              height: 40,
              marginBottom: 4,
              borderRadius: radius.full,
              backgroundColor: text.trim() ? colors.secondaryContainer : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons
              name="send"
              size={20}
              color={text.trim() ? colors.onSecondaryContainer : colors.outline}
            />
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
