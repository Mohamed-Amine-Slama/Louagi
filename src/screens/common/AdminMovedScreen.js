import React from 'react';
import { View, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { FadeSlideIn } from '../../components/motion';

import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { adminWebUrl } from '../../config';
import { spacing, radius, withAlpha } from '../../theme';

// The admin dashboard has been extracted into a standalone web application.
// Admins still authenticate through the normal mobile flow, but instead of the
// in-app dashboard they land here and are pointed at the web app.
export default function AdminMovedScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { signOut } = useAuth();

  const openWeb = () => {
    if (adminWebUrl) Linking.openURL(adminWebUrl).catch(() => {});
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <FadeSlideIn index={0}>
          <Card style={{ alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: radius.full,
                backgroundColor: withAlpha(colors.primary, 0.12),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="desktop-windows" size={38} color={colors.primary} />
            </View>
            <Text variant="headlineMd" style={{ textAlign: 'center' }}>
              {t('common:adminMovedTitle')}
            </Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
              {t('common:adminMovedBody')}
            </Text>
            <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.sm }}>
              {adminWebUrl ? (
                <Button label={t('common:adminOpenWeb')} onPress={openWeb} />
              ) : null}
              <Button label={t('auth:signout')} variant="outline" onPress={signOut} />
            </View>
          </Card>
        </FadeSlideIn>
      </View>
    </Screen>
  );
}
