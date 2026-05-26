import React, { useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Button } from './Button';
import { spacing, radius, withAlpha } from '../theme';

export function RateDriverModal({ visible, onClose, onSubmit, driverName }) {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    await onSubmit({ rating, comment });
    setSubmitting(false);
  };

  const resetAndClose = () => {
    if (submitting) return;
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            backgroundColor: withAlpha('#000000', 0.5),
            justifyContent: 'flex-end',
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: spacing.lg,
                paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
              }}
            >
              <Row justify="space-between" align="center" style={{ marginBottom: spacing.md }}>
                <Text variant="headlineSm">{t('passenger:rateDriverTitle')}</Text>
                <Pressable onPress={resetAndClose} style={{ padding: 4 }}>
                  <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
                </Pressable>
              </Row>

              <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: spacing.lg, textAlign: 'center' }}>
                {t('passenger:rateDriverBody', { name: driverName || 'the driver' })}
              </Text>

              {/* Stars */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                      padding: 4,
                    })}
                  >
                    <MaterialIcons
                      name={star <= rating ? 'star' : 'star-border'}
                      size={48}
                      color={star <= rating ? colors.primary : colors.outline}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={t('passenger:rateDriverPlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                style={{
                  backgroundColor: colors.surfaceContainerLowest,
                  color: colors.onSurface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                  padding: spacing.md,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: spacing.xl,
                }}
              />

              <Button
                label={t('common:submit')}
                onPress={handleSubmit}
                loading={submitting}
                disabled={rating === 0}
                variant="primary"
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function Row({ children, justify = 'flex-start', align = 'center', style, gap = 0 }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: justify, alignItems: align, gap }, style]}>
      {children}
    </View>
  );
}
