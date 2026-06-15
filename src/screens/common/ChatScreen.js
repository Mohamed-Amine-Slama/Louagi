import React, { useCallback, useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform, Linking, Pressable, Alert, ScrollView } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '../../components/Text';
import { Row, Stack } from '../../components/Section';
import { Avatar } from '../../components/Avatar';
import { PressableScale } from '../../components/motion';

import { messagesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius, withAlpha, shadows } from '../../theme';
import { formatTime } from '../../i18n/format';
import { useToast } from '../../components/Toast';

export default function ChatScreen() {
  const { colors } = useTheme();
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

  const POLL_FAST_MS = 3000;
  const POLL_SLOW_MS = 12000;
  const pollDelay = useRef(POLL_FAST_MS);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const res = await messagesApi.getMessages({ actor: user, otherUserId: userId });
    if (!Array.isArray(res)) return;
    setMessages((prev) => {
      const changed = prev.length !== res.length || prev[prev.length - 1]?.id !== res[res.length - 1]?.id;
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
      return () => { alive = false; if (timer) clearTimeout(timer); };
    }, [load])
  );

  const post = async (body) => {
    if (!body.trim() || busy) return false;
    setBusy(true);
    const res = await messagesApi.sendMessage({ actor: user, receiverId: userId, text: body });
    setBusy(false);
    if (res.ok) {
      pollDelay.current = POLL_FAST_MS;
      setMessages((prev) => [...prev, res.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      return true;
    }
    toast.show(res.error, 'error');
    return false;
  };

  const handleSend = async () => {
    const ok = await post(text);
    if (ok) setText('');
  };

  const deleteMsg = async (messageId, forEveryone) => {
    const res = await messagesApi.deleteMessage({ actor: user, messageId, forEveryone });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
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
        { text: t('chat:deleteForMe', 'Delete for me'), style: 'destructive', onPress: () => deleteMsg(msg.id, false) },
        ...(msg.sender_id === user?.id
          ? [{ text: t('chat:deleteForEveryone', 'Delete for everyone'), style: 'destructive', onPress: () => deleteMsg(msg.id, true) }]
          : []),
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

  const quickReplies = [t('chat:quickWhereAreYou'), t('chat:quickImHere'), t('chat:quickRunningLate')];
  const canSend = !!text.trim() && !busy;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <Row
        gap={11}
        align="center"
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: spacing.md,
          backgroundColor: colors.surfaceContainerLowest,
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
        }}
      >
        <PressableScale onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs'))} hitSlop={10} scaleTo={0.88} style={iconBtn(colors)}>
          <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
        </PressableScale>
        <Avatar name={userName} size={42} />
        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyLg" numberOfLines={1}>{userName}</Text>
          <Text variant="labelSm" color={colors.success}>{t('chat:online')}</Text>
        </Stack>
        {phoneNumber ? (
          <PressableScale onPress={handleCall} scaleTo={0.9} style={iconBtn(colors)}>
            <MaterialIcons name="call" size={18} color={colors.primary} />
          </PressableScale>
        ) : null}
      </Row>

      {/* Encryption notice (the design's centered context chip) */}
      <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
        <Row gap={5} align="center" style={{ backgroundColor: withAlpha(colors.success, 0.12), borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 }}>
          <MaterialIcons name="lock" size={13} color={colors.success} />
          <Text variant="labelSm" color={colors.success}>{t('driver:endToEndEncrypted', 'End-to-End Encrypted')}</Text>
        </Row>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const isMe = item.sender_id === user?.id;
          const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender_id === user?.id);
          return (
            <Animated.View entering={FadeIn.duration(140)}>
              <Pressable
                onLongPress={() => handleLongPress(item)}
                style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}
              >
                {!isMe ? (showAvatar ? <Avatar name={userName} size={28} /> : <View style={{ width: 28 }} />) : null}
                <View style={{ maxWidth: '74%' }}>
                  <View
                    style={[
                      {
                        backgroundColor: isMe ? colors.secondaryContainer : colors.surfaceContainerLowest,
                        borderRadius: 16,
                        borderBottomEndRadius: isMe ? 5 : 16,
                        borderBottomStartRadius: isMe ? 16 : 5,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                      },
                      isMe ? null : shadows.soft,
                    ]}
                  >
                    <Text variant="bodyMd" color={isMe ? colors.onSecondaryContainer : colors.onSurface}>{item.content}</Text>
                  </View>
                  <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                    {formatTime(item.created_at, { locale })}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      {/* Quick replies + input */}
      <View style={{ backgroundColor: colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingBottom: Math.max(insets.bottom, spacing.md) }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
          {quickReplies.map((q) => (
            <PressableScale key={q} scaleTo={0.95} onPress={() => post(q)} style={{ borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text variant="labelMd" color={colors.primary}>{q}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        <Row gap={9} align="center" style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('driver:typeMessage', 'Type a message...')}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 120,
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: radius.xxl,
              paddingHorizontal: 18,
              paddingTop: 13,
              paddingBottom: 13,
              fontSize: 15,
              color: colors.onSurface,
            }}
          />
          <PressableScale
            scaleTo={0.88}
            onPress={handleSend}
            disabled={!canSend}
            style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: canSend ? colors.secondaryContainer : colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialIcons name="send" size={20} color={canSend ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
          </PressableScale>
        </Row>
      </View>
    </KeyboardAvoidingView>
  );
}

function iconBtn(colors) {
  return { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' };
}
