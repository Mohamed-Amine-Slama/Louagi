import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Platform, UIManager, LayoutAnimation } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/Header';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Banner } from '../../components/Banner';
import { Chip } from '../../components/Chip';
import { Tabs } from '../../components/Tabs';
import { Section, Row, Stack } from '../../components/Section';
import { FadeSlideIn } from '../../components/motion';

import { usersApi } from '../../api';
import { LEGAL_CONTENT } from '../public/LegalContent';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/Toast';
import { radius, spacing } from '../../theme';

// Android needs LayoutAnimation explicitly enabled for the FAQ collapse.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const ease = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

const TABS = [
  { key: 'help', label: 'support:tabHelp', intro: 'support:helpIntro' },
  { key: 'contact', label: 'support:tabContact', intro: 'support:contactIntro' },
  { key: 'legal', label: 'support:tabLegal', intro: 'support:legalIntro' },
  { key: 'data', label: 'support:tabData', intro: 'support:dataIntro' },
];

const LEGAL_DOCS = [
  { key: 'terms', icon: 'description', label: 'passenger:terms' },
  { key: 'privacy', icon: 'privacy-tip', label: 'passenger:privacy' },
  { key: 'refund', icon: 'request-quote', label: 'passenger:refund' },
];

// Profile screens deep-link with section ∈ help|contact|terms|privacy|refund|data.
// Legal documents live under one tab, so the three doc sections map onto it.
const SECTION_TO_TAB = {
  help: 'help',
  contact: 'contact',
  terms: 'legal',
  privacy: 'legal',
  refund: 'legal',
  data: 'data',
};
const isLegalSection = (s) => s === 'terms' || s === 'privacy' || s === 'refund';

export default function SupportScreen() {
  const { t } = useLocale();
  const { user } = useAuth();
  const route = useRoute();
  const toast = useToast();

  const initialSection = route.params?.section || 'help';
  const [tab, setTab] = useState(SECTION_TO_TAB[initialSection] || 'help');
  const [doc, setDoc] = useState(isLegalSection(initialSection) ? initialSection : 'terms');
  const [topic, setTopic] = useState(t('support:defaultTopic'));
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [ticket, setTicket] = useState(null);
  const [sending, setSending] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const section = route.params?.section || 'help';
    setTab(SECTION_TO_TAB[section] || 'help');
    if (isLegalSection(section)) setDoc(section);
  }, [route.params?.section]);

  const activeMeta = TABS.find((item) => item.key === tab) || TABS[0];
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
    toast.show(t('toast:supportTicketCreated', { id: res.ticket?.id?.slice(0, 6)?.toUpperCase() || '—' }), 'success');
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
        title={t('passenger:helpCentre')}
        subtitle={t(activeMeta.intro)}
        showBack
      />

      <FadeSlideIn index={0}>
        <Tabs
          tabs={TABS.map((item) => ({ key: item.key, label: t(item.label) }))}
          value={tab}
          onChange={setTab}
        />
      </FadeSlideIn>

      {tab === 'help' ? <HelpPanel onContact={() => setTab('contact')} /> : null}
      {tab === 'contact' ? (
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
      {tab === 'legal' ? <LegalPanel doc={doc} setDoc={setDoc} /> : null}
      {tab === 'data' ? (
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

function HelpPanel({ onContact }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);

  const items = [
    { key: 'booking', icon: 'event-available', title: t('support:faqBookingTitle'), body: t('support:faqBookingBody') },
    { key: 'payments', icon: 'payments', title: t('support:faqPaymentsTitle'), body: t('support:faqPaymentsBody') },
    { key: 'delivery', icon: 'local-shipping', title: t('support:faqDeliveryTitle'), body: t('support:faqDeliveryBody') },
    { key: 'safety', icon: 'verified-user', title: t('support:faqSafetyTitle'), body: t('support:faqSafetyBody') },
  ];
  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(q))
    : items;

  const toggle = (key) => {
    ease();
    setOpenKey((current) => (current === key ? null : key));
  };

  return (
    <FadeSlideIn index={1}>
      <Stack gap={spacing.md}>
        <Input
          placeholder={t('support:searchFaq')}
          value={query}
          onChangeText={setQuery}
          iconLeft="search"
        />

        <Card>
          {visible.length === 0 ? (
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {t('support:noResults')}
            </Text>
          ) : (
            visible.map((item, i) => (
              <View key={item.key}>
                {i > 0 ? (
                  <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.sm }} />
                ) : null}
                <FaqRow
                  item={item}
                  open={openKey === item.key}
                  onPress={() => toggle(item.key)}
                />
              </View>
            ))
          )}
        </Card>

        <Card>
          <Stack gap={spacing.sm}>
            <Text variant="labelMd">{t('support:stillNeedHelp')}</Text>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {t('support:stillNeedHelpBody')}
            </Text>
            <Button
              label={t('passenger:contactSupport')}
              variant="secondary"
              iconRight="chat"
              onPress={onContact}
            />
          </Stack>
        </Card>
      </Stack>
    </FadeSlideIn>
  );
}

