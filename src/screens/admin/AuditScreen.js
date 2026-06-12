import React, { useCallback, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { Stack, Row } from '../../components/Section';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { FadeSlideIn } from '../../components/motion';

import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../i18n/format';

function actionVariant(action) {
  if (action.startsWith('login') || action.startsWith('register')) return 'info';
  if (action.includes('refund') || action.includes('cancel')) return 'warning';
  if (action.includes('suspend') || action.includes('flag') || action.includes('failed')) return 'error';
  if (action.includes('verified') || action.includes('success') || action.includes('confirmed')) return 'success';
  return 'neutral';
}

export default function AdminAudit() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await adminApi.adminListAudit({ actor: user, filters: { actionType: q || undefined } });
    setRows(res?.rows ?? []);
    setTotal(res?.total ?? 0);
  }, [user, q]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <FadeSlideIn index={0}>
        <ScreenHeader title={t('admin:auditLog')} subtitle={t('admin:auditLogSubtitle')} />
      </FadeSlideIn>
      <FadeSlideIn index={1}>
        <Banner
          variant="info"
          title={t('admin:tamperResistantTitle')}
          body={t('admin:tamperResistantBody')}
        />
      </FadeSlideIn>
      <FadeSlideIn index={2}>
        <Input
          label={t('admin:filterByAction')}
          value={q}
          onChangeText={setQ}
          iconLeft="search"
          placeholder={t('admin:filterByActionPlaceholder')}
        />
      </FadeSlideIn>
      {rows === null ? (
        <SkeletonList count={5} />
      ) : (
        <>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('admin:showingOf', { shown: rows.length, total })}
          </Text>
          {rows.length === 0 ? (
            <EmptyState icon="search-off" title={t('errors:notFound')} />
          ) : (
            rows.map((e, i) => (
              <FadeSlideIn key={e.id} index={Math.min(i, 8)}>
                <Card>
                  <Row justify="space-between">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text variant="labelMd">{e.action_type}</Text>
                      <Text variant="labelSm" color={colors.onSurfaceVariant}>
                        {e.actor_role} · {e.actor_id?.slice(0, 8) ?? t('admin:anonActor')} · {e.ip_address}
                      </Text>
                      <Text variant="labelSm" color={colors.onSurfaceVariant}>
                        {formatDateTime(e.created_at)}
                      </Text>
                      {e.metadata ? (
                        <Text variant="labelSm" color={colors.onSurfaceVariant}>
                          {JSON.stringify(e.metadata)}
                        </Text>
                      ) : null}
                    </Stack>
                    <Badge label={e.target_entity ?? '—'} variant={actionVariant(e.action_type)} />
                  </Row>
                </Card>
              </FadeSlideIn>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
