// Credential-style account & vehicle cards for the profile screens. Read-first
// "data-page" layout (monogram + uppercase mono micro-labels over values + a
// perforated divider + an MRZ flourish) that flips to the existing inline form
// on Edit. Controlled: the screens own all state/API; each card owns only its
// `editing` boolean and collapses when onSave() resolves truthy.
import React, { useState } from 'react';
import { View, Platform, UIManager, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { Row, Stack, Section } from './Section';
import { PressableScale } from './motion';
import { spacing, radius, withAlpha } from '../theme';
import { MONO, initialsOf, memberNo, mrzLine } from '../lib/tickets';

// Android needs LayoutAnimation explicitly enabled for the edit/read collapse.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const ease = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

// ── Primitives ──────────────────────────────────────────────────────────────

function Monogram({ name, size = 52 }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        backgroundColor: withAlpha(colors.primary, 0.08),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="headlineSm" color={colors.primary}>{initialsOf(name)}</Text>
    </View>
  );
}

// Uppercase micro-label over a value, optional trailing node (e.g. a verified
// tick). The building block of both card grids.
function CredentialField({ label, value, trailing, mono, align = 'flex-start', style }) {
  const { colors } = useTheme();
  return (
    <Stack gap={4} style={[{ flex: 1, minWidth: 0, alignItems: align }, style]}>
      <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ letterSpacing: 0.6 }}>
        {String(label).toUpperCase()}
      </Text>
      <Row gap={6} align="center">
        <Text variant="labelMd" numberOfLines={1} style={mono ? { fontFamily: MONO, fontSize: 14, lineHeight: 20 } : null}>
          {value || '—'}
        </Text>
        {trailing}
      </Row>
    </Stack>
  );
}

// Dashed perforation divider, matching the boarding-pass language.
function Perforation() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderTopWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.outlineVariant,
        marginVertical: spacing.md,
      }}
    />
  );
}

// White license-plate frame with the masked number in mono and the Tunisian
// "تونس" marker. Splits the masked value on spaces/·/- to slot تونس between
// segments (real-plate layout); falls back to value + تونس.
function PlateChip({ plate }) {
  const { colors } = useTheme();
  const raw = String(plate || '').trim();
  const segs = raw.split(/[\s·\-]+/).filter(Boolean);
  const num = { fontFamily: MONO, fontSize: 16, color: colors.onSurface };
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1.5,
        borderColor: colors.outline,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      {segs.length >= 2 ? (
        <>
          <Text style={num}>{segs[0]}</Text>
          <Text variant="labelSm" color={colors.secondaryContainer}>تونس</Text>
          <Text style={num}>{segs.slice(1).join(' ')}</Text>
        </>
      ) : (
        <>
          <Text style={num}>{raw || '—'}</Text>
          <Text variant="labelSm" color={colors.secondaryContainer}>تونس</Text>
        </>
      )}
    </View>
  );
}

// Faint passport-style machine-readable strip. Decorative + forced LTR.
function MrzStrip({ name, id }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: withAlpha(colors.onSurface, 0.05),
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginTop: spacing.md,
      }}
    >
      <Text
        numberOfLines={1}
        style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: colors.onSurfaceVariant, writingDirection: 'ltr' }}
      >
        {mrzLine(name, id)}
      </Text>
    </View>
  );
}

// Edit ⇄ Cancel toggle that lives in the Section `action` slot.
function EditPill({ editing, onPress }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} accessibilityRole="button">
      <Row
        gap={5}
        align="center"
        style={{
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: radius.full,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: 6,
        }}
      >
        <MaterialIcons name={editing ? 'close' : 'edit'} size={14} color={colors.onSurfaceVariant} />
        <Text variant="labelSm" color={colors.onSurfaceVariant}>{editing ? t('common:cancel') : t('common:edit')}</Text>
      </Row>
    </PressableScale>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

