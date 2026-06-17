// Web stub: react-native-maps has no web implementation, so Metro picks this
// file on web (`.web.js` beats `.js`) and the native map screen is never
// bundled there. Live tracking is a mobile feature.

import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/EmptyState';
import { useLocale } from '../../context/LocaleContext';

export default function TrackDeliveryScreenWeb() {
  const { t } = useLocale();
  const nav = useNavigation();
  return (
    <Screen>
      <EmptyState
        icon="map"
        title={t('delivery:trackTitle')}
        body={t('delivery:waitingFixBody')}
        actionLabel={t('common:close')}
        onAction={() => nav.canGoBack() && nav.goBack()}
      />
    </Screen>
  );
}
