import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  MoreVertical, CircleCheck, CircleX,
  ChevronDown,
} from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { APP_MAIN_CONTENT_SHELL_CLASS } from '@/app/components/layout/appShellClasses'
import { Button } from '@/app/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu'
import { AppDataTable } from '@/app/components/ui/AppDataTable'
import { useRecStore } from './useRecStore'
import { RecDetailView, RejectConfirmDialog } from './RecDetailView'
import { FilterPane, FilterPaneTriggerButton } from '@/app/components/FilterPane'
import type { FilterItem } from '@/app/components/FilterPanel.v1'
import type { RecStatus, Recommendation, RecCategory } from './recTypes'
import type { BusinessMetrics } from './recTypes'

// ── Asset base path — handles both local dev (/) and GitHub Pages (/contenthub/) ─

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const B: string = (import.meta as any).env?.BASE_URL ?? '/'  // '/' locally, '/contenthub/' on GH Pages

// ── Status tile config ────────────────────────────────────────────────────────

const TILE_CONFIG: {
  tab: RecStatus
  label: string
  iconSrc: string
}[] = [
  { tab: 'pending',   label: 'Pending',   iconSrc: `${B}assets/rec/pending-icon.svg`      },
  { tab: 'accepted',  label: 'Accepted',  iconSrc: `${B}assets/rec/check_circle.svg`      },
  { tab: 'completed', label: 'Completed', iconSrc: `${B}assets/rec/Component 75-1.svg`    },
  { tab: 'rejected',  label: 'Rejected',  iconSrc: `${B}assets/rec/Component 75-2.svg`    },
]

// ── Effort sort order ─────────────────────────────────────────────────────────

const EFFORT_ORDER: Record<Recommendation['effort'], number> = {
  'Quick win':   0,
  'Medium':      1,
  'Bigger lift': 2,
}

// ── Category → metric map ─────────────────────────────────────────────────────

const CATEGORY_METRIC: Partial<Record<RecCategory, { label: string; key: keyof BusinessMetrics }>> = {
  'Content':             { label: 'Citation share',   key: 'citationShare' },
  'Website content':     { label: 'Citation share',   key: 'citationShare' },
  'FAQ':                 { label: 'Citation share',   key: 'citationShare' },
  'Social':              { label: 'Citation share',   key: 'citationShare' },
  'Local SEO':           { label: 'Visibility score', key: 'visibility' },
  'Technical SEO':       { label: 'Visibility score', key: 'visibility' },
  'Website improvement': { label: 'Visibility score', key: 'visibility' },
  'Conversion':          { label: 'Visibility score', key: 'visibility' },
  'Trust & Reputation':  { label: 'Sentiment score',  key: 'sentiment' },
  'Reviews':             { label: 'Sentiment score',  key: 'sentiment' },
}


// ── Props ─────────────────────────────────────────────────────────────────────