// Account credential — shared by passenger & driver. `displayName` drives the
// read view + monogram + MRZ; `name`/`email` are the editable form values.
export function AccountCard({
  title,
  displayName,
  memberId,
  name,
  email,
  onChangeName,
  onChangeEmail,
  phoneMasked,
  errors = {},
  saving,
  onSave,
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const shownName = displayName || name;

  const toggle = () => { ease(); setEditing((e) => !e); };
  const submit = async () => {
    const ok = await onSave?.();
    if (ok) { ease(); setEditing(false); }
  };

  return (
    <Section title={title} action={<EditPill editing={editing} onPress={toggle} />}>
      <Card>
        <Row gap={spacing.md} align="center">
          <Monogram name={shownName} />
          <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
            <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ letterSpacing: 0.6 }}>
              {t('common:holder').toUpperCase()}
            </Text>
            <Text variant="headlineSm" numberOfLines={1}>{shownName}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.onSurfaceVariant }} numberOfLines={1}>
              {memberNo(memberId)}
            </Text>
          </Stack>
        </Row>

        {editing ? (
          <Stack gap={spacing.md} style={{ marginTop: spacing.md }}>
            <Input label={t('auth:fullName')} value={name} onChangeText={onChangeName} error={errors.fullName} iconLeft="person" />
            <Input
              label={t('auth:email')}
              value={email}
              onChangeText={onChangeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              iconLeft="email"
            />
            <Row justify="space-between" align="center">
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ letterSpacing: 0.6 }}>
                  {t('common:phone').toUpperCase()}
                </Text>
                <Text variant="bodyMd">{phoneMasked || '—'}</Text>
              </Stack>
              <MaterialIcons name="verified" size={20} color={colors.success} />
            </Row>
            <Button label={t('passenger:saveAccount')} variant="secondary" onPress={submit} loading={saving} />
          </Stack>
        ) : (
          <>
            <Perforation />
            <Row gap={spacing.md} align="flex-start">
              <CredentialField label={t('auth:email')} value={email} mono />
              <CredentialField
                label={t('common:phone')}
                value={phoneMasked}
                mono
                trailing={<MaterialIcons name="verified" size={16} color={colors.success} />}
              />
            </Row>
            <MrzStrip name={shownName} id={memberId} />
          </>
        )}
      </Card>
    </Section>
  );
}

// Vehicle registration credential — driver only.
export function VehicleCard({
  title,
  brand,
  model,
  seats,
  onChangeBrand,
  onChangeModel,
  onChangeSeats,
  plateMasked,
  plateNote,
  saving,
  onSave,
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const makeModel = [brand, model].filter(Boolean).join(' ');

  const toggle = () => { ease(); setEditing((e) => !e); };
  const submit = async () => {
    const ok = await onSave?.();
    if (ok) { ease(); setEditing(false); }
  };

  return (
    <Section title={title} action={<EditPill editing={editing} onPress={toggle} />}>
      <Card>
        {editing ? (
          <Stack gap={spacing.md}>
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Input label={t('driver:brand')} value={brand} onChangeText={onChangeBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('driver:model')} value={model} onChangeText={onChangeModel} />
              </View>
            </Row>
            <Input label={t('driver:seatCount')} value={seats} onChangeText={onChangeSeats} keyboardType="number-pad" />
            {plateNote ? <Text variant="labelSm" color={colors.onSurfaceVariant}>{plateNote}</Text> : null}
            <Button label={t('driver:saveVehicle')} variant="secondary" onPress={submit} loading={saving} />
          </Stack>
        ) : (
          <>
            <Row gap={spacing.md} align="flex-start">
              <CredentialField label={t('common:makeModel')} value={makeModel} />
              <CredentialField label={t('common:seats')} value={String(seats || '—')} align="flex-end" style={{ flex: 0 }} />
            </Row>
            <Perforation />
            <Text variant="labelXs" color={colors.onSurfaceVariant} style={{ letterSpacing: 0.6, marginBottom: spacing.sm }}>
              {t('common:registration').toUpperCase()}
            </Text>
            <Row justify="space-between" align="center">
              <PlateChip plate={plateMasked} />
              <MaterialIcons name="directions-car" size={26} color={colors.outlineVariant} />
            </Row>
          </>
        )}
      </Card>
    </Section>
  );
}
