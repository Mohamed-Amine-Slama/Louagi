import React, { useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { Text } from './Text';
import { Button } from './Button';
import { spacing, radius, withAlpha } from '../theme';
import { SPRING } from './motion';

const sheetEntering = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 48 }, { scale: 0.95 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 180 }),
      transform: [
        { translateY: withSpring(0, SPRING) },
        { scale: withSpring(1, SPRING) },
      ],
    },
  };
};

function Star({ filled, onSelect }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, SPRING));
        onSelect();
      }}
      style={{ padding: 4 }}
    >
      <Animated.View style={starStyle}>
        <MaterialIcons
          name={filled ? 'star' : 'star-border'}
          size={48}
          color={filled ? colors.warning : colors.outline}
        />
      </Animated.View>
    </Pressable>
  );
}

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
            backgroundColor: withAlpha(colors.scrim, 0.5),
            justifyContent: 'flex-end',
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Animated.View
              entering={sheetEntering}
              style={{
                backgroundColor: colors.surface,
                borderTopStartRadius: radius.xxl,
                borderTopEndRadius: radius.xxl,
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
                {t('passenger:rateDriverBody', { name: driverName || t('common:theDriver') })}
              </Text>

              {/* Stars */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} filled={star <= rating} onSelect={() => setRating(star)} />
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
            </Animated.View>
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
