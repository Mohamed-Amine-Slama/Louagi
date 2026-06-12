import React, { useState, useEffect } from 'react';
import { View, Modal, Pressable, ScrollView, Platform } from 'react-native';
import Animated, {
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { spacing, radius, withAlpha } from '../../theme';
import { SPRING } from '../../components/motion';
import { LEGAL_CONTENT } from './LegalContent';

const sheetEntering = () => {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 60 }, { scale: 0.95 }],
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

export function LegalDocModal({ visible, docKey, onClose }) {
  const { colors } = useTheme();
  const { locale, t } = useLocale();

  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasScrolledToBottom(false);
      setScrollViewHeight(0);
      setContentHeight(0);
    }
  }, [visible, docKey]);

  const activeLocale = LEGAL_CONTENT[locale] ? locale : 'en';
  const doc = LEGAL_CONTENT[activeLocale][docKey];

  if (!doc) return null;

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleContentSizeChange = (w, h) => {
    setContentHeight(h);
    if (scrollViewHeight > 0 && h <= scrollViewHeight) {
      setHasScrolledToBottom(true);
    }
  };

  const handleLayout = (event) => {
    const height = event.nativeEvent.layout.height;
    setScrollViewHeight(height);
    if (contentHeight > 0 && contentHeight <= height) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: withAlpha(colors.scrim, 0.5),
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          entering={sheetEntering}
          style={{
            backgroundColor: colors.surface,
            borderTopStartRadius: radius.xxl,
            borderTopEndRadius: radius.xxl,
            padding: spacing.lg,
            maxHeight: '85%',
            paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text variant="headlineSm">{doc.title}</Text>
            <Pressable onPress={() => onClose(false)} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={true}
            style={{ marginBottom: spacing.lg }}
            contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleLayout}
          >
            {doc.sections.map((section, idx) => (
              <View 
                key={idx} 
                style={{ 
                  backgroundColor: colors.surfaceContainerLowest, 
                  borderRadius: radius.md, 
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant
                }}
              >
                <Text variant="labelMd" style={{ marginBottom: 4 }} color={colors.primary}>
                  {section.heading}
                </Text>
                <Text variant="bodyMd" color={colors.onSurface}>
                  {section.text}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Button
            label={hasScrolledToBottom ? t('auth:acceptAndClose') : t('auth:scrollToBottom')}
            onPress={() => onClose(true)}
            variant="primary"
            disabled={!hasScrolledToBottom}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}
