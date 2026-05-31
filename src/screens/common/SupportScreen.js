import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { Section, Row, Stack } from '../../components/Section';

import { usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/Toast';
import { radius, spacing } from '../../theme';

const TABS = [
  { key: 'help', icon: 'help', label: 'passenger:helpCentre' },
  { key: 'contact', icon: 'chat', label: 'passenger:contactSupport' },
  { key: 'terms', icon: 'description', label: 'passenger:terms' },
  { key: 'privacy', icon: 'privacy-tip', label: 'passenger:privacy' },
  { key: 'data', icon: 'download', label: 'passenger:downloadData' },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { user } = useAuth();
  const route = useRoute();
  const toast = useToast();

  const initialSection = route.params?.section || 'help';
  const [section, setSection] = useState(initialSection);
  const [topic, setTopic] = useState(t('support:defaultTopic'));
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [ticket, setTicket] = useState(null);
  const [sending, setSending] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setSection(route.params?.section || 'help');
  }, [route.params?.section]);

  const activeMeta = TABS.find((tab) => tab.key === section) || TABS[0];
  const exportSummary = useMemo(() => {
    if (!exportData) return null;
    return {
      bookings: exportData.reservations?.length || 0,
      deliveries: exportData.deliveries?.length || 0,
      tickets: exportData.support_tickets?.length || 0,
    };
  }, [exportData]);

  const submitTicket = async () => {
    setErrors({});
    setSending(true);
    const res = await usersApi.createSupportTicket({ actor: user, topic, message });
    setSending(false);
    if (!res.ok) {
      setErrors(res.errors || { message: res.error || t('support:ticketFailed') });
      return;
    }
    setTicket(res.ticket);
    setMessage('');
    toast.show(t('toast:supportTicketCreated', { id: res.ticket.id.slice(0, 6).toUpperCase() }), 'success');
  };

  const prepareExport = async () => {
    setExporting(true);
    const res = await usersApi.requestDataExport({ actor: user });
    setExporting(false);
    if (!res.ok) {
      toast.show(res.error || t('support:exportFailed'), 'error');
      return;
    }
    setExportData(res.export);
    toast.show(t('toast:exportReady'), 'success');
  };

  return (
    <Screen>
      <ScreenHeader
        title={t('support:title')}
        subtitle={t(activeMeta.label)}
        showBack
      />

      <View style={{ gap: spacing.sm }}>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {TABS.map((tab) => {
            const active = tab.key === section;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setSection(tab.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary : colors.surfaceContainer,
                }}
              >
                <MaterialIcons name={tab.icon} size={16} color={active ? colors.onPrimary : colors.primary} />
                <Text variant="labelSm" color={active ? colors.onPrimary : colors.onSurface}>
                  {t(tab.label)}
                </Text>
              </Pressable>
            );
          })}
        </Row>
      </View>

      {section === 'help' ? <HelpPanel /> : null}
      {section === 'contact' ? (
        <ContactPanel
          topic={topic}
          setTopic={setTopic}
          message={message}
          setMessage={setMessage}
          errors={errors}
          ticket={ticket}
          sending={sending}
          submitTicket={submitTicket}
        />
      ) : null}
      {section === 'terms' ? <LegalPanel mode="terms" /> : null}
      {section === 'privacy' ? <LegalPanel mode="privacy" /> : null}
      {section === 'data' ? (
        <DataPanel
          exportData={exportData}
          exportSummary={exportSummary}
          exporting={exporting}
          prepareExport={prepareExport}
        />
      ) : null}
    </Screen>
  );
}

