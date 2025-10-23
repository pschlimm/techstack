import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type FitViewOptions,
  useReactFlow,
} from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import 'reactflow/dist/style.css';

type LayoutMode = 'cube' | 'lanes';

type RoleKey =
  | 'SHOP'
  | 'CHANNEL'
  | 'OMS'
  | 'PIM'
  | 'ERP'
  | 'WMS'
  | 'LOGISTICS'
  | 'FULFILLMENT'
  | 'CRM'
  | 'QA_REVIEWS'
  | 'CDP'
  | 'ANALYTICS'
  | 'ADS'
  | 'REPRICING'
  | 'SUPPORT'
  | 'RETURNS'
  | 'CUSTOMER';

type ScenarioKey =
  | 'OrderCreated'
  | 'Returns'
  | 'ConsentEvents'
  | 'Feeds'
  | 'Tracking'
  | 'TrustedShops'
  | 'GA4_GTM_Ads'
  | 'SelfService';

const ROLE_COLORS: Record<RoleKey, { bg: string; border: string; text: string; ring: string }> = {
  SHOP: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', ring: 'ring-emerald-200' },
  CHANNEL: { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-900', ring: 'ring-teal-200' },
  OMS: { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-900', ring: 'ring-sky-200' },
  PIM: { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-900', ring: 'ring-cyan-200' },
  ERP: { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-900', ring: 'ring-violet-200' },
  WMS: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-900', ring: 'ring-purple-200' },
  LOGISTICS: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', ring: 'ring-amber-200' },
  FULFILLMENT: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', ring: 'ring-orange-200' },
  CRM: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', ring: 'ring-blue-200' },
  QA_REVIEWS: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900', ring: 'ring-yellow-200' },
  CDP: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-900', ring: 'ring-rose-200' },
  ANALYTICS: { bg: 'bg-slate-50', border: 'border-slate-400', text: 'text-slate-900', ring: 'ring-slate-200' },
  ADS: { bg: 'bg-zinc-50', border: 'border-zinc-400', text: 'text-zinc-900', ring: 'ring-zinc-200' },
  REPRICING: { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', ring: 'ring-lime-200' },
  SUPPORT: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-400', text: 'text-fuchsia-900', ring: 'ring-fuchsia-200' },
  RETURNS: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-900', ring: 'ring-red-200' },
  CUSTOMER: { bg: 'bg-white', border: 'border-gray-300', text: 'text-gray-900', ring: 'ring-gray-200' },
};

const THEME_LS_KEY = 'atera_theme_hex';
const DEFAULT_THEME = {
  primary: '#00B388',
  primaryDark: '#009E78',
  focus: '#BFF0E3',
};

const isBrowser = typeof window !== 'undefined';

type Theme = { primary: string; primaryDark: string; focus: string };

function readTheme(): Theme {
  if (!isBrowser) {
    return DEFAULT_THEME;
  }

  try {
    return JSON.parse(window.localStorage.getItem(THEME_LS_KEY) || '') || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyThemeToCSSVars(theme: Theme) {
  if (!isBrowser) {
    return;
  }

  const root = window.document.documentElement;
  root.style.setProperty('--atera-primary', theme.primary);
  root.style.setProperty('--atera-primary-dark', theme.primaryDark);
  root.style.setProperty('--atera-focus', theme.focus);
}

if (isBrowser) {
  applyThemeToCSSVars(readTheme());
}

const NODES = {
  SHOPIFY: 'shopify',
  MARKETPLACE_TAB: 'marketplace-tab',
  CHANNELENGINE: 'channelengine',
  OMS: 'hublify-oms',
  PIM: 'hublify-pim',
  SAP: 'sap-s4',
  SAP_WMS: 'sap-wms',
  DACHSER: 'dachser-edi',
  SENDCLOUD: 'sendcloud',
  HUBSPOT: 'hubspot',
  TRUSTED_SHOPS: 'trusted-shops',
  CDP: 'cdp',
  GA4: 'ga4',
  GTM: 'gtm',
  AD_PIXELS: 'ad-pixels',
  REPRICING: 'repricing',
  KB: 'knowledge-base',
  HELP: 'self-helpdesk',
  CHATBOT: 'chatbot',
  RETURNS: 'returns-portal',
  CUSTOMER_B2C: 'endkunde-b2c',
  CUSTOMER_B2B: 'b2b-kunde',
} as const;

type NodeId = (typeof NODES)[keyof typeof NODES];

const NODE_META: Record<NodeId, { label: string; role: RoleKey; desc: string }> = {
  [NODES.SHOPIFY]: {
    label: 'Shopify Plus (B2B & B2C)',
    role: 'SHOP',
    desc: 'Shop-Frontend & Checkout. Empfang von Traffic, Bestellungen, Events und Feeds.',
  },
  [NODES.MARKETPLACE_TAB]: {
    label: 'Marktplatz (Shop-Tab)',
    role: 'CHANNEL',
    desc: 'Interner Shop-Reiter für Marktplatz-Experience; leitet Bestellungen an ChannelEngine.',
  },
  [NODES.CHANNELENGINE]: {
    label: 'ChannelEngine',
    role: 'CHANNEL',
    desc: 'Marktplatz-Anbindung für Product- & Price-Feeds, Order-Routing und Backfeed.',
  },
  [NODES.OMS]: {
    label: 'Hublify OMS',
    role: 'OMS',
    desc: 'Order Management, Orchestrierung von Aufträgen und Returns, Status-Backfeed.',
  },
  [NODES.PIM]: {
    label: 'Hublify PIM',
    role: 'PIM',
    desc: 'Produktdatenhaltung, Content-Distribution an Shopify & ChannelEngine.',
  },
  [NODES.SAP]: {
    label: 'SAP S/4 HANA',
    role: 'ERP',
    desc: 'ERP: Aufträge, Buchungen, Debitoren/Kreditoren, Pricing, Bestände.',
  },
  [NODES.SAP_WMS]: {
    label: 'SAP WMS',
    role: 'WMS',
    desc: 'Lagerverwaltung, Kommissionierung, Wareneingang/-ausgang, Inventur.',
  },
  [NODES.DACHSER]: {
    label: 'Dachser (EDI)',
    role: 'LOGISTICS',
    desc: '3PL/Spedition via EDI: Versand, Tracking, Statusmeldungen.',
  },
  [NODES.SENDCLOUD]: {
    label: 'Sendcloud',
    role: 'FULFILLMENT',
    desc: 'Labeling, Carrier, Versand-Tracking & -Events, Kundenbenachrichtigung.',
  },
  [NODES.HUBSPOT]: {
    label: 'HubSpot CRM/ESP',
    role: 'CRM',
    desc: 'CRM & Marketing: Kontakte, E-Mails, Automationen, Deals.',
  },
  [NODES.TRUSTED_SHOPS]: {
    label: 'Trusted Shops',
    role: 'QA_REVIEWS',
    desc: 'Trust-Badges, Bewertungen, Review-Requests & Analytics.',
  },
  [NODES.CDP]: {
    label: 'CDP / Event Hub',
    role: 'CDP',
    desc: 'Zentrale Ereignisverarbeitung, Consent, Identity, Segmentierung.',
  },
  [NODES.GA4]: {
    label: 'Google Analytics 4',
    role: 'ANALYTICS',
    desc: 'Messung, Reporting, Funnels & Attribution.',
  },
  [NODES.GTM]: {
    label: 'Google Tag Manager',
    role: 'ADS',
    desc: 'Tag-Verwaltung: GA4, Ads, Pixel, Konversions-Events.',
  },
  [NODES.AD_PIXELS]: {
    label: 'Ad Pixels',
    role: 'ADS',
    desc: 'Meta/Ads/Remarketing-Pixel, Konversionssignale.',
  },
  [NODES.REPRICING]: {
    label: 'Repricing Engine',
    role: 'REPRICING',
    desc: 'Preisoptimierung/Regeln, Export zu Shop & Marktplätzen.',
  },
  [NODES.KB]: {
    label: 'Wissensdatenbank',
    role: 'SUPPORT',
    desc: 'How-Tos, Runbooks, interne/externe Doku.',
  },
  [NODES.HELP]: {
    label: 'Self Helpdesk',
    role: 'SUPPORT',
    desc: 'Self-Service Tickets/FAQs, Rückfragen, Status.',
  },
  [NODES.CHATBOT]: {
    label: 'Chatbot',
    role: 'SUPPORT',
    desc: 'Conversational Support & Commerce, Intent/Routing.',
  },
  [NODES.RETURNS]: {
    label: 'Returns Portal',
    role: 'RETURNS',
    desc: 'Rücksendungen anlegen, Labels, Status & Erstattungen.',
  },
  [NODES.CUSTOMER_B2C]: {
    label: 'Endkunde (B2C)',
    role: 'CUSTOMER',
    desc: 'B2C Käufer: Browsing, Warenkorb, Checkout, Service.',
  },
  [NODES.CUSTOMER_B2B]: {
    label: 'B2B-Kunde',
    role: 'CUSTOMER',
    desc: 'B2B Käufer: Contract Pricing, PO-Flow, Reorders.',
  },
};

const CUBE_POS: Record<NodeId, { x: number; y: number }> = {
  [NODES.CUSTOMER_B2C]: { x: 40, y: 80 },
  [NODES.CUSTOMER_B2B]: { x: 40, y: 200 },
  [NODES.SHOPIFY]: { x: 300, y: 80 },
  [NODES.MARKETPLACE_TAB]: { x: 300, y: 160 },
  [NODES.CHANNELENGINE]: { x: 300, y: 260 },
  [NODES.PIM]: { x: 560, y: 40 },
  [NODES.REPRICING]: { x: 560, y: 140 },
  [NODES.OMS]: { x: 560, y: 240 },
  [NODES.SAP]: { x: 820, y: 200 },
  [NODES.SAP_WMS]: { x: 1080, y: 220 },
  [NODES.DACHSER]: { x: 1340, y: 220 },
  [NODES.SENDCLOUD]: { x: 1600, y: 220 },
  [NODES.HUBSPOT]: { x: 820, y: 40 },
  [NODES.TRUSTED_SHOPS]: { x: 1080, y: 40 },
  [NODES.CDP]: { x: 820, y: 360 },
  [NODES.GTM]: { x: 1080, y: 360 },
  [NODES.GA4]: { x: 1340, y: 360 },
  [NODES.AD_PIXELS]: { x: 1600, y: 360 },
  [NODES.KB]: { x: 300, y: 360 },
  [NODES.HELP]: { x: 560, y: 360 },
  [NODES.CHATBOT]: { x: 300, y: 480 },
  [NODES.RETURNS]: { x: 560, y: 480 },
};

const LANES_POS: Record<NodeId, { x: number; y: number }> = {
  [NODES.CUSTOMER_B2C]: { x: 80, y: 40 },
  [NODES.CUSTOMER_B2B]: { x: 240, y: 40 },
  [NODES.SHOPIFY]: { x: 80, y: 160 },
  [NODES.MARKETPLACE_TAB]: { x: 240, y: 160 },
  [NODES.CHANNELENGINE]: { x: 400, y: 160 },
  [NODES.OMS]: { x: 80, y: 280 },
  [NODES.PIM]: { x: 240, y: 280 },
  [NODES.SAP]: { x: 80, y: 400 },
  [NODES.SAP_WMS]: { x: 240, y: 400 },
  [NODES.DACHSER]: { x: 80, y: 520 },
  [NODES.SENDCLOUD]: { x: 240, y: 520 },
  [NODES.GTM]: { x: 80, y: 640 },
  [NODES.GA4]: { x: 240, y: 640 },
  [NODES.AD_PIXELS]: { x: 400, y: 640 },
  [NODES.HUBSPOT]: { x: 80, y: 760 },
  [NODES.KB]: { x: 240, y: 760 },
  [NODES.HELP]: { x: 400, y: 760 },
  [NODES.CHATBOT]: { x: 560, y: 760 },
  [NODES.CDP]: { x: 80, y: 880 },
  [NODES.TRUSTED_SHOPS]: { x: 80, y: 1000 },
  [NODES.REPRICING]: { x: 240, y: 1000 },
  [NODES.RETURNS]: { x: 400, y: 1000 },
};

const PAYLOADS: Record<string, unknown> = {
  'edge-b2c-chatbot': { source: 'B2C Customer', tool: 'Chatbot', location: 'Shopify' },
  'edge-shopify-chatbot': { embed: true, channel: 'Shopify Storefront' },
  'edge-chatbot-kb': { action: 'search', query: 'refund policy' },
  'edge-kb-pim': { source: 'PIM', fields: ['title', 'attributes', 'faq'] },
  'edge-help-kb': { context: 'Self Helpdesk', linkType: 'KB Article' },
  'edge-returns-kb': { context: 'Returns Portal', linkType: 'KB Article' },
  'edge-kb-cdp': { event: 'KBViewed', tags: ['support', 'content'] },
  'edge-returns-cdp': { event: 'ReturnCreated', fields: ['rma', 'reason'] },
  'edge-chatbot-hubspot': { action: 'Create Ticket', priority: 'Normal' },
  'edge-b2b-shop': {
    channel: 'B2B',
    to: 'Shopify',
    payload: { poNumber: 'PO-90231', terms: 'Net30' },
  },
  'edge-b2c-shop': {
    channel: 'B2C',
    to: 'Shopify',
    payload: { cartItems: 4, coupon: 'Q4SAVE' },
  },
  'edge-b2c-marketplace': { channel: 'B2C', to: 'Marketplace Tab', marketplace: true },
  'edge-marketplace-channelengine': {
    route: 'Shop Tab → ChannelEngine',
    payload: { marketplaces: ['Amazon', 'eBay'] },
  },
  'edge-channelengine-oms': { step: 'ChannelEngine→OMS', payload: { importedOrders: 12 } },
  'edge-order-shopify-oms': {
    event: 'OrderCreated',
    source: 'Shopify',
    target: 'OMS',
    payload: { orderId: 'SO-100234', items: 3, totalGross: 129.9, currency: 'EUR' },
  },
  'edge-order-oms-sap': {
    step: 'OMS→SAP',
    messageType: 'ORDERS',
    payload: { orderId: 'SO-100234', status: 'Released' },
  },
  'edge-order-sap-dachser': {
    step: 'SAP→Dachser(EDI)',
    edi: 'DESADV',
    payload: { shipmentId: 'SH-77823', packages: 2 },
  },
  'edge-order-dachser-sendcloud': {
    step: 'Dachser→Sendcloud',
    payload: { trackingNo: 'JD0123456789', carrier: 'DHL' },
  },
  'edge-order-backfeed-oms': {
    step: 'Sendcloud→OMS',
    payload: { status: 'Shipped', trackingNo: 'JD0123456789' },
  },
  'edge-order-backfeed-channels': {
    step: 'OMS→Shopify',
    payload: { orderId: 'SO-100234', status: 'Shipped' },
  },
  'edge-order-backfeed-channels2': {
    step: 'OMS→ChannelEngine',
    payload: { orderId: 'SO-100234', status: 'Shipped' },
  },
  'edge-returns-portal-oms': {
    event: 'ReturnRequested',
    payload: { rma: 'RMA-55671', reason: 'Size' },
  },
  'edge-returns-oms-sap': {
    step: 'OMS→SAP',
    payload: { rma: 'RMA-55671', disposition: 'Inspect' },
  },
  'edge-returns-sap-hubspot': {
    step: 'SAP→HubSpot',
    payload: { rma: 'RMA-55671', refund: 49.95 },
  },
  'edge-returns-oms-sendcloud': {
    step: 'OMS→Sendcloud',
    payload: { label: true, dropOff: 'DHL Shop' },
  },
  'edge-consent-shopify-cdp': {
    event: 'ConsentUpdate',
    payload: { userId: 'u_3499', marketing: true },
  },
  'edge-consent-hubspot-cdp': {
    event: 'EmailEngagement',
    payload: { campaign: 'Q4-Launch', clicked: true },
  },
  'edge-feed-pim-channel': { feed: 'ProductFeed', items: 12000, delta: 140 },
  'edge-feed-repricing-channel': {
    feed: 'PriceFeed',
    rules: 5,
    marketplace: 'Amazon',
  },
  'edge-feed-pim-shopify': { feed: 'ProductSync', items: 12000, updated: 320 },
  'edge-tracking-sendcloud-channels': {
    event: 'TrackingUpdate',
    status: 'Delivered',
    marketplaces: ['Amazon', 'eBay'],
  },
  'edge-trusted-shops-shopify': {
    event: 'Badge/Review',
    payload: { orderId: 'SO-100234', stars: 5 },
  },
  'edge-trusted-shops-hubspot': { sync: 'Reviews', count: 12, avg: 4.7 },
  'edge-trusted-shops-ga4': { analytics: 'ReviewImpressions', sessions: 1321 },
  'edge-trusted-shops-cdp': { event: 'ReviewEvent', audience: 'Promoters' },
  'edge-gtm-ga4': { config: 'GA4 via GTM', streams: ['Web'] },
  'edge-ads-shopify': {
    pixels: ['Meta', 'Google Ads', 'TikTok'],
    conversion: 'Purchase',
  },
  'edge-analytics-cdp': {
    event: 'Analytics→CDP Export',
    fields: ['sessionId', 'source', 'utm'],
  },
  'edge-helpdesk-hubspot': { event: 'TicketCreated', priority: 'Medium' },
  'edge-chatbot-cdp': { event: 'IntentCaptured', intent: 'ReturnQuestion' },
  'edge-kb-shopify': { event: 'ArticleLink', topic: 'Size guide' },
};

const LS_KEY = {
  POSITIONS: (mode: LayoutMode) => `techstackflow_positions_${mode}`,
};

const Badge: React.FC<{ role: RoleKey; children: React.ReactNode }> = ({ role, children }) => {
  const c = ROLE_COLORS[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${c.bg} ${c.border} ${c.text}`}
    >
      {children}
    </span>
  );
};

const SectionTitle: React.FC<{ label: string; sub?: string }> = ({ label, sub }) => (
  <div className="mb-2">
    <div className="text-sm font-semibold tracking-wide text-gray-900">{label}</div>
    {sub && <div className="text-xs text-gray-500">{sub}</div>}
  </div>
);

const Accordion: React.FC<{ items: { title: string; content: React.ReactNode }[] }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
      {items.map((it, idx) => (
        <div key={idx}>
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">{it.title}</span>
            <motion.span className="text-gray-500" animate={{ rotate: open === idx ? 90 : 0 }}>
              ▶
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-3 pb-3 text-sm text-gray-700"
              >
                {it.content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

const ThemeEditor: React.FC = () => {
  const [vals, setVals] = useState<Theme>(() => readTheme());
  const rf = useReactFlow();

  const onChange = (k: keyof Theme, v: string) => setVals((s) => ({ ...s, [k]: v }));
  const onSave = () => {
    if (!isBrowser) return;
    window.localStorage.setItem(THEME_LS_KEY, JSON.stringify(vals));
    applyThemeToCSSVars(vals);
    rf.fitView({ padding: 0.2 });
  };
  const onReset = () => {
    if (!isBrowser) return;
    window.localStorage.removeItem(THEME_LS_KEY);
    applyThemeToCSSVars(DEFAULT_THEME);
    setVals(DEFAULT_THEME);
    rf.fitView({ padding: 0.2 });
  };
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-gray-600">Primary</span>
        <input
          value={vals.primary}
          onChange={(e) => onChange('primary', e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1"
          placeholder="#00xxxx"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-600">Primary Dark</span>
        <input
          value={vals.primaryDark}
          onChange={(e) => onChange('primaryDark', e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1"
          placeholder="#00xxxx"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-gray-600">Focus Ring</span>
        <input
          value={vals.focus}
          onChange={(e) => onChange('focus', e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1"
          placeholder="#BFF0E3"
        />
      </label>
      <div className="col-span-3 flex gap-2 pt-2">
        <button
          onClick={onSave}
          className="rounded-lg border px-2.5 py-1.5 shadow-sm text-xs"
          style={{ borderColor: 'var(--atera-primary)', color: 'var(--atera-primary)' }}
        >
          Übernehmen
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 shadow-sm text-xs hover:bg-gray-50"
        >
          Zurücksetzen
        </button>
      </div>
    </div>
  );
};

function makeNode(id: NodeId, pos: { x: number; y: number }, role: RoleKey): Node {
  const meta = NODE_META[id];
  const c = ROLE_COLORS[role];
  return {
    id,
    type: 'default',
    position: pos,
    data: {
      label: (
        <div
          className={`group rounded-2xl border ${c.border} ${c.bg} ${c.text} shadow-sm ring-1 ${c.ring} px-3 py-2 max-w-[260px] transition-all`}
          title={meta.desc}
        >
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold leading-tight">{meta.label}</div>
          </div>
          <div className="mt-1 text-[11px] opacity-80">
            <Badge role={meta.role}>{meta.role}</Badge>
          </div>
        </div>
      ),
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    style: { borderRadius: 18 },
  };
}

function e(id: string, source: NodeId, target: NodeId, label?: string): Edge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#94a3b8' },
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    label,
    labelStyle: { fill: '#334155', fontWeight: 600, fontSize: 10 },
  };
}

const ALL_EDGES: Edge[] = [
  e('edge-b2c-chatbot', NODES.CUSTOMER_B2C, NODES.CHATBOT, 'Chat on Shopify'),
  e('edge-shopify-chatbot', NODES.SHOPIFY, NODES.CHATBOT, 'Embedded Chat'),
  e('edge-chatbot-kb', NODES.CHATBOT, NODES.KB, 'Knowledge Lookup'),
  e('edge-kb-pim', NODES.KB, NODES.PIM, 'Content Source'),
  e('edge-help-kb', NODES.HELP, NODES.KB, 'Help Articles'),
  e('edge-returns-kb', NODES.RETURNS, NODES.KB, 'Return Articles'),
  e('edge-kb-cdp', NODES.KB, NODES.CDP, 'Content Events'),
  e('edge-returns-cdp', NODES.RETURNS, NODES.CDP, 'Return Events'),
  e('edge-chatbot-hubspot', NODES.CHATBOT, NODES.HUBSPOT, 'Create Ticket'),
  e('edge-b2b-shop', NODES.CUSTOMER_B2B, NODES.SHOPIFY, 'B2B Order'),
  e('edge-b2c-shop', NODES.CUSTOMER_B2C, NODES.SHOPIFY, 'B2C Order'),
  e('edge-b2c-marketplace', NODES.CUSTOMER_B2C, NODES.MARKETPLACE_TAB, 'B2C Marketplace'),
  e('edge-marketplace-channelengine', NODES.MARKETPLACE_TAB, NODES.CHANNELENGINE, 'Orders'),
  e('edge-channelengine-oms', NODES.CHANNELENGINE, NODES.OMS, 'OrderImport'),
  e('edge-order-shopify-oms', NODES.SHOPIFY, NODES.OMS, 'OrderCreated'),
  e('edge-order-oms-sap', NODES.OMS, NODES.SAP, 'Order→ERP'),
  e('edge-order-sap-dachser', NODES.SAP, NODES.DACHSER, 'Shipment'),
  e('edge-order-dachser-sendcloud', NODES.DACHSER, NODES.SENDCLOUD, 'Tracking'),
  e('edge-order-backfeed-oms', NODES.SENDCLOUD, NODES.OMS, 'Backfeed'),
  e('edge-order-backfeed-channels', NODES.OMS, NODES.SHOPIFY, 'Status→Shop'),
  e('edge-order-backfeed-channels2', NODES.OMS, NODES.CHANNELENGINE, 'Status→Channels'),
  e('edge-returns-portal-oms', NODES.RETURNS, NODES.OMS, 'ReturnRequest'),
  e('edge-returns-oms-sap', NODES.OMS, NODES.SAP, 'RMA'),
  e('edge-returns-sap-hubspot', NODES.SAP, NODES.HUBSPOT, 'Notify'),
  e('edge-returns-oms-sendcloud', NODES.OMS, NODES.SENDCLOUD, 'Label'),
  e('edge-consent-shopify-cdp', NODES.SHOPIFY, NODES.CDP, 'Consent'),
  e('edge-consent-hubspot-cdp', NODES.HUBSPOT, NODES.CDP, 'Engagement'),
  e('edge-feed-pim-channel', NODES.PIM, NODES.CHANNELENGINE, 'ProductFeed'),
  e('edge-feed-repricing-channel', NODES.REPRICING, NODES.CHANNELENGINE, 'PriceFeed'),
  e('edge-feed-pim-shopify', NODES.PIM, NODES.SHOPIFY, 'ProductSync'),
  e('edge-tracking-sendcloud-channels', NODES.SENDCLOUD, NODES.CHANNELENGINE, 'Tracking→MP'),
  e('edge-trusted-shops-shopify', NODES.TRUSTED_SHOPS, NODES.SHOPIFY, 'Trust/Badge'),
  e('edge-trusted-shops-hubspot', NODES.TRUSTED_SHOPS, NODES.HUBSPOT, 'Reviews→CRM'),
  e('edge-trusted-shops-ga4', NODES.TRUSTED_SHOPS, NODES.GA4, 'Reviews→Analytics'),
  e('edge-trusted-shops-cdp', NODES.TRUSTED_SHOPS, NODES.CDP, 'Review Events'),
  e('edge-gtm-ga4', NODES.GTM, NODES.GA4, 'GTM→GA4'),
  e('edge-ads-shopify', NODES.AD_PIXELS, NODES.SHOPIFY, 'Pixels'),
  e('edge-analytics-cdp', NODES.GA4, NODES.CDP, 'Analytics Export'),
  e('edge-helpdesk-hubspot', NODES.HELP, NODES.HUBSPOT, 'Ticket'),
  e('edge-chatbot-cdp', NODES.CHATBOT, NODES.CDP, 'Intents'),
  e('edge-kb-shopify', NODES.KB, NODES.SHOPIFY, 'Links'),
];

const SCENARIO_DEFS: Record<ScenarioKey, { title: string; includeEdgeIds: string[] }> = {
  OrderCreated: {
    title:
      'OrderCreated (Shopify) & Channel Orders (ChannelEngine) → OMS → SAP → Dachser → Sendcloud → Backfeed',
    includeEdgeIds: [
      'edge-b2b-shop',
      'edge-b2c-shop',
      'edge-b2c-marketplace',
      'edge-marketplace-channelengine',
      'edge-channelengine-oms',
      'edge-order-shopify-oms',
      'edge-order-oms-sap',
      'edge-order-sap-dachser',
      'edge-order-dachser-sendcloud',
      'edge-order-backfeed-oms',
      'edge-order-backfeed-channels',
      'edge-order-backfeed-channels2',
    ],
  },
  Returns: {
    title: 'Returns → OMS → SAP → HubSpot / Sendcloud',
    includeEdgeIds: [
      'edge-returns-portal-oms',
      'edge-returns-oms-sap',
      'edge-returns-sap-hubspot',
      'edge-returns-oms-sendcloud',
    ],
  },
  ConsentEvents: {
    title: 'Consent / CustomerEvents → CDP',
    includeEdgeIds: ['edge-consent-shopify-cdp', 'edge-consent-hubspot-cdp'],
  },
  Feeds: {
    title: 'ProductFeed / PriceFeed → ChannelEngine / Shopify',
    includeEdgeIds: ['edge-feed-pim-channel', 'edge-feed-repricing-channel', 'edge-feed-pim-shopify'],
  },
  Tracking: {
    title: 'Tracking → Sendcloud / Marktplätze',
    includeEdgeIds: ['edge-tracking-sendcloud-channels'],
  },
  TrustedShops: {
    title: 'Trusted Shops → Shopify, HubSpot, Analytics, CDP',
    includeEdgeIds: [
      'edge-trusted-shops-shopify',
      'edge-trusted-shops-hubspot',
      'edge-trusted-shops-ga4',
      'edge-trusted-shops-cdp',
    ],
  },
  GA4_GTM_Ads: {
    title: 'GA4 / GTM / Ad Pixels → Shopify / CDP',
    includeEdgeIds: ['edge-gtm-ga4', 'edge-ads-shopify', 'edge-analytics-cdp'],
  },
  SelfService: {
    title: 'Self Helpdesk, Chatbot, Knowledge Base → CRM, CDP, Shopify',
    includeEdgeIds: [
      'edge-helpdesk-hubspot',
      'edge-chatbot-cdp',
      'edge-kb-shopify',
      'edge-b2c-chatbot',
      'edge-shopify-chatbot',
      'edge-chatbot-kb',
      'edge-kb-pim',
      'edge-help-kb',
      'edge-returns-kb',
      'edge-kb-cdp',
      'edge-returns-cdp',
      'edge-chatbot-hubspot',
    ],
  },
};

const fitViewOptions: FitViewOptions = { padding: 0.2, minZoom: 0.2, maxZoom: 1.6 };

const TechStackFlowInner: React.FC = () => {
  const [layout, setLayout] = useState<LayoutMode>('cube');
  const [scenario, setScenario] = useState<ScenarioKey | 'ALL'>('ALL');
  const [hover, setHover] = useState<{ show: boolean; x: number; y: number; text: string }>(
    () => ({ show: false, x: 0, y: 0, text: '' })
  );
  const [selectedPayload, setSelectedPayload] = useState<{ id: string; json: string } | null>(null);
  const [playing, setPlaying] = useState<boolean>(true);

  const rf = useReactFlow();

  const makeNodesForLayout = useCallback(
    (mode: LayoutMode): Node[] => {
      const base = mode === 'cube' ? CUBE_POS : LANES_POS;
      const savedRaw = isBrowser ? window.localStorage.getItem(LS_KEY.POSITIONS(mode)) : null;
      const saved: Record<NodeId, { x: number; y: number }> | null = savedRaw ? JSON.parse(savedRaw) : null;
      return (Object.keys(NODE_META) as NodeId[]).map((id) =>
        makeNode(id, saved?.[id] ?? base[id] ?? { x: 0, y: 0 }, NODE_META[id].role)
      );
    },
    []
  );

  const initialNodes = useMemo(() => makeNodesForLayout(layout), [layout, makeNodesForLayout]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(ALL_EDGES);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: playing,
        style: { ...edge.style, strokeDasharray: playing ? undefined : '6 4' },
      }))
    );
  }, [playing, setEdges]);

  const filteredEdges = useMemo(() => {
    if (scenario === 'ALL') return edges;
    const ids = new Set(SCENARIO_DEFS[scenario].includeEdgeIds);
    return edges.filter((edge) => ids.has(edge.id));
  }, [edges, scenario]);

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent, n: Node) => {
      setNodes((nds) => {
        const next = nds.map((node) => (node.id === n.id ? { ...node, position: n.position } : node));
        const map: Record<string, { x: number; y: number }> = {};
        next.forEach((node) => {
          map[node.id] = node.position;
        });
        if (isBrowser) {
          window.localStorage.setItem(LS_KEY.POSITIONS(layout), JSON.stringify(map));
        }
        return next;
      });
    },
    [layout, setNodes]
  );

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    const data = PAYLOADS[edge.id] ?? { info: 'Keine Payload für diese Kante vorhanden.' };
    setSelectedPayload({ id: edge.id, json: JSON.stringify(data, null, 2) });
  }, []);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...conn,
            type: 'smoothstep',
            animated: playing,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      ),
    [setEdges, playing]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const title = target?.getAttribute('title');
      if (title) {
        setHover({ show: true, x: e.clientX, y: e.clientY, text: title });
      } else {
        setHover((h) => ({ ...h, show: false }));
      }
    };
    window.document.addEventListener('mousemove', onMove);
    return () => window.document.removeEventListener('mousemove', onMove);
  }, []);

  const switchLayout = useCallback(
    (mode: LayoutMode) => {
      setLayout(mode);
      const rebuilt = makeNodesForLayout(mode);
      setNodes(rebuilt);
      setTimeout(() => rf.fitView(fitViewOptions), 0);
    },
    [makeNodesForLayout, setNodes, rf]
  );

  const resetLayout = useCallback(() => {
    if (!isBrowser) return;
    if (!window.confirm('Zurücksetzen auf Default-Layout? (Eigene Positionen werden verworfen)')) return;
    window.localStorage.removeItem(LS_KEY.POSITIONS(layout));
    const rebuilt = makeNodesForLayout(layout);
    setNodes(rebuilt);
    setTimeout(() => rf.fitView(fitViewOptions), 0);
  }, [layout, makeNodesForLayout, setNodes, rf]);

  const restoreProLayout = useCallback(() => {
    if (!isBrowser) return;
    const preset = layout === 'cube' ? CUBE_POS : LANES_POS;
    window.localStorage.setItem(LS_KEY.POSITIONS(layout), JSON.stringify(preset));
    const rebuilt = makeNodesForLayout(layout);
    setNodes(rebuilt);
    setTimeout(() => rf.fitView(fitViewOptions), 0);
  }, [layout, makeNodesForLayout, setNodes, rf]);

  const exportJSON = useCallback(() => {
    if (!isBrowser) return;
    const state = {
      layout,
      positions: nodes.reduce<Record<string, { x: number; y: number }>>((acc, n) => {
        acc[n.id] = n.position;
        return acc;
      }, {}),
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `techstackflow_${layout}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [layout, nodes]);

  const importJSON = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const mode: LayoutMode = parsed.layout ?? layout;
          const pos: Record<NodeId, { x: number; y: number }> = parsed.positions ?? {};
          if (isBrowser) {
            window.localStorage.setItem(LS_KEY.POSITIONS(mode), JSON.stringify(pos));
          }
          setLayout(mode);
          const next = makeNodesForLayout(mode);
          setNodes(next);
          setTimeout(() => rf.fitView(fitViewOptions), 0);
        } catch {
          window.alert('Ungültige JSON-Datei.');
        }
      };
      reader.readAsText(file);
    },
    [layout, makeNodesForLayout, setNodes, rf]
  );

  const accordionItems = useMemo(
    () => [
      {
        title: 'OrderCreated Flow',
        content: (
          <ul className="list-disc pl-5">
            <li>B2B → Shopify, B2C → Shopify & Marktplatz(Tab)</li>
            <li>Marktplatz(Tab) → ChannelEngine → OMS</li>
            <li>Shopify → OMS → SAP → Dachser → Sendcloud</li>
            <li>Backfeed → OMS → Shopify/ChannelEngine</li>
          </ul>
        ),
      },
      {
        title: 'Returns Flow',
        content: (
          <ul className="list-disc pl-5">
            <li>Returns Portal → OMS (RMA)</li>
            <li>OMS → SAP (Verbuchung) & OMS → Sendcloud (Label)</li>
            <li>SAP → HubSpot (Kommunikation)</li>
          </ul>
        ),
      },
      {
        title: 'Consent & Customer Events → CDP',
        content: (
          <ul className="list-disc pl-5">
            <li>Consent/Events aus Shop & CRM → CDP</li>
            <li>Identity-Graph & Audience-Building</li>
          </ul>
        ),
      },
      {
        title: 'Feeds (PIM/Repricing)',
        content: (
          <ul className="list-disc pl-5">
            <li>PIM → ProductFeed zu ChannelEngine & Shopify</li>
            <li>Repricing → PriceFeed zu ChannelEngine</li>
          </ul>
        ),
      },
      {
        title: 'Tracking & Marktplätze',
        content: (
          <ul className="list-disc pl-5">
            <li>Sendcloud Tracking → ChannelEngine/Marktplätze</li>
          </ul>
        ),
      },
      {
        title: 'Trusted Shops',
        content: (
          <ul className="list-disc pl-5">
            <li>Badges/Reviews → Shopify, HubSpot, GA4, CDP</li>
          </ul>
        ),
      },
      {
        title: 'GA4 / GTM / Ad Pixels',
        content: (
          <ul className="list-disc pl-5">
            <li>GTM konfiguriert GA4 & Ads/Pixels</li>
            <li>Analytics-Events → CDP Export</li>
          </ul>
        ),
      },
      {
        title: 'Self Service & Support',
        content: (
          <ul className="list-disc pl-5">
            <li>Helpdesk/Chatbot/KB → CRM & CDP</li>
            <li>KB-Links → Shopify</li>
            <li>
              Chatbot→KB→PIM, KB in Helpdesk/Returns, KB/Returns Events → CDP, Chatbot Ticket → HubSpot
            </li>
          </ul>
        ),
      },
    ],
    []
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-[100vh] w-full bg-white text-gray-900">
      <aside className="w-[360px] shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 p-4 overflow-y-auto">
        <div className="mb-4">
          <div className="text-base font-bold tracking-tight" style={{ color: 'var(--atera-primary)' }}>
            Atera Tech-Stack Flow
          </div>
          <div className="text-xs text-gray-500">CI-konforme Architektur- & Datenflussvisualisierung</div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <SectionTitle label="Layout" sub="Cube (Cluster) oder Lanes (Flowchart)" />
            <div className="flex gap-2">
              <button
                onClick={() => switchLayout('cube')}
                className={`rounded-lg border px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50 ${layout === 'cube' ? '' : 'border-gray-200'}`}
                style={
                  layout === 'cube'
                    ? {
                        borderColor: 'var(--atera-primary)',
                        boxShadow: `0 0 0 1px var(--atera-focus) inset`,
                        color: 'var(--atera-primary)',
                      }
                    : {}
                }
              >
                Cube
              </button>
              <button
                onClick={() => switchLayout('lanes')}
                className={`rounded-lg border px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50 ${layout === 'lanes' ? '' : 'border-gray-200'}`}
                style={
                  layout === 'lanes'
                    ? {
                        borderColor: 'var(--atera-primary)',
                        boxShadow: `0 0 0 1px var(--atera-focus) inset`,
                        color: 'var(--atera-primary)',
                      }
                    : {}
                }
              >
                Lanes
              </button>
              <button
                onClick={resetLayout}
                className="ml-auto rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                Reset Layout
              </button>
              <button
                onClick={restoreProLayout}
                className="rounded-lg border px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50"
                style={{ borderColor: 'var(--atera-primary)', color: 'var(--atera-primary)' }}
              >
                Restore Pro Layout
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <SectionTitle label="Szenario" sub="Filtert nur die relevanten Flows" />
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ScenarioKey | 'ALL')}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="ALL">Alle Flows</option>
              {(Object.keys(SCENARIO_DEFS) as ScenarioKey[]).map((key) => (
                <option key={key} value={key}>
                  {SCENARIO_DEFS[key].title}
                </option>
              ))}
            </select>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setScenario('ALL')}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                Reset Filter
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="rounded-lg border px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50"
                style={{ borderColor: 'var(--atera-primary)', color: 'var(--atera-primary)' }}
              >
                {playing ? 'Stop Animation' : 'Play Animation'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <SectionTitle label="Akkordeon (Ablaufschritte)" sub="Erweitert um alle Kern-Flows" />
            <Accordion items={accordionItems} />
          </div>

          <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <SectionTitle label="Zoom & Ansicht" sub="Canvas-Steuerung und Export/Import" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => rf.zoomIn({ duration: 200 })}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                Zoom In
              </button>
              <button
                onClick={() => rf.zoomOut({ duration: 200 })}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                Zoom Out
              </button>
              <button
                onClick={() => rf.fitView(fitViewOptions)}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                Fit View
              </button>
              <button
                onClick={() => rf.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                Reset View
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={exportJSON}
                className="rounded-lg border px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50"
                style={{ borderColor: 'var(--atera-primary)', color: 'var(--atera-primary)' }}
              >
                Export JSON
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border px-2.5 py-1.5 text-sm shadow-sm hover:bg-gray-50"
                style={{ borderColor: 'var(--atera-primary)', color: 'var(--atera-primary)' }}
              >
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importJSON(file);
                }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-600">
              <strong>Export:</strong> speichert Layout & Positionen als JSON.{' '}
              <strong>Import:</strong> lädt sie wieder und führt automatisch <code>fitView</code> aus.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <SectionTitle label="Legende (Rollen)" />
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_COLORS) as RoleKey[]).map((rk) => (
                <div key={rk} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full border ${ROLE_COLORS[rk].bg} ${ROLE_COLORS[rk].border}`}></span>
                  <span className="text-xs text-gray-700">{rk}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <SectionTitle label="Brand Theme" sub="Hexwerte aus dem Brand Book (Legende bleibt unverändert)" />
            <ThemeEditor />
          </div>

          <AnimatePresence>
            {selectedPayload && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">Edge Payload</span>
                  <button
                    onClick={() => setSelectedPayload(null)}
                    className="rounded border border-emerald-200 px-2 py-0.5 hover:bg-emerald-100"
                  >
                    Schließen
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap">{selectedPayload.json}</pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <div className="relative grow">
        <ReactFlow
          nodes={nodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          fitView
          fitViewOptions={fitViewOptions}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="#e5e7eb" />
          <MiniMap pannable zoomable nodeStrokeColor={() => '#94a3b8'} nodeColor={() => '#ffffff'} />
          <Controls position="bottom-right" showInteractive />
        </ReactFlow>
        <div className="pointer-events-none absolute left-3 bottom-3 text-xs text-gray-400">
          Atera • Architecture &amp; Data Flow
        </div>

        {hover.show && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            {hover.text}
          </div>
        )}
      </div>
    </div>
  );
};

const TechStackFlow: React.FC = () => (
  <ReactFlowProvider>
    <TechStackFlowInner />
  </ReactFlowProvider>
);

export default TechStackFlow;
