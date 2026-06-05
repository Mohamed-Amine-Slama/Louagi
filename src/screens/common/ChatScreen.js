import React, { useCallback, useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform, Linking, Pressable } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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
  const insets = useSafeAreaInsets();
  
  const { userId, userName, phoneNumber } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
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
          <Pressable onPress={() => nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs')} style={{ padding: 4 }}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          
          <Row gap={spacing.sm}>
            {/* Avatar Placeholder */}
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.primaryFixed,
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Text variant="headlineSm" color={colors.onPrimaryFixed}>
                {userName ? userName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View>
              <Text variant="headlineSm">{userName}</Text>
              <Text variant="labelSm" color={colors.success}>Online</Text>
            </View>
          </Row>
        </Row>
        
        {user?.role === 'driver' && (
          <Pressable 
            onPress={handleCall} 
            style={{ 
              width: 40, height: 40, borderRadius: 20, 
              backgroundColor: colors.surfaceContainerHigh, 
              alignItems: 'center', justifyContent: 'center' 
            }}
          >
            <MaterialIcons name="call" size={20} color={colors.primary} />
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
            const isMe = item.sender_id === user?.id;
            return (
              <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginVertical: 2 }}>
                {isMe ? (
                  <LinearGradient
                    colors={[colors.primary, '#1a365d']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      maxWidth: '80%',
                      paddingHorizontal: spacing.md,
                      paddingVertical: 12,
                      borderRadius: radius.xl,
                      borderBottomRightRadius: 4,
                      borderBottomLeftRadius: radius.xl,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text variant="bodyMd" color={colors.onPrimary}>
                      {item.content}
                    </Text>
                    <Text 
                      variant="labelSm" 
                      color={withAlpha(colors.onPrimary, 0.7)}
                      style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 10 }}
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
                      borderBottomRightRadius: radius.xl,
                      borderBottomLeftRadius: 4,
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
                      variant="labelSm" 
                      color={colors.onSurfaceVariant}
                      style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 10 }}
                    >
                      {formatTime(item.created_at, { locale })}
                    </Text>
                  </View>
                )}
              </View>
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
        gap: spacing.sm
      }}>
        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: colors.surfaceContainerLowest,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          paddingRight: 4,
          shadowColor: colors.onSurface,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
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
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || busy}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              marginBottom: 4,
              borderRadius: 20,
              backgroundColor: text.trim() ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed && text.trim() ? 0.95 : 1 }],
            })}
          >
            <MaterialIcons 
              name="send" 
              size={20} 
              color={text.trim() ? colors.onPrimary : colors.outline} 
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