function HelpPanel() {
  const { t } = useLocale();
  const items = [
    { icon: 'event-available', title: t('support:faqBookingTitle'), body: t('support:faqBookingBody') },
    { icon: 'payments', title: t('support:faqPaymentsTitle'), body: t('support:faqPaymentsBody') },
    { icon: 'local-shipping', title: t('support:faqDeliveryTitle'), body: t('support:faqDeliveryBody') },
    { icon: 'verified-user', title: t('support:faqSafetyTitle'), body: t('support:faqSafetyBody') },
  ];
  return (
    <Section title={t('support:helpIntro')}>
      <Stack gap={spacing.sm}>
        {items.map((item) => (
          <InfoCard key={item.title} icon={item.icon} title={item.title} body={item.body} />
        ))}
      </Stack>
    </Section>
  );
}

function ContactPanel({ topic, setTopic, message, setMessage, errors, ticket, sending, submitTicket }) {
  const { t } = useLocale();
  return (
    <Section title={t('support:contactIntro')}>
      <Card>
        <Stack gap={spacing.md}>
          {ticket ? (
            <Banner
              variant="success"
              title={t('support:ticketCreated')}
              body={t('support:ticketCreatedBody', { id: ticket.id.slice(0, 6).toUpperCase() })}
            />
          ) : null}
          <Input
            label={t('support:topic')}
            value={topic}
            onChangeText={setTopic}
            iconLeft="subject"
            error={errors.topic}
          />
          <Input
            label={t('support:message')}
            value={message}
            onChangeText={setMessage}
            multiline
            iconLeft="message"
            error={errors.message}
          />
          <Button
            label={t('support:sendMessage')}
            variant="secondary"
            iconRight="send"
            loading={sending}
            onPress={submitTicket}
          />
        </Stack>
      </Card>
    </Section>
  );
}

function LegalPanel({ mode }) {
  const { t } = useLocale();
  const terms = [
    { title: t('support:termsBookingTitle'), body: t('support:termsBookingBody') },
    { title: t('support:termsPaymentTitle'), body: t('support:termsPaymentBody') },
    { title: t('support:termsConductTitle'), body: t('support:termsConductBody') },
  ];
  const privacy = [
    { title: t('support:privacyDataTitle'), body: t('support:privacyDataBody') },
    { title: t('support:privacySecurityTitle'), body: t('support:privacySecurityBody') },
    { title: t('support:privacyRightsTitle'), body: t('support:privacyRightsBody') },
  ];
  const items = mode === 'terms' ? terms : privacy;
  return (
    <Section title={mode === 'terms' ? t('passenger:terms') : t('passenger:privacy')}>
      <Stack gap={spacing.sm}>
        {items.map((item) => (
          <Card key={item.title}>
            <Stack gap={spacing.xs}>
              <Text variant="labelMd">{item.title}</Text>
              <Text variant="bodySm">{item.body}</Text>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Section>
  );
}

function DataPanel({ exportData, exportSummary, exporting, prepareExport }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <Section title={t('support:dataIntro')}>
      <Card>
        <Stack gap={spacing.md}>
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('support:dataBody')}
          </Text>
          <Button
            label={exportData ? t('support:refreshExport') : t('support:prepareExport')}
            variant="secondary"
            iconRight="download"
            loading={exporting}
            onPress={prepareExport}
          />
          {exportData ? (
            <>
              <Banner
                variant="success"
                title={t('support:exportReady')}
                body={t('support:exportReadyBody', {
                  bookings: exportSummary.bookings,
                  deliveries: exportSummary.deliveries,
                  tickets: exportSummary.tickets,
                })}
              />
              <View
                style={{
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                }}
              >
                <Text variant="labelSm" selectable numberOfLines={8}>
                  {JSON.stringify(exportData, null, 2)}
                </Text>
              </View>
            </>
          ) : null}
        </Stack>
      </Card>
    </Section>
  );
}

function InfoCard({ icon, title, body }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Row gap={spacing.md} align="flex-start">
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primaryFixed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={icon} size={20} color={colors.primary} />
        </View>
        <Stack gap={4} style={{ flex: 1 }}>
          <Text variant="labelMd">{title}</Text>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>{body}</Text>
        </Stack>
      </Row>
    </Card>
  );
}
