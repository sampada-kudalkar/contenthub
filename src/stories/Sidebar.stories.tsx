import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect } from "react";
import {
  IconStrip,
  L2NavPanel,
  ReviewsL2NavPanel,
  SocialL2NavPanel,
  SearchAIL2NavPanel,
  ContactsL2NavPanel,
  AgentsL2NavPanel,
  ListingsL2NavPanel,
  TicketingL2NavPanel,
  CampaignsL2NavPanel,
  SurveysL2NavPanel,
  InsightsL2NavPanel,
  CompetitorsL2NavPanel,
  InboxL2NavPanel,
} from "@/app/components/Sidebar";
import { ReviewsL2NavPanel as ReviewsL2NavPanelV1 } from "@/app/components/Sidebar.v1";
import { ReviewsL2NavPanel as ReviewsL2NavPanelV2, RecommendationsL2NavPanel } from "@/app/components/Sidebar.v2";
import { SidebarSectioned } from "@/app/components/SidebarSectioned.v1";
import { AgentsL2NavPanel as AgentsL2NavPanelV1 } from "@/app/components/AgentsL2NavPanel.v1";
import { AgentsL2NavPanel as AgentsL2NavPanelV2 } from "@/app/components/AgentsL2NavPanel.v2";
import { APP_SHELL_GUTTER_SURFACE_CLASS } from "@/app/components/layout/appShellClasses";
import { MonitorNotificationsProvider } from "@/app/context/MonitorNotificationsContext";
import type { AppView } from "@/app/App";
import { CONTACTS_L2_KEY_ALL } from "@/app/components/ContactsView";
import { SEARCH_AI_L2_DEFAULT_ACTIVE } from "@/app/components/searchai/searchAIL2Keys";

function SearchAIL2NavPanelStateful() {
  const [activeItem, setActiveItem] = useState(SEARCH_AI_L2_DEFAULT_ACTIVE);
  return <SearchAIL2NavPanel activeItem={activeItem} onActiveItemChange={setActiveItem} />;
}

function ContactsL2NavPanelStateful() {
  const [activeItem, setActiveItem] = useState(CONTACTS_L2_KEY_ALL);
  return (
    <ContactsL2NavPanel
      activeItem={activeItem}
      onActiveItemChange={setActiveItem}
      onAddContact={() => {}}
    />
  );
}

// ─── All selectable views ─────────────────────────────
const VIEW_OPTIONS: AppView[] = [
  "business-overview",
  "agents-monitor", "birdai-journeys", "birdai-reports",
  "dashboard", "shared-by-me",
  "reviews", "social", "searchai",
  "listings", "contacts", "inbox",
  "surveys", "ticketing", "campaigns",
  "insights", "competitors",
  "scheduled-deliveries",
];

const VIEW_LABELS: Record<string, string> = {
  "business-overview":     "Overview (no L2)",
  "agents-monitor":        "BirdAI — Monitor",
  "birdai-journeys":       "BirdAI — Journeys placeholder",
  "birdai-reports":        "BirdAI — Reports (in-app)",
  "dashboard":             "Reports — Dashboard",
  "shared-by-me":          "Reports — Shared by me",
  "reviews":               "Reviews",
  "social":                "Social AI",
  "searchai":              "Search AI",
  "listings":              "Listings",
  "contacts":              "Contacts",
  "inbox":                 "Inbox",
  "surveys":               "Surveys",
  "ticketing":             "Ticketing",
  "campaigns":             "Campaigns",
  "insights":              "Insights",
  "competitors":           "Competitors",
  "scheduled-deliveries":  "Scheduled deliveries (no L2)",
};

// ─── L2 panel resolver ────────────────────────────────
function ActiveL2Panel({ view, onViewChange }: { view: AppView; onViewChange: (v: AppView) => void }) {
  if (view === "business-overview") return null;
  if (view === "reviews")     return <ReviewsL2NavPanel />;
  if (view === "social")      return <SocialL2NavPanel />;
  if (view === "searchai")    return <SearchAIL2NavPanelStateful />;
  if (view === "contacts")    return <ContactsL2NavPanelStateful />;
  if (view === "listings")    return <ListingsL2NavPanel />;
  if (view === "surveys")     return <SurveysL2NavPanel />;
  if (view === "ticketing")   return <TicketingL2NavPanel />;
  if (view === "campaigns")   return <CampaignsL2NavPanel />;
  if (view === "insights")    return <InsightsL2NavPanel />;
  if (view === "competitors") return <CompetitorsL2NavPanel />;
  if (view === "inbox")       return <InboxL2NavPanel />;
  if (["agents-monitor", "agents-builder", "agents-onboarding", "agent-detail", "birdai-reports", "birdai-journeys"].includes(view))
    return (
      <AgentsL2NavPanel
        currentView={view}
        onViewChange={onViewChange}
        selectedAgentSlug=""
        journeysL2ActiveKey="Agents/workflow"
      />
    );
  if (["scheduled-deliveries", "shared-by-me", "storybook"].includes(view))
    return null;
  return <L2NavPanel currentView={view} onViewChange={onViewChange} />;
}

function SidebarFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex h-screen ${APP_SHELL_GUTTER_SURFACE_CLASS}`}>
      {children}
    </div>
  );
}

// ─── Storybook meta ───────────────────────────────────
const meta: Meta = {
  title: "App/Sidebar",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "**IconStrip** (L1 rail) uses a **70 / 20 / 10** vertical split when the sectioned icon stack is taller than the nav region: fixed prefix icons, one **swap** slot, then **⋯ More**. The overflow list opens as an **anchored** panel (`FLOATING_PANEL_SURFACE_CLASSNAME`, `w-[260px]`, to the right of the rail)—same interaction family as the **profile** avatar menu, **not** a Radix **Sheet**.",
      },
    },
  },
  argTypes: {
    currentView: {
      name: "Active view",
      description: "Active product — updates the highlighted icon and L2 panel.",
      control: "select",
      options: VIEW_OPTIONS,
      labels: Object.fromEntries(VIEW_OPTIONS.map(v => [v, VIEW_LABELS[v]])) as Record<string, string>,
    },
    iconSize: {
      name: "Icon size (px)",
      description: "Phosphor icon size. Default is 16.2px (10% under 18px).",
      control: { type: "range", min: 12, max: 28, step: 0.1 },
    },
  },
};
export default meta;

type Story = StoryObj<{ currentView: AppView; iconSize: number }>;

/* ══════════════════════════════════════════════════════
   STORY 1 — Icon Strip only
   ══════════════════════════════════════════════════════ */
export const IconStripOnly: Story = {
  name: "Icon Strip",
  args: { currentView: "agents-monitor", iconSize: 16.2 },
  render: ({ currentView: argView, iconSize }) => {
    const [view, setView] = useState<AppView>(argView);
    useEffect(() => { setView(argView); }, [argView]);
    return (
      <MonitorNotificationsProvider onNavigateToMonitor={() => setView("agents-monitor")}>
        <SidebarFrame>
          <IconStrip currentView={view} onViewChange={setView} iconSize={iconSize} />
        </SidebarFrame>
      </MonitorNotificationsProvider>
    );
  },
};

/* ══════════════════════════════════════════════════════
   STORY 2 — Full Sidebar (Icon Strip + L2)
   ══════════════════════════════════════════════════════ */
export const SidebarCombined: Story = {
  name: "Sidebar",
  args: { currentView: "dashboard", iconSize: 16.2 },
  render: ({ currentView: argView, iconSize }) => {
    const [view, setView] = useState<AppView>(argView);
    useEffect(() => { setView(argView); }, [argView]);
    return (
      <MonitorNotificationsProvider onNavigateToMonitor={() => setView("agents-monitor")}>
        <SidebarFrame>
          <IconStrip currentView={view} onViewChange={setView} iconSize={iconSize} />
          <ActiveL2Panel view={view} onViewChange={setView} />
        </SidebarFrame>
      </MonitorNotificationsProvider>
    );
  },
};

export const SidebarSectionedStory: Story = {
  name: "Sidebar / Sectioned (Expanded)",
  render: () => (
    <SidebarFrame>
      <SidebarSectioned defaultExpanded />
    </SidebarFrame>
  ),
};

/* ══════════════════════════════════════════════════════
   STORY 3 — All L2 panels reference
   One story per panel for quick visual review
   ══════════════════════════════════════════════════════ */
const panelStories: { name: string; view: AppView }[] = [
  { name: "L2 / Dashboard", view: "dashboard" },
  { name: "L2 / Reviews",              view: "reviews" },
  { name: "L2 / Social AI",            view: "social" },
  { name: "L2 / Search AI",            view: "searchai" },
  { name: "L2 / Listings",             view: "listings" },
  { name: "L2 / Contacts",             view: "contacts" },
  { name: "L2 / Inbox",                view: "inbox" },
  { name: "L2 / Surveys",              view: "surveys" },
  { name: "L2 / Ticketing",            view: "ticketing" },
  { name: "L2 / Campaigns",            view: "campaigns" },
  { name: "L2 / Insights",             view: "insights" },
  { name: "L2 / Competitors",          view: "competitors" },
  { name: "L2 / BirdAI — Monitor",     view: "agents-monitor" },
];

export const L2Dashboard: Story = {
  name: panelStories[0].name,
  render: () => (
    <SidebarFrame>
      <L2NavPanel currentView="dashboard" onViewChange={() => {}} />
    </SidebarFrame>
  ),
};
export const L2Reviews: Story     = { name: panelStories[1].name,  render: () => <SidebarFrame><ReviewsL2NavPanel /></SidebarFrame> };

/** Explicit design-version snapshots (import `.v1` / `.v2` sources directly). */
export const L2ReviewsDesignV1: Story = {
  name: "L2 / Reviews (Sidebar v1)",
  render: () => (
    <SidebarFrame>
      <ReviewsL2NavPanelV1 />
    </SidebarFrame>
  ),
};
export const L2ReviewsDesignV2: Story = {
  name: "L2 / Reviews (Sidebar v2)",
  render: () => (
    <SidebarFrame>
      <ReviewsL2NavPanelV2 />
    </SidebarFrame>
  ),
};
export const L2Social: Story      = { name: panelStories[2].name,  render: () => <SidebarFrame><SocialL2NavPanel /></SidebarFrame> };
export const L2SocialPlaceholder: Story = {
  name: "L2 / Social AI (placeholder shell)",
  render: () => (
    <SidebarFrame>
      <SocialL2NavPanel activeItem="" onActiveItemChange={() => {}} mode="placeholder" />
    </SidebarFrame>
  ),
};
export const L2SearchAI: Story    = { name: panelStories[3].name,  render: () => <SidebarFrame><SearchAIL2NavPanelStateful /></SidebarFrame> };
export const L2Listings: Story    = { name: panelStories[4].name,  render: () => <SidebarFrame><ListingsL2NavPanel /></SidebarFrame> };
export const L2Contacts: Story    = { name: panelStories[5].name,  render: () => <SidebarFrame><ContactsL2NavPanel activeItem={CONTACTS_L2_KEY_ALL} onActiveItemChange={() => {}} onAddContact={() => {}} /></SidebarFrame> };
export const L2Inbox: Story       = { name: panelStories[6].name,  render: () => <SidebarFrame><InboxL2NavPanel /></SidebarFrame> };
export const L2Surveys: Story     = { name: panelStories[7].name,  render: () => <SidebarFrame><SurveysL2NavPanel /></SidebarFrame> };
export const L2Ticketing: Story   = { name: panelStories[8].name,  render: () => <SidebarFrame><TicketingL2NavPanel /></SidebarFrame> };
export const L2Campaigns: Story   = { name: panelStories[9].name,  render: () => <SidebarFrame><CampaignsL2NavPanel /></SidebarFrame> };
export const L2Insights: Story    = { name: panelStories[10].name, render: () => <SidebarFrame><InsightsL2NavPanel /></SidebarFrame> };
export const L2Competitors: Story = { name: panelStories[11].name, render: () => <SidebarFrame><CompetitorsL2NavPanel /></SidebarFrame> };
export const L2Agents: Story      = { name: panelStories[12].name, render: () => <SidebarFrame><AgentsL2NavPanel currentView="agents-monitor" onViewChange={() => {}} selectedAgentSlug="" journeysL2ActiveKey="Agents/workflow" /></SidebarFrame> };

/** Explicit design-version snapshots for Agents L2 panel. */
export const L2AgentsDesignV1: Story = {
  name: "L2 / Agents (v1)",
  render: () => (
    <SidebarFrame>
      <AgentsL2NavPanelV1 currentView="agents-monitor" onViewChange={() => {}} selectedAgentSlug="" />
    </SidebarFrame>
  ),
};
export const L2AgentsDesignV2: Story = {
  name: "L2 / Agents (v2)",
  render: () => (
    <SidebarFrame>
      <AgentsL2NavPanelV2 currentView="agents-monitor" onViewChange={() => {}} selectedAgentSlug="" />
    </SidebarFrame>
  ),
};
export const RecommendationsL2Nav: Story = {
  name: "Recommendations L2 nav panel",
  render: () => (
    <div className={`${APP_SHELL_GUTTER_SURFACE_CLASS} h-screen`}>
      <RecommendationsL2NavPanel />
    </div>
  ),
};
