import React from 'react';
import { View, ScrollView, Text as RNText } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import i18n from '../i18n';

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
          <RNText style={[typography.headlineMd, { color: colors.error }]}>
            {i18n.t('errors:crashTitle')}
          </RNText>
          <RNText style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: spacing.sm }]}>
            {i18n.t('errors:crashBody')}
          </RNText>
        </View>
        <View
          style={{
            backgroundColor: colors.surfaceContainer,
            padding: spacing.md,
            borderRadius: radius.lg,
          }}
        >
          <RNText style={typography.labelMd}>{String(this.state.error?.message || this.state.error)}</RNText>
        </View>
        {this.state.error?.stack ? (
          <View
            style={{
              backgroundColor: colors.surfaceContainer,
              padding: spacing.md,
              borderRadius: radius.lg,
            }}
          >
            <RNText style={[typography.bodySm, { color: colors.onSurfaceVariant }]}>
              {String(this.state.error.stack)}
            </RNText>
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
            <RNText style={[typography.bodySm, { color: colors.onSurfaceVariant }]}>
              {String(this.state.info.componentStack)}
            </RNText>
          </View>
        ) : null}
      </ScrollView>
    );
  }
}
