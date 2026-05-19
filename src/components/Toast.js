import React, { createContext, useCallback, useContext, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, shadows } from '../theme';

const ToastCtx = createContext({ show: () => {} });

function buildTones(colors) {
  return {
    success: { bg: colors.success, icon: 'check-circle', fg: colors.onPrimary },
    error: { bg: colors.error, icon: 'error', fg: colors.onPrimary },
    info: { bg: colors.primary, icon: 'info', fg: colors.onPrimary },
    warning: { bg: colors.secondaryContainer, icon: 'warning-amber', fg: colors.onSecondaryContainer },
  };
}

export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState(null);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const tone = buildTones(colors);

  const show = useCallback((msg, variant = 'info', ttl = 2800) => {
    setToast({ msg, variant });
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setToast(null)
      );
    }, ttl);
  }, [opacity]);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'flex-end', padding: spacing.lg, opacity },
          ]}
        >
          <View
            style={{
              backgroundColor: tone[toast.variant]?.bg ?? colors.primary,
              borderRadius: radius.xl,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: 80,
              ...shadows.floating,
            }}
          >
            <MaterialIcons
              name={tone[toast.variant]?.icon ?? 'info'}
              size={20}
              color={tone[toast.variant]?.fg ?? colors.onPrimary}
            />
            <Text variant="labelMd" color={tone[toast.variant]?.fg ?? colors.onPrimary}>
              {toast.msg}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
