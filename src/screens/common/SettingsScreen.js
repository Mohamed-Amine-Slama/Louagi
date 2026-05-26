import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/Header';
import { Banner } from '../../components/Banner';
import { Stack, Row, Section } from '../../components/Section';

import { useTheme, THEME_MODES } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { SUPPORTED_LOCALES } from '../../i18n';
import { spacing, radius } from '../../theme';

// Native (autonym) labels — display each language in its own script.
const LANG_LABELS = { en: 'English', fr: 'Français', ar: 'العربية' };
const THEME_ICONS = { light: 'light-mode', dark: 'dark-mode', system: 'brightness-auto' };

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();

  return (
    <Screen>
      <ScreenHeader title={t('settings:title')} showBack />

      <Section title={t('settings:language')}>
        <Card>
          <Stack gap={spacing.xs}>
            {SUPPORTED_LOCALES.map((code) => {
              const active = code === locale;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLocale(code)}
                  style={{
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: active ? colors.primaryFixed : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: active ? colors.primary : colors.surfaceContainer,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="labelMd" color={active ? colors.onPrimary : colors.onSurface}>
                      {code.toUpperCase()}
                    </Text>
                  </View>
                  <Text variant="bodyLg" style={{ flex: 1 }} color={active ? colors.primary : colors.onSurface}>
                    {LANG_LABELS[code]}
                  </Text>
                  {active ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Stack>
        </Card>
        {locale !== 'ar' ? null : (
          <Banner
            variant="info"
            title={t('settings:rtlReloadTitle')}
            body={t('settings:rtlReloadBody')}
          />
        )}
      </Section>

      <Section title={t('settings:appearance')}>
        <Card>
          <Stack gap={spacing.xs}>
            {THEME_MODES.map((m) => {
              const active = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: active ? colors.primaryFixed : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: active ? colors.primary : colors.surfaceContainer,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons
                      name={THEME_ICONS[m]}
                      size={20}
                      color={active ? colors.onPrimary : colors.onSurface}
                    />
                  </View>
                  <Text variant="bodyLg" style={{ flex: 1 }} color={active ? colors.primary : colors.onSurface}>
                    {t(`settings:theme${m[0].toUpperCase()}${m.slice(1)}`)}
                  </Text>
                  {active ? <MaterialIcons name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Stack>
        </Card>
      </Section>

      <Section title={t('settings:about')}>
        <Card>
          <Row justify="space-between">
            <Text variant="bodyMd">{t('settings:version')}</Text>
            <Text variant="labelMd" color={colors.onSurfaceVariant}>{t('settings:betaVersion')}</Text>
          </Row>
        </Card>
      </Section>
    </Screen>
  );
}