function FaqRow({ item, open, onPress }) {
  const { colors } = useTheme();
  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.full,
            backgroundColor: colors.primaryFixed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={item.icon} size={20} color={colors.onPrimaryFixed} />
        </View>
        <Text variant="labelMd" style={{ flex: 1 }}>
          {item.title}
        </Text>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={22}
          color={colors.onSurfaceVariant}
        />
      </Pressable>
      {open ? (
        <Text
          variant="bodySm"
          color={colors.onSurfaceVariant}
          style={{ marginTop: spacing.xs, marginStart: 40 + spacing.md }}
        >
          {item.body}
        </Text>
      ) : null}
    </View>
  );
}

function ContactPanel({ topic, setTopic, message, setMessage, errors, ticket, sending, submitTicket }) {
  const { t } = useLocale();
  return (
    <FadeSlideIn index={1}>
      <Card>
        <Stack gap={spacing.md}>
          {ticket ? (
            <Banner
              variant="success"
              title={t('support:ticketCreated')}
              body={t('support:ticketCreatedBody', { id: ticket?.id?.slice(0, 6)?.toUpperCase() || '—' })}
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
    </FadeSlideIn>
  );
}

// Renders a legal document (Terms / Privacy / Refund) from the shared
// LEGAL_CONTENT source, localised to the active language with an English
// fallback. `doc` maps to a LEGAL_CONTENT key — 'refund' → 'refunds'.
function LegalPanel({ doc, setDoc }) {
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const key = doc === 'refund' ? 'refunds' : doc;
  const content = LEGAL_CONTENT[locale]?.[key] ?? LEGAL_CONTENT.en[key];
  return (
    <FadeSlideIn index={1}>
      <Stack gap={spacing.md}>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {LEGAL_DOCS.map((item) => (
            <Chip
              key={item.key}
              icon={item.icon}
              label={t(item.label)}
              selected={doc === item.key}
              onPress={() => setDoc(item.key)}
            />
          ))}
        </Row>

        <Section title={content.title}>
          <Card>
            {content.sections.map((item, i) => (
              <View key={item.heading}>
                {i > 0 ? (
                  <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.md }} />
                ) : null}
                <Stack gap={spacing.xs}>
                  <Text variant="labelMd">{item.heading}</Text>
                  <Text variant="bodySm" color={colors.onSurfaceVariant}>
                    {item.text}
                  </Text>
                </Stack>
              </View>
            ))}
          </Card>
        </Section>
      </Stack>
    </FadeSlideIn>
  );
}

function DataPanel({ exportData, exportSummary, exporting, prepareExport }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [showRaw, setShowRaw] = useState(false);

  const toggleRaw = () => {
    ease();
    setShowRaw((current) => !current);
  };

  return (
    <FadeSlideIn index={1}>
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
              <Banner variant="success" title={t('support:exportReady')} />
              <Stack gap={spacing.sm}>
                <StatRow icon="event-available" label={t('support:statBookings')} value={exportSummary.bookings} />
                <StatRow icon="local-shipping" label={t('support:statDeliveries')} value={exportSummary.deliveries} />
                <StatRow icon="support-agent" label={t('support:statTickets')} value={exportSummary.tickets} />
              </Stack>

              <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />

              <Pressable
                onPress={toggleRaw}
                accessibilityRole="button"
                accessibilityState={{ expanded: showRaw }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <MaterialIcons name="code" size={18} color={colors.onSurfaceVariant} />
                <Text variant="labelMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
                  {t('support:viewRaw')}
                </Text>
                <MaterialIcons
                  name={showRaw ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
              {showRaw ? (
                <View
                  style={{
                    backgroundColor: colors.surfaceContainer,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                  }}
                >
                  <Text variant="labelSm" selectable numberOfLines={12}>
                    {JSON.stringify(exportData, null, 2)}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </Stack>
      </Card>
    </FadeSlideIn>
  );
}

function StatRow({ icon, label, value }) {
  const { colors } = useTheme();
  return (
    <Row justify="space-between" style={{ alignItems: 'center' }}>
      <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
        <MaterialIcons name={icon} size={18} color={colors.onSurfaceVariant} />
        <Text variant="bodyMd" color={colors.onSurfaceVariant}>
          {label}
        </Text>
      </Row>
      <Text variant="labelMd">{value}</Text>
    </Row>
  );
}
