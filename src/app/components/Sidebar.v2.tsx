import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import {
  ChevronDown, ChevronUp, Settings, Camera, Moon, Sun, Monitor, ChevronLeft, ExternalLink, Plus, Info,
} from "lucide-react";
import {
  FigmaIconBirdAI, FigmaIconOverview, FigmaIconInbox, FigmaIconListings,
  FigmaIconReviews, FigmaIconReferrals, FigmaIconPayments, FigmaIconAppointments,
  FigmaIconSocial, FigmaIconSurveys, FigmaIconTicketing, FigmaIconContacts,
  FigmaIconCampaigns, FigmaIconCompetitors, FigmaIconInsights, FigmaIconReports,
  FigmaIconContentHub,
} from "./l1Icons";
import svgPaths from "../../imports/svg-y1gexucine";
import type { AppView } from "../App";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { APP_SHELL_RAIL_SURFACE_CLASS } from "@/app/components/layout/appShellClasses";
import { FLOATING_PANEL_SURFACE_CLASSNAME } from "@/app/components/ui/floatingPanelSurface";
import { L1_STRIP_ICON_SIZE, L1_STRIP_ICON_STROKE_PX } from "./l1StripIconTokens";
import { MonitorNotificationsTrigger } from "./MonitorNotificationsTrigger";
import { AccountSettingsSheet } from "./settings/AccountSettingsSheet";
import { useTheme, type ThemePreference } from "./useTheme";
import {
  L2NavLayout,
  PANEL,
  PANEL_INBOX_L2,
  ROW,
  HOVER,
  CHILD_ACTIVE,
  CHILD_INACTIVE,
  FOOTER_ROW_CLS,
  SECTION_HEADER,
  L2_HEADER_PLUS_WRAPPER_BLUE,
  L2_HEADER_PLUS_GLYPH_BLUE,
  L2_HEADER_PLUS_STROKE_PX,
} from "./L2NavLayout";

/** How long to show the Reports-row shimmer before opening the tab (~sub-second “micro” handoff). */
export const REPORTS_EXTERNAL_SHIMMER_MS = 480;

