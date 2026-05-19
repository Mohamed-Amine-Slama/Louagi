import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius } from '../theme';

export class ErrorBoundary extends React.Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('App crash:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <View style={{ marginTop: 80 }}>
          <Text variant="headlineMd" color={colors.error}>
            Something crashed.
          </Text>
          <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: spacing.sm }}>
            Stack trace below — share it back so we can patch the root cause.
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.surfaceContainer,
            padding: spacing.md,
            borderRadius: radius.lg,
          }}
        >
          <Text variant="labelMd">{String(this.state.error?.message || this.state.error)}</Text>
        </View>
        {this.state.error?.stack ? (
          <View
            style={{
              backgroundColor: colors.surfaceContainer,
              padding: spacing.md,
              borderRadius: radius.lg,
            }}
          >
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {String(this.state.error.stack)}
            </Text>
          </View>
        ) : null}
        {this.state.info?.componentStack ? (
          <View
            style={{
              backgroundColor: colors.surfaceContainer,
              padding: spacing.md,
              borderRadius: radius.lg,
            }}
          >
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {String(this.state.info.componentStack)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    );
  }
}