interface RecommendationsViewProps {
  onNavigateToContentHub?: (recId: string, recTitle: string, recAeoScore: number, preloadedQuestions?: { question: string; answer: string }[]) => void
  onNavigateToBlogCanvas?: (recId: string, recTitle: string) => void
  initialRecId?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── Filter config ─────────────────────────────────────────────────────────────

const REC_FILTER_ITEMS: FilterItem[] = [
  { id: 'location', label: 'Location', options: ['Dubbo NSW', 'Sydney NSW', 'Melbourne VIC', 'Brisbane QLD', 'Perth WA', 'Adelaide SA', 'Gold Coast QLD', 'Canberra ACT'] },
  { id: 'type',     label: 'Type',     options: ['Local SEO', 'Blog', 'FAQs', 'Conversion', 'Website content', 'Website improvement', 'Reviews', 'Social', 'Trust & Reputation', 'Technical SEO'] },
  { id: 'theme',    label: 'Themes',   options: ['Visibility', 'Citations', 'Sentiment', 'Engagement', 'Local Presence'] },
  { id: 'team',     label: 'Team',     options: ['Unassigned', 'My team', 'External agency'] },
]

const TYPE_DISPLAY_TO_CATEGORY: Record<string, RecCategory> = {
  'Blog': 'Content',
  'FAQs': 'FAQ',
}

const recColumnHelper = createColumnHelper<Recommendation>()

export function RecommendationsView({ onNavigateToContentHub, onNavigateToBlogCanvas, initialRecId }: RecommendationsViewProps) {
  const store = useRecStore()
  const {
    recommendations, metrics, activeTab, setActiveTab,
    rejectRec, acceptRec, completeRec, revertToPending,
  } = store

  const [selectedRecId,   setSelectedRecId]   = useState<string | null>(initialRecId ?? null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [filterItems,     setFilterItems]     = useState<FilterItem[]>(REC_FILTER_ITEMS)
  const [rejectingRecId,  setRejectingRecId]  = useState<string | null>(null)

  // Location popover
  const [showLocPopover,  setShowLocPopover]  = useState(false)
  const [locPopoverPos,   setLocPopoverPos]   = useState({ top: 0, left: 0 })
  const [popoverLocs,     setPopoverLocs]     = useState<string[]>([])
  const chevronRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Status counts
  const counts: Record<RecStatus, number> = {
    pending:     recommendations.filter(r => r.status === 'pending').length,
    accepted:    recommendations.filter(r => r.status === 'accepted').length,
    in_progress: recommendations.filter(r => r.status === 'in_progress').length,
    completed:   recommendations.filter(r => r.status === 'completed').length,
    rejected:    recommendations.filter(r => r.status === 'rejected').length,
  }

  // Filtered list
  const filtered = recommendations.filter(r => {
    if (activeTab !== 'all' && r.status !== activeTab) return false
    const typeFilter = filterItems.find(f => f.id === 'type')?.value
    if (typeFilter) {
      const cat = (TYPE_DISPLAY_TO_CATEGORY[typeFilter] ?? typeFilter) as RecCategory
      if (r.category !== cat) return false
    }
    return true
  })

  function handleChevronEnter(rec: Recommendation) {
    const el = chevronRefs.current[rec.id]
    if (el) {
      const rect = el.getBoundingClientRect()
      setLocPopoverPos({ top: rect.bottom + 6, left: rect.left - 80 })
    }
    const locs = rec.locationNames ?? [`Location 1`]
    setPopoverLocs(locs)
    setShowLocPopover(true)
  }

  // Column definitions
  const columns = useMemo(() => [
    recColumnHelper.accessor('title', {
      id: 'recommendation',
      header: 'Recommendations',
      meta: { settingsLabel: 'Recommendations' },
      size: 25,
      sortingFn: 'alphanumeric',
      cell: ({ row }) => (
        <p className="text-[14px] text-foreground leading-[22px] font-normal group-hover/table-row:text-primary transition-colors pr-4 whitespace-normal">
          {row.original.title}
        </p>
      ),
    }),
    recColumnHelper.accessor('category', {
      id: 'type',
      header: 'Type',
      meta: { settingsLabel: 'Type' },
      size: 10,
      sortingFn: 'alphanumeric',
      cell: ({ row }) => {
        const CATEGORY_DISPLAY: Partial<Record<string, string>> = {
          FAQ: 'FAQs',
          Content: 'Blog',
        };
        const label = CATEGORY_DISPLAY[row.original.category] ?? row.original.category;
        return (
          <span className="text-[14px] text-foreground font-normal whitespace-nowrap">
            {label}
          </span>
        );
      },
    }),
    recColumnHelper.accessor(row => EFFORT_ORDER[row.effort], {
      id: 'impact',
      header: 'Impact',
      meta: { settingsLabel: 'Impact' },
      size: 45,
      sortingFn: 'basic',
      cell: ({ row }) => (
        <div className="flex items-start gap-2 pr-4">
          {/* Always reserve 16px for icon so text aligns regardless of effort level */}
          <div className="w-4 h-4 flex-shrink-0 mt-0.5">
            {row.original.effort === 'Quick win' && (
              <img src={`${B}assets/rec/electric_bolt.svg`} alt="" className="w-4 h-4" />
            )}
            {row.original.effort === 'Bigger lift' && (
              <img src={`${B}assets/rec/lead.svg`} alt="" className="w-4 h-4" />
            )}
          </div>
          <p className="text-[14px] text-foreground leading-[22px] font-normal line-clamp-3 whitespace-normal">
            {row.original.description}
          </p>
        </div>
      ),
    }),
    recColumnHelper.accessor(row => {
      const meta = CATEGORY_METRIC[row.category]
      return row.youScore !== undefined ? row.youScore : (meta ? (metrics[meta.key] as number) : 0)
    }, {
      id: 'youVsCompetitor',
      header: 'You vs competitor',
      meta: { settingsLabel: 'You vs competitor' },
      size: 10,
      sortingFn: 'basic',
      cell: ({ row }) => {
        const rec = row.original
        const meta = CATEGORY_METRIC[rec.category]
        const metricLabel = meta?.label ?? 'Score'
        const youScore = rec.youScore !== undefined ? rec.youScore : (meta ? (metrics[meta.key] as number) : 0)
        const compScore = rec.compScore ?? 0
        return (
          <div className="flex flex-col gap-0.5 min-w-0 pr-4">
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-foreground font-normal leading-[20px] whitespace-nowrap">
                {youScore.toFixed(1)}%
              </span>
              <span className="text-[14px] text-muted-foreground font-normal leading-[20px]">|</span>
              <span className="text-[14px] text-foreground font-normal leading-[20px] whitespace-nowrap">
                {compScore.toFixed(1)}%
              </span>
            </div>
            <span className="text-[12px] text-muted-foreground font-normal leading-[16px]">
              {metricLabel}
            </span>
          </div>
        )
      },
    }),
    recColumnHelper.accessor(row => row.locations ?? 1, {
      id: 'locations',
      header: 'Locations',
      meta: { settingsLabel: 'Locations' },
      size: 10,
      enableResizing: false,
      sortingFn: 'basic',
      cell: ({ row }) => {
        const rec = row.original
        const locationCount = rec.locations ?? 1
        return (
          <div
            className="flex items-center justify-between h-full w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Count + chevron */}
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-foreground leading-[22px]">{locationCount}</span>
              <button
                ref={el => { chevronRefs.current[rec.id] = el }}
                className="flex items-center justify-center w-8 h-8 hover:bg-muted rounded transition-colors"
                onClick={e => { e.stopPropagation(); handleChevronEnter(rec) }}
                onMouseEnter={() => handleChevronEnter(rec)}
                onMouseLeave={() => setTimeout(() => setShowLocPopover(false), 200)}
              >
                <ChevronDown size={14} strokeWidth={2} className="text-foreground" />
              </button>
            </div>
            {/* CTA buttons — right-aligned, 40px from column right edge, 8px gap, 36×36px */}
            <div className="flex items-center gap-2 pr-10 opacity-0 group-hover/table-row:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/table-row:pointer-events-auto flex-shrink-0">
              <button
                title="Reject"
                className="flex items-center justify-center w-9 h-9 hover:bg-muted rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                onClick={e => { e.stopPropagation(); setRejectingRecId(rec.id) }}
              >
                <CircleX size={18} strokeWidth={1.6} absoluteStrokeWidth />
              </button>
              <button
                title="Accept"
                className="flex items-center justify-center w-9 h-9 hover:bg-muted rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                onClick={e => { e.stopPropagation(); acceptRec(rec.id, 'self') }}
              >
                <CircleCheck size={18} strokeWidth={1.6} absoluteStrokeWidth />
              </button>
            </div>
          </div>
        )
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [metrics, rejectRec, acceptRec])

  // Selected rec
  const selectedRec = selectedRecId ? recommendations.find(r => r.id === selectedRecId) ?? null : null

  if (selectedRec) {
    return (
      <div className={cn(APP_MAIN_CONTENT_SHELL_CLASS)}>
        <RecDetailView
          rec={selectedRec}
          metrics={metrics}
          onBack={() => setSelectedRecId(null)}
          onAccept={(id) => {
            acceptRec(id, 'self')
          }}
          onReject={(id) => {
            rejectRec(id)
          }}
          onNavigateToContentHub={
            onNavigateToContentHub
              ? (questions) => {
                  if (selectedRec.status === 'pending') acceptRec(selectedRec.id, 'self')
                  const aeoScore = selectedRec.aeoScore?.you ?? 92
                  onNavigateToContentHub(selectedRec.id, selectedRec.title, aeoScore, questions)
                }
              : undefined
          }
          onNavigateToBlogCanvas={
            onNavigateToBlogCanvas
              ? () => {
                  if (selectedRec.status === 'pending') acceptRec(selectedRec.id, 'self')
                  onNavigateToBlogCanvas(selectedRec.id, selectedRec.title)
                }
              : undefined
          }
          onCompleteRec={(id) => completeRec(id)}
          onRevertToPending={(id) => revertToPending(id)}
        />
      </div>
    )
  }

  return (
    <div className={cn(APP_MAIN_CONTENT_SHELL_CLASS)}>
      {/* ── Flex row: main content column + full-height filter pane ─────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main content column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

          {/* ── Page header ──────────────────────────────────────────────── */}
          <div className="flex-shrink-0 h-16 flex items-center px-6 gap-2 bg-background">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-[18px] font-normal text-foreground tracking-[-0.36px] leading-[26px] whitespace-nowrap">
                Recommendations
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" aria-label="More options">
                    <MoreVertical className="size-4" strokeWidth={1.6} absoluteStrokeWidth aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Download</DropdownMenuItem>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <FilterPaneTriggerButton open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
            </div>
          </div>

          {/* ── Status tiles ─────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-6">
            <div className="flex">
              {TILE_CONFIG.map(tile => {
                const isSelected = activeTab === tile.tab
                const n = counts[tile.tab]
                return (
                  <button
                    key={tile.tab}
                    onClick={() => setActiveTab(tile.tab)}
                    className={cn(
                      'flex-1 flex flex-col items-start px-4 pt-4 pb-4 text-left transition-colors',
                      isSelected ? 'bg-primary/[0.06]' : 'hover:bg-muted/30',
                    )}
                  >
                    <span className={cn(
                      'text-[32px] leading-[48px] font-normal tracking-[-0.64px] block',
                      isSelected ? 'text-primary' : 'text-foreground',
                    )}>
                      {n}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <img src={tile.iconSrc} alt="" className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[14px] text-foreground leading-[20px] tracking-[-0.28px] font-normal">
                        {tile.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Table ────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <p className="text-[14px]">No recommendations match the current filters.</p>
              </div>
            ) : (
              <div className="mt-5">
                <AppDataTable<Recommendation>
                  tableId="recommendations.list.v1"
                  data={filtered}
                  columns={columns}
                  initialSorting={[{ id: 'impact', desc: false }]}
                  getRowId={r => r.id}
                  onRowClick={rec => setSelectedRecId(rec.id)}
                  scrollableBody={false}
                  rowDensity="default"
                  stickyFirstColumn={false}
                  fillWidth={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Full-height filter pane — sibling to main content column */}
        <FilterPane
          initialFilters={REC_FILTER_ITEMS}
          open={filterPanelOpen}
          onOpenChange={setFilterPanelOpen}
          onFiltersChange={setFilterItems}
          motion="static"
          dock="right"
        />
      </div>

      {/* Location popover portal */}
      {showLocPopover && createPortal(
        <div
          className="fixed z-[9999] bg-background rounded-lg shadow-lg border border-border w-56 py-2"
          style={{ top: locPopoverPos.top, left: locPopoverPos.left }}
          onMouseEnter={() => setShowLocPopover(true)}
          onMouseLeave={() => setShowLocPopover(false)}
        >
          <p className="px-3 pt-1 pb-2 text-[11px] text-muted-foreground font-medium tracking-[0.4px] uppercase">
            Locations covered
          </p>
          <ul className="max-h-52 overflow-y-auto">
            {popoverLocs.map(loc => (
              <li key={loc} className="px-3 py-1.5 hover:bg-muted/50">
                <span className="text-[13px] text-foreground leading-[18px]">{loc}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}

      {/* Reject confirmation dialog — same dialog as detail view */}
      {rejectingRecId && (
        <RejectConfirmDialog
          onCancel={() => setRejectingRecId(null)}
          onConfirm={() => {
            rejectRec(rejectingRecId)
            setRejectingRecId(null)
          }}
        />
      )}
    </div>
  )
}