/** Opens the full Reporting module in a new tab. Set `VITE_REPORTING_MODULE_URL` in the host app when known. */
export function openReportingModuleInNewTab() {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const envUrl = (env?.VITE_REPORTING_MODULE_URL ?? "").trim();
  const url = envUrl || `${window.location.origin}${window.location.pathname}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1617853701628-bfcf8b81d13d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBoZWFkc2hvdCUyMHNtaWxlJTIwc3R1ZGlvJTIwbGlnaHRpbmd8ZW58MXx8fHwxNzczMjE4MDIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

/** Search AI — lightbulb icon, matching Figma icon style */
function FigmaIconSearchAI({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
      aria-hidden
    >
      <path d="M7.5 15.833h5M10 2.5a4.583 4.583 0 0 1 2.917 8.125c-.584.5-.917 1.208-.917 1.958V13.5a.833.833 0 0 1-.833.833H8.833A.833.833 0 0 1 8 13.5v-.917c0-.75-.333-1.458-.917-1.958A4.583 4.583 0 0 1 10 2.5Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── Icon-strip items — Figma "Visual Uplift 2.0" icons ─── */
const iconStripItems: { label: string; Icon: React.ElementType }[] = [
  { label: "Agents",       Icon: FigmaIconBirdAI      },
  { label: "Inbox",        Icon: FigmaIconInbox       },
  { label: "Listings",     Icon: FigmaIconListings    },
  { label: "Search AI",    Icon: FigmaIconSearchAI    }, // bulb icon, above Reviews
  { label: "Reviews",      Icon: FigmaIconReviews     },
  { label: "Referrals",    Icon: FigmaIconReferrals   },
  { label: "Payments",     Icon: FigmaIconPayments    },
  { label: "Appointments", Icon: FigmaIconAppointments},
  { label: "Social",       Icon: FigmaIconSocial      },
  { label: "Content Hub",  Icon: FigmaIconContentHub  }, // file-with-lines icon
  { label: "Surveys",      Icon: FigmaIconSurveys     },
  { label: "Ticketing",    Icon: FigmaIconTicketing   },
  { label: "Contacts",     Icon: FigmaIconContacts    },
  { label: "Campaigns",    Icon: FigmaIconCampaigns   },
  { label: "Competitors",  Icon: FigmaIconCompetitors },
  { label: "Insights",     Icon: FigmaIconInsights    },
  { label: "Reports",      Icon: FigmaIconReports     },
];

/* ═══════════════════════════════════════════
   Icon Strip (L1 nav rail) – exported separately
   (sizes / stroke: `l1StripIconTokens`)
   ═══════════════════════════════════════════ */

interface IconStripProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  /** Icon size in px. Defaults to `L1_STRIP_ICON_SIZE` (16.2). */
  iconSize?: number;
  onOpenKeyboardShortcuts?: () => void;
  /** Demo auth: clear session and show login (wired from App). */
  onSignOut?: () => void;
}

export function IconStrip({ currentView, onViewChange, iconSize = L1_STRIP_ICON_SIZE, onOpenKeyboardShortcuts, onSignOut }: IconStripProps) {
  const [activeIcon, setActiveIcon] = useState("Agents");
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  // Portal tooltip — fixed position so it escapes overflow-y: auto clipping
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);

  const showTooltip = (e: React.MouseEvent<HTMLElement>, label: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  };
  const hideTooltip = () => setTooltip(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void showTooltip; void hideTooltip; void tooltip;
  const [showAppearance, setShowAppearance] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark, preference, setPreference } = useTheme();

  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return localStorage.getItem("profile_avatar") || DEFAULT_AVATAR;
  });

  // Sync activeIcon with currentView (layout effect avoids wrong rail highlight on first paint)
  useLayoutEffect(() => {
    if (currentView === "business-overview") setActiveIcon("Agents");
    else if (currentView === "inbox") setActiveIcon("Inbox");
    else if (currentView === "reviews") setActiveIcon("Reviews");
    else if (currentView === "social") setActiveIcon("Social");
    else if (currentView === "searchai" || currentView === "recommendations") setActiveIcon("Search AI");
    else if (currentView === "contacts") setActiveIcon("Contacts");
    else if (currentView === "listings") setActiveIcon("Listings");
    else if (currentView === "surveys") setActiveIcon("Surveys");
    else if (currentView === "ticketing") setActiveIcon("Ticketing");
    else if (currentView === "campaigns") setActiveIcon("Campaigns");
    else if (currentView === "insights") setActiveIcon("Insights");
    else if (currentView === "competitors") setActiveIcon("Competitors");
    else if (currentView === "referrals") setActiveIcon("Referrals");
    else if (currentView === "payments") setActiveIcon("Payments");
    else if (currentView === "appointments") setActiveIcon("Appointments");
    else if (currentView?.startsWith("content-hub")) setActiveIcon("Content Hub");
    else if (currentView === "dashboard" || currentView === "shared-by-me") setActiveIcon("Reports");
    else if (currentView === "agents-monitor" || currentView === "agents-analyze-performance" || currentView === "agents-builder" || currentView === "agent-detail" || currentView === "agents-onboarding" || currentView === "birdai-reports" || currentView === "birdai-journeys") setActiveIcon("Agents");
    // scheduled-deliveries / schedule-builder: no icon mapping
  }, [currentView]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarUrl(dataUrl);
      localStorage.setItem("profile_avatar", dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setShowAppearance(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className={`w-[66px] flex flex-col items-center shrink-0 text-base ${APP_SHELL_RAIL_SURFACE_CLASS}`}
      data-no-print
    >
      {/* Birdeye logo */}
      <div className="h-[48px] w-[55px] flex items-center justify-center shrink-0">
        <svg width="17.55" height="16.875" viewBox="0 0 19.5 18.75" fill="none">
          <path clipRule="evenodd" d={svgPaths.p23fcc000} fill="#2552ED" fillRule="evenodd" />
        </svg>
      </div>

      {/* Icon buttons */}
      <div className="flex flex-col items-center px-[12px] pb-[8px] pt-0 gap-[2px] flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {iconStripItems.map(({ label, Icon }) => {
          const isActive = label === activeIcon;
          return (
            <button
              key={label}
              onClick={() => {
                setActiveIcon(label);
                if (label === "Inbox") onViewChange("inbox");
                else if (label === "Reports") onViewChange("dashboard");
                else if (label === "Reviews") onViewChange("reviews");
                else if (label === "Social") onViewChange("social");
                else if (label === "Search AI") onViewChange("recommendations");
                else if (label === "Insights") onViewChange("recommendations");
                else if (label === "Contacts") onViewChange("contacts");
                else if (label === "Agents") onViewChange("agents-monitor");
                else if (label === "Listings") onViewChange("listings");
                else if (label === "Surveys") onViewChange("surveys");
                else if (label === "Ticketing") onViewChange("ticketing");
                else if (label === "Campaigns") onViewChange("campaigns");
                else if (label === "Competitors") onViewChange("competitors");
                else if (label === "Referrals") onViewChange("referrals");
                else if (label === "Payments") onViewChange("payments");
                else if (label === "Appointments") onViewChange("appointments");
                else if (label === "Content Hub") onViewChange("content-hub");
              }}
              className={`
                group relative w-[32px] h-[32px] flex items-center justify-center rounded-[10px] shrink-0
                transition-all duration-200 ease-out outline-none
                focus-visible:ring-2 focus-visible:ring-[#1E44CC]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-app-shell-rail
                ${isActive
                  ? "bg-[#d4dae3] dark:bg-[#282e3a] shadow-none"
                  : "bg-transparent hover:bg-[#d4dae3] dark:hover:bg-[#282e3a] active:bg-[#c8d0dc] dark:active:bg-[#313845] hover:scale-110 active:scale-95"
                }
              `}
            >
              <Icon
                size={iconSize}
                className={`transition-all duration-200 group-hover:text-[#1E44CC] dark:group-hover:text-[#2952E3] group-active:text-[#1E44CC] dark:group-active:text-[#2952E3] ${
                  isActive
                    ? "text-[#1E44CC] dark:text-[#2952E3]"
                    : "text-[#505050] dark:text-[#9ba2b0] group-hover:scale-110"
                } ${label === "Agents" && isActive ? "group-hover:animate-[agents-shimmer_3s_ease-in-out_infinite]" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {/* ─── Bottom tower: Settings + Notifications + Profile (matches main rail order + v2 notifications) ─── */}
      <div className="flex flex-col items-center gap-2 pb-3 pt-2 shrink-0">
        {/* Settings gear — same surface / hover / focus as L1 nav icons */}
        <button
          type="button"
          className="group relative w-[32px] h-[32px] flex items-center justify-center rounded-[10px] shrink-0 transition-all duration-200 ease-out outline-none bg-transparent hover:bg-[#d4dae3] dark:hover:bg-[#282e3a] active:bg-[#c8d0dc] dark:active:bg-[#313845] hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#1E44CC]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-app-shell-rail"
        >
          <Settings
            width={L1_STRIP_ICON_SIZE}
            height={L1_STRIP_ICON_SIZE}
            strokeWidth={L1_STRIP_ICON_STROKE_PX}
            absoluteStrokeWidth
            className="text-[#505050] dark:text-[#9ba2b0] transition-all duration-200 group-hover:text-[#1E44CC] dark:group-hover:text-[#2952E3] group-active:text-[#1E44CC] dark:group-active:text-[#2952E3] group-hover:scale-110"
          />
        </button>

        <MonitorNotificationsTrigger />

        {/* Profile avatar with upward dropdown */}
        <div className="relative" ref={profileRef}>
          <Button
            type="button"
            variant="ghost"
            size="iconXs"
            onClick={() => {
              setProfileOpen(!profileOpen);
              if (profileOpen) setShowAppearance(false);
            }}
            className="relative min-h-0 min-w-0 shrink-0 cursor-pointer overflow-hidden rounded-full p-0 shadow-sm ring-2 ring-white/80 transition-all hover:ring-white dark:ring-[#3d4555] dark:hover:ring-[#4d5568]"
          >
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          </Button>

          {/* Dropdown - opens UPWARD from bottom-left */}
          {profileOpen && (
            <div
              className={`absolute bottom-0 left-[calc(100%+8px)] z-50 w-[260px] overflow-hidden transition-colors duration-300 ${FLOATING_PANEL_SURFACE_CLASSNAME}`}
            >
              {/* Slide between main menu and appearance sub-panel */}
              <div className="relative overflow-hidden">
                <div
                  className="flex transition-transform duration-250 ease-in-out"
                  style={{ transform: showAppearance ? "translateX(-100%)" : "translateX(0)" }}
                >
                  {/* ─── Main menu panel ─── */}
                  <div className="w-full shrink-0">
                    {/* Profile header — inset from card edge (Subframe-style shell) */}
                    <div className="px-4 pb-2 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="relative group shrink-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#e8eaed] dark:ring-[#3d4555]">
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#212121] dark:text-[#e4e4e4] truncate" style={{ fontWeight: 400 }}>John Doe</p>
                          <p className="text-[11px] text-[#999] dark:text-[#777] truncate">john.doe@acmecorp.com</p>
                        </div>
                      </div>
                    </div>
                    {/* Text-only rows: inset pill hovers (Subframe-style), no icons */}
                    <div className="flex flex-col gap-1 px-2 pb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountSheetOpen(true);
                          setProfileOpen(false);
                          setShowAppearance(false);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#212121] transition-colors duration-150 hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                      >
                        My profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onViewChange("shared-by-me");
                          setProfileOpen(false);
                          setShowAppearance(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 ${
                          currentView === "shared-by-me"
                            ? "bg-[#e8effe] text-[#2552ED] dark:bg-[#1e2d5e] dark:text-[#6b9bff]"
                            : "text-[#212121] hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        Shared by me
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onViewChange("scheduled-deliveries");
                          setProfileOpen(false);
                          setShowAppearance(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 ${
                          currentView === "scheduled-deliveries"
                            ? "bg-[#e8effe] text-[#2552ED] dark:bg-[#1e2d5e] dark:text-[#6b9bff]"
                            : "text-[#212121] hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        Scheduled deliveries
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#212121] transition-colors duration-150 hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                      >
                        Settings
                      </button>
                      {onOpenKeyboardShortcuts && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenKeyboardShortcuts();
                            setProfileOpen(false);
                            setShowAppearance(false);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#212121] transition-colors duration-150 hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                        >
                          Keyboard shortcuts
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAppearance(true)}
                        className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#212121] transition-colors duration-150 hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                      >
                        Switch appearance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setShowAppearance(false);
                          onSignOut?.();
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#C62828] transition-colors duration-150 hover:bg-[#fce4ec] dark:hover:bg-[#3d2528]"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>

                  {/* ─── Appearance sub-panel ─── */}
                  <div className="w-full shrink-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-2 dark:border-[#333a47]">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowAppearance(false)}
                        className="shrink-0 border-2 border-[#2552ED] transition-colors hover:bg-[#e8effe] dark:hover:bg-[#1e2d5e]"
                      >
                        <ChevronLeft className="h-4 w-4 text-[#2552ED]" />
                      </Button>
                      <span className="text-[14px] text-[#212121] dark:text-[#e4e4e4] flex-1" style={{ fontWeight: 400 }}>
                        Switch appearance
                      </span>
                      <Moon
                        className="w-5 h-5 text-[#555] dark:text-[#ccc] transition-transform duration-500"
                        style={{ transform: isDark ? "rotate(-30deg)" : "rotate(0deg)" }}
                      />
                    </div>
                    {/* Theme options — same inset pill rows as main profile menu */}
                    <div className="flex flex-col gap-1 px-2 pb-3 pt-1">
                      {([
                        { value: "light" as ThemePreference, label: "Light", Icon: Sun },
                        { value: "dark" as ThemePreference, label: "Dark", Icon: Moon },
                        { value: "auto" as ThemePreference, label: "System", Icon: Monitor },
                      ]).map(({ value, label, Icon }) => {
                        const isSelected = preference === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setPreference(value)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 ${
                              isSelected
                                ? "bg-[#e8effe] text-[#2552ED] dark:bg-[#1e2d5e] dark:text-[#6b9bff]"
                                : "text-[#212121] hover:bg-[#f3f4f6] dark:text-[#e4e4e4] dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <Icon
                                className={`w-4 h-4 transition-transform duration-500 ${
                                  isSelected ? "text-[#2552ED]" : "text-[#555] dark:text-[#8b92a5]"
                                }`}
                                style={{
                                  transform: value === "dark" && isDark ? "rotate(-30deg)" : "rotate(0deg)",
                                }}
                              />
                              {label}
                            </span>
                            {/* Radio indicator */}
                            <span
                              className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "border-[#2552ED]"
                                  : "border-[#ccc] dark:border-[#4d5568]"
                              }`}
                            >
                              {isSelected && (
                                <span className="w-[10px] h-[10px] rounded-full bg-[#2552ED]" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AccountSettingsSheet
        open={accountSheetOpen}
        onOpenChange={setAccountSheetOpen}
        avatarUrl={avatarUrl}
        onAvatarUpload={handleAvatarUpload}
        defaultFirstName="John"
        defaultLastName="Doe"
        defaultEmail="john.doe@acmecorp.com"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   L2 Nav Panel (Reports sub-nav) – exported separately
   ═══════════════════════════════════════════ */
interface L2NavPanelProps {
  currentView: AppView;
  onViewChange: (view: AppView, agentSlug?: string) => void;
}

/* ─── Reporting nav data ─── */
const dashboardSections = [
  { label: "Created by me", children: ["Palo Alto performance", "2024 Yearly report"] },
  { label: "Shared with me", children: ["2025 Q1 dashboard", "2025 Q2 dashboard", "2025 Q3 dashboard"] },
];

/** Product report catalogs in Reports L2 (no "Agent Reports" parent). */
const reportCatalogSections = [
  { label: "Listings", children: ["All", "Google", "Apple", "Facebook", "Bing", "Yelp"] },
  { label: "Social", children: ["All channels", "Post performance", "Response trends", "Best time to post"] },
  { label: "Campaigns", children: ["Review campaigns", "Referral campaigns", "CX campaigns", "Custom campaigns"] },
  { label: "Inbox", children: ["Over time", "Location", "Users", "Channels"] },
  { label: "Surveys", children: ["Survey NPS", "Responses"] },
  { label: "Ticketing", children: ["Resolution time", "Volume"] },
];

export function L2NavPanel({ currentView: _currentView, onViewChange }: L2NavPanelProps) {
  // Active item tracked internally
  const [activeItem, setActiveItem] = useState("Created by me/Palo Alto performance");

  const activate = (key: string) => {
    setActiveItem(key);
    onViewChange("dashboard");
  };

  const dashboardExpandedInit = Object.fromEntries(
    dashboardSections.map(s => [s.label, s.label === "Created by me"])
  );
  const reportExpandedInit = Object.fromEntries(
    reportCatalogSections.map(s => [s.label, s.label === "Listings"])
  );

  const [dashboardExpanded, setDashboardExpanded] = useState<Record<string, boolean>>(() => dashboardExpandedInit);
  const [reportExpanded, setReportExpanded] = useState<Record<string, boolean>>(() => reportExpandedInit);

  const toggleDashboard = (label: string) =>
    setDashboardExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  const toggleReport = (label: string) =>
    setReportExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const renderDashboardSection = (section: { label: string; children: string[] }) => {
    const isExp = dashboardExpanded[section.label];
    return (
      <div key={section.label}>
        <button
          type="button"
          onClick={() => toggleDashboard(section.label)}
          className={SECTION_HEADER}
          style={{ fontWeight: 400 }}
        >
          <span>{section.label}</span>
          {isExp
            ? <ChevronUp className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
          }
        </button>
        {isExp && section.children.map(child => {
          const key = `${section.label}/${child}`;
          const isActive = activeItem === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => activate(key)}
              className={isActive ? CHILD_ACTIVE : CHILD_INACTIVE}
              style={{ fontWeight: isActive ? 400 : 300 }}
            >
              {child}
            </button>
          );
        })}
      </div>
    );
  };

  const renderReportSection = (section: { label: string; children: string[] }) => {
    const isExp = reportExpanded[section.label];
    return (
      <div key={section.label}>
        <button
          type="button"
          onClick={() => toggleReport(section.label)}
          className={SECTION_HEADER}
          style={{ fontWeight: 400 }}
        >
          <span>{section.label}</span>
          {isExp
            ? <ChevronUp className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
          }
        </button>
        {isExp && section.children.map(child => {
          const key = `${section.label}/${child}`;
          const isActive = activeItem === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => activate(key)}
              className={isActive ? CHILD_ACTIVE : CHILD_INACTIVE}
              style={{ fontWeight: isActive ? 400 : 300 }}
            >
              {child}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={PANEL} data-no-print>
      <div className="flex-1 overflow-y-auto px-[8px] pt-3 pb-4">
        {/* Create dashboard button */}
        <button
          type="button"
          className={`${FOOTER_ROW_CLS} mb-2`}
          style={{ fontSize: 14 }}
          onClick={() => onViewChange("dashboard")}
        >
          <span className="text-[14px]">Create dashboard</span>
          <div className={L2_HEADER_PLUS_WRAPPER_BLUE}>
            <Plus
              className={L2_HEADER_PLUS_GLYPH_BLUE}
              strokeWidth={L2_HEADER_PLUS_STROKE_PX}
              absoluteStrokeWidth
              aria-hidden
            />
          </div>
        </button>

        {/* Dashboard sections */}
        {dashboardSections.map(renderDashboardSection)}

        {/* Create report button */}
        <button
          type="button"
          className={`${FOOTER_ROW_CLS} mt-2 mb-2`}
          style={{ fontSize: 14 }}
          onClick={() => onViewChange("dashboard")}
        >
          <span className="text-[14px]">Create report</span>
          <div className={L2_HEADER_PLUS_WRAPPER_BLUE}>
            <Plus
              className={L2_HEADER_PLUS_GLYPH_BLUE}
              strokeWidth={L2_HEADER_PLUS_STROKE_PX}
              absoluteStrokeWidth
              aria-hidden
            />
          </div>
        </button>

        {/* Product report catalogs (Listings, Social, …) — no Agent Reports parent */}
        <div className="mt-2 flex flex-col gap-1">
          {reportCatalogSections.map(renderReportSection)}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Reviews L2 Nav Panel – uses L2NavLayout
   ═══════════════════════════════════════════ */

const reviewsConfig = {
  headerAction: { label: "Send a review request" },
  defaultExpandedSections: ["Actions"],
  sections: [
    {
      label: "Actions",
      children: [
        "View all reviews",
        "Respond to reviews",
        "Approve replies",
        "Fix rejected replies",
        "View scheduled replies",
        "Fix failed replies",
      ],
    },
    {
      label: "Reports",
      children: [
        "Overview",
        "Volume and ratings",
        "Leaderboard",
        "Distribution",
        "Responses",
        "NPS",
        "Tags",
        "QR Codes",
        "Review impressions",
      ],
    },
    {
      label: "Competitors",
      children: ["Benchmarking", "Head to head", "Reviews"],
    },
    {
      label: "Agents",
      children: ["Review generation agents", "Review response agents"],
    },
    {
      label: "Settings",
      children: [
        "Review sites",
        "Request templates",
        "Reply templates",
        "Approvals",
        "QR codes",
        "Widgets",
        "Rating display",
        "Auto share rules",
        "Auto reply rules",
        "AI prompts",
      ],
    },
  ],
  footerLink: { label: "Reports", external: true },
};

export function ReviewsL2NavPanel() {
  return <L2NavLayout {...reviewsConfig} storageKey="nav:l2:reviews" data-no-print />;
}

/* ═══════════════════════════════════════════
   Social L2 Nav Panel – uses L2NavLayout
   ═══════════════════════════════════════════ */
const socialConfig = {
  sections: [
    { label: "Publish", children: ["Calendar", "View drafts", "Approve posts", "Fix failed posts", "Fix rejected posts", "Expired posts"] },
    { label: "Engage", children: ["View all engagements", "Assigned to me", "Approve replies", "Fix rejected replies", "View spam"] },
    { label: "Reports", children: ["All channels", "Post performance", "Response trends", "Best time to post"] },
    { label: "Competitors", children: ["Benchmarking", "Posts"] },
    { label: "Libraries", children: ["Post library", "Media library", "Reply templates"] },
    { label: "Agents", children: ["Publishing agent", "Engagement agent"] },
    { label: "Settings", children: ["Approvals", "Link in bio", "Tags", "AI posts", "AI prompts"] },
  ],
};

export type SocialL2NavPanelProps = {
  activeItem: string;
  onActiveItemChange: (key: string) => void;
};

export function SocialL2NavPanel({ activeItem, onActiveItemChange }: SocialL2NavPanelProps) {
  return (
    <L2NavLayout
      {...socialConfig}
      headerAction={{ label: "Create post", onClick: () => onActiveItemChange("Create post") }}
      activeItem={activeItem}
      onActiveItemChange={onActiveItemChange}
      data-no-print
    />
  );
}

/* ═══════════════════════════════════════════
   Search AI L2 Nav Panel – uses L2NavLayout
   ═══════════════════════════════════════════ */
const searchAIConfig = {
  sections: [
    { label: "Actions", children: ["Recommendations", "Track progress"] },
    { label: "Reports", children: ["Citations", "Visibility", "Rankings", "Accuracy", "Sentiment"] },
    { label: "Settings", children: ["Prompts"] },
  ],
};

export type SearchAIL2NavPanelProps = {
  activeItem: string;
  onActiveItemChange: (key: string) => void;
};

export function SearchAIL2NavPanel({ activeItem, onActiveItemChange }: SearchAIL2NavPanelProps) {
  return (
    <L2NavLayout
      {...searchAIConfig}
      activeItem={activeItem}
      onActiveItemChange={onActiveItemChange}
      data-no-print
    />
  );
}

/* ═══════════════════════════════════════════
   Contacts L2 Nav Panel – uses L2NavLayout
   ═══════════════════════════════════════════ */
const contactsNavSections = [
  { label: "Settings", children: ["Custom fields", "Tags"] },
];

function ContactsL2UsageFooter() {
  return (
    <Card className="gap-2 border-border bg-card py-0 shadow-none">
      <CardContent className="flex flex-col gap-2 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs leading-snug">7/50 Reachable contacts added</p>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0 rounded-sm p-1"
            title="Illustrative usage for the prototype"
            aria-label="Usage information"
          >
            <Info className="size-4" aria-hidden />
          </button>
        </div>
        <Progress value={14} />
        <button type="button" className="text-primary text-left text-xs font-medium hover:underline">
          View usage
        </button>
      </CardContent>
    </Card>
  );
}

export type ContactsL2NavPanelProps = {
  activeItem: string;
  onActiveItemChange: (key: string) => void;
  onAddContact: () => void;
};

export function ContactsL2NavPanel({ activeItem, onActiveItemChange, onAddContact }: ContactsL2NavPanelProps) {
  return (
    <L2NavLayout
      headerAction={{ label: "Add a contact", onClick: onAddContact }}
      standaloneItems={["All contacts", "Lists & segments"]}
      sections={contactsNavSections}
      activeItem={activeItem}
      onActiveItemChange={onActiveItemChange}
      defaultActive="standalone/All contacts"
      defaultExpandedSections={[]}
      footerSlot={<ContactsL2UsageFooter />}
      data-no-print
    />
  );
}

/* ═══════════════════════════════════════════
   Listings L2 Nav Panel – new export
   ═══════════════════════════════════════════ */
const listingsConfig = {
  sections: [
    { label: "Actions", children: ["Recommendations", "Suppress duplicates", "Google suggestions"] },
    { label: "Ranking reports", children: ["Keywords", "Citations", "Rankings"] },
    { label: "Search performance", children: ["All sites", "Google", "Apple", "Facebook", "Bing", "Yelp"] },
    { label: "Accuracy", children: ["Core sites", "Other sites"] },
    { label: "Publish status", children: ["All listings", "By location", "By site"] },
    { label: "Agents", children: ["Listing optimization agent"] },
    { label: "Settings", children: ["Profiles", "Keywords", "Ranking report", "FAQs", "Products", "Google services"] },
  ],
};

export function ListingsL2NavPanel() {
  return <L2NavLayout {...listingsConfig} storageKey="nav:l2:listings" data-no-print />;
}

/* ═══════════════════════════════════════════
   Ticketing L2 Nav Panel – new export
   ═══════════════════════════════════════════ */
const ticketingConfig = {
  headerAction: { label: "Create ticket" },
  sections: [
    { label: "Actions", children: ["My tickets", "View all tickets"] },
    { label: "Reports", children: ["Resolution time", "Volume"] },
    { label: "Agents", children: ["Ticket resolution agent"] },
  ],
};

export function TicketingL2NavPanel() {
  return <L2NavLayout {...ticketingConfig} storageKey="nav:l2:ticketing" data-no-print />;
}

/* ═══════════════════════════════════════════
   Campaigns L2 Nav Panel – new export
   ═══════════════════════════════════════════ */
const campaignsConfig = {
  sections: [
    { label: "Actions", children: ["Manage automations", "Manage campaigns"] },
    { label: "Libraries", children: ["Templates", "Landing pages"] },
    { label: "Reports", children: ["Review campaigns", "Referral campaigns", "CX campaigns", "Custom campaigns"] },
    { label: "Settings", children: ["Workflow tags", "Communication restriction"] },
  ],
};

export function CampaignsL2NavPanel() {
  return <L2NavLayout {...campaignsConfig} storageKey="nav:l2:campaigns" data-no-print />;
}

/* ═══════════════════════════════════════════
   Surveys L2 Nav Panel – new export
   ═══════════════════════════════════════════ */
const surveysConfig = {
  headerAction: { label: "Create survey" },
  sections: [
    { label: "Actions", children: ["Respond to surveys"] },
    { label: "Surveys", children: ["All surveys", "Standard surveys", "Pulse surveys"] },
    { label: "Agents", children: ["Survey distribution agent", "Survey tagging agent"] },
    { label: "Libraries", children: ["Request templates"] },
  ],
  footerLink: { label: "Reports", external: true },
};

export function SurveysL2NavPanel() {
  return <L2NavLayout {...surveysConfig} storageKey="nav:l2:surveys" data-no-print />;
}

/* ═══════════════════════════════════════════
   Insights L2 Nav Panel – new export
   ═══════════════════════════════════════════ */
const insightsConfig = {
  sections: [
    { label: "Actions", children: ["Recommendations", "Track progress"] },
    { label: "Analysis", children: ["All signals", "Reviews", "Listings", "Calls"] },
    { label: "Settings", children: ["Categories & keywords", "Birdeye score"] },
  ],
};

export function InsightsL2NavPanel() {
  return <L2NavLayout {...insightsConfig} storageKey="nav:l2:insights" data-no-print />;
}

/* ═══════════════════════════════════════════
   Competitors L2 Nav Panel – new export
   ═══════════════════════════════════════════ */
const competitorsConfig = {
  sections: [
    { label: "Actions", children: ["Recommendations", "Track progress"] },
    { label: "Analysis", children: ["All signals", "Reviews", "Social"] },
    {
      label: "Benchmarking",
      children: [
        "You vs Industry",
        "You vs Peach Tree Dental",
        "You vs Coast Dental",
        "You vs Altima Dental",
        "You vs Tooth Works",
        "You vs White Teeth",
      ],
    },
    { label: "Settings", children: ["Brands & locations", "Categories & keywords", "Birdeye score"] },
  ],
};

export function CompetitorsL2NavPanel() {
  return <L2NavLayout {...competitorsConfig} storageKey="nav:l2:competitors" data-no-print />;
}

/* ═══════════════════════════════════════════
   Appointments L2 Nav Panel – uses L2NavLayout
   ═══════════════════════════════════════════ */
const appointmentsConfig = {
  panelTitle: "Appointments",
  defaultExpandedSections: ["Actions", "Settings"],
  sections: [
    { label: "Actions", children: ["View calendar", "View schedule"] },
    { label: "Settings", children: ["Widget", "Notifications & alerts"] },
  ],
};

export function AppointmentsL2NavPanel() {
  return <L2NavLayout {...appointmentsConfig} storageKey="nav:l2:appointments" data-no-print />;
}

/* ═══════════════════════════════════════════
   Inbox L2 Nav Panel – custom (not using L2NavLayout)
   ═══════════════════════════════════════════ */


const inboxSections = [
  {
    label: "Assignment",
    children: ["Assigned to me", "Assigned to AI Agents", "Assigned to others", "Unassigned", "Spam"],
  },
  {
    label: "Leads",
    children: ["Inquiries", "Missed calls", "Voicemails", "Appointments", "Service inquiry", "Insurance", "Billing", "Lost"],
  },
  {
    label: "Feedback",
    children: ["Reviews", "Surveys"],
  },
  {
    label: "Saved filters",
    children: ["My Filter 1", "My Filter 2", "My Filter 3"],
  },
  {
    label: "Reports",
    children: ["Over time", "Location", "Users", "Channels"],
  },
  {
    label: "Agents",
    children: ["Lead generation agents"],
  },
  {
    label: "Settings",
    children: ["Chatbot", "Receptionist"],
  },
];

const teamSections = [
  {
    label: "Sales Team",
    children: ["Assigned to me", "Assigned to AI Agents", "Assigned to others", "Unassigned", "Spam"],
  },
  {
    label: "Customer Service Team",
    children: ["Assigned to me", "Assigned to AI Agents", "Assigned to others", "Unassigned", "Spam"],
  },
];

export function InboxL2NavPanel() {
  const [activeItem, setActiveItem] = usePersistedState("nav:l2:inbox", "standalone/All messages");

  const activate = (key: string) => setActiveItem(key);

  // Inbox sections: "Assignment" expanded by default
  const [inboxExpanded, setInboxExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(inboxSections.map(s => [s.label, s.label === "Assignment"]))
  );
  // Team sections: all expanded by default
  const [teamExpanded, setTeamExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(teamSections.map(s => [s.label, false]))
  );

  const toggleInbox = (label: string) =>
    setInboxExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  const toggleTeam = (label: string) =>
    setTeamExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const renderChildren = (sectionLabel: string, children: string[], prefix: string) =>
    children.map(child => {
      const key = `${prefix}/${sectionLabel}/${child}`;
      const isActive = activeItem === key;
      return (
        <button
          key={key}
          onClick={() => activate(key)}
          className={isActive ? CHILD_ACTIVE : CHILD_INACTIVE}
          style={{ fontWeight: isActive ? 400 : 300 }}
        >
          {child}
        </button>
      );
    });

  return (
    <div className={PANEL_INBOX_L2} data-no-print>
      <div className="flex-1 overflow-y-auto px-[8px] pt-3 pb-4">

        {/* Header: New message */}
        <button className={`${FOOTER_ROW_CLS} mb-[6px]`} style={{ fontSize: 14 }}>
          <span className="text-[14px]">New message</span>
          <div className={L2_HEADER_PLUS_WRAPPER_BLUE}>
            <Plus
              className={L2_HEADER_PLUS_GLYPH_BLUE}
              strokeWidth={L2_HEADER_PLUS_STROKE_PX}
              absoluteStrokeWidth
              aria-hidden
            />
          </div>
        </button>

        {/* Flat item: All messages */}
        {(() => {
          const key = "standalone/All messages";
          const isActive = activeItem === key;
          return (
            <button
              onClick={() => activate(key)}
              className={isActive ? CHILD_ACTIVE : CHILD_INACTIVE}
              style={{ fontWeight: isActive ? 400 : 300 }}
            >
              All messages
            </button>
          );
        })()}

        {/* Inbox sections */}
        {inboxSections.map(section => (
          <div key={section.label}>
            <button
              onClick={() => toggleInbox(section.label)}
              className={SECTION_HEADER}
              style={{ fontWeight: 400 }}
            >
              <span>{section.label}</span>
              {inboxExpanded[section.label]
                ? <ChevronUp className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
              }
            </button>
            {inboxExpanded[section.label] && renderChildren(section.label, section.children, "inbox")}
          </div>
        ))}

        {/* Internal team chat header */}
        <button className={`${FOOTER_ROW_CLS} mb-[6px]`} style={{ fontSize: 14 }}>
          <span className="text-[14px]">Internal team chat</span>
          <div className={L2_HEADER_PLUS_WRAPPER_BLUE}>
            <Plus
              className={L2_HEADER_PLUS_GLYPH_BLUE}
              strokeWidth={L2_HEADER_PLUS_STROKE_PX}
              absoluteStrokeWidth
              aria-hidden
            />
          </div>
        </button>

        {/* Team sections */}
        {teamSections.map(section => (
          <div key={section.label}>
            <button
              onClick={() => toggleTeam(section.label)}
              className={SECTION_HEADER}
              style={{ fontWeight: 400 }}
            >
              <span>{section.label}</span>
              {teamExpanded[section.label]
                ? <ChevronUp className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-[#888] dark:text-[#6b7280] shrink-0" />
              }
            </button>
            {teamExpanded[section.label] && renderChildren(section.label, section.children, "team")}
          </div>
        ))}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Agents L2 Nav Panel – re-exported from versioned file
   ═══════════════════════════════════════════ */
export { AgentsL2NavPanel } from "./AgentsL2NavPanel";

export { MynaConversationsL2NavPanel } from "./MynaConversationsL2NavPanel";

/* ═══════════════════════════════════════════
   Recommendations L2 Nav Panel
   ═══════════════════════════════════════════ */
const recommendationsL2Config = {
  sections: [
    { label: "Actions", children: ["Recommendations"] },
    { label: "Reports", children: ["Performance"] },
    { label: "Settings", children: ["Preferences"] },
  ],
};

export function RecommendationsL2NavPanel() {
  return <L2NavLayout {...recommendationsL2Config} storageKey="nav:l2:recommendations" data-no-print />;
}

/* ═══════════════════════════════════════════
   Legacy combined Sidebar export (backward compat)
   ═══════════════════════════════════════════ */
interface SidebarProps {
  hideL2Nav?: boolean;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export function Sidebar({ hideL2Nav = false, currentView, onViewChange }: SidebarProps) {
  return (
    <div className="flex h-full shrink-0" data-no-print>
      <IconStrip currentView={currentView} onViewChange={onViewChange} />
      {!hideL2Nav && <L2NavPanel currentView={currentView} onViewChange={onViewChange} />}
    </div>
  );
}
