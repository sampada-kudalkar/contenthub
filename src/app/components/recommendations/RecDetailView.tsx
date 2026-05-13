import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ArrowLeft, Sparkles, X, Copy, Check, ChevronDown, ChevronUp, CheckCircle2, Info, MoreVertical } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Recommendation, BusinessMetrics, AeoSubScore, RecStatus } from './recTypes'

// ── helpers ───────────────────────────────────────────────────────────────────

type MetricsKey = 'citationShare' | 'visibility' | 'sentiment'

function getMetricForCategory(category: string): { label: string; key: MetricsKey } {
  if (['Content', 'Website content', 'FAQ', 'Social'].includes(category)) {
    return { label: 'Citation share', key: 'citationShare' }
  }
  if (['Local SEO', 'Technical SEO', 'Website improvement', 'Conversion'].includes(category)) {
    return { label: 'Visibility score', key: 'visibility' }
  }
  return { label: 'Sentiment score', key: 'sentiment' }
}

// ── Default AEO sub-scores (fallback when not in data) ────────────────────────

// Weighted sums: You = 89×10.2+94×16.3+91×8.5+90×30.5+96×11.5+93×22.9 ≈ 92
//                Comp = 77×10.2+79×16.3+85×8.5+82×30.5+82×11.5+82×22.9 ≈ 81
const DEFAULT_BLOG_SUBSCORES: AeoSubScore[] = [
  { name: 'Readability',             weight: 10.2, you: 89, competitor: 77, delta: 12 },
  { name: 'Content freshness',       weight: 16.3, you: 94, competitor: 79, delta: 15 },
  { name: 'Click-through structure', weight: 8.5,  you: 91, competitor: 85, delta:  6 },
  { name: 'Information density',     weight: 30.5, you: 90, competitor: 82, delta:  8 },
  { name: 'Machine readability',     weight: 11.5, you: 96, competitor: 82, delta: 14 },
  { name: 'Answerability signals',   weight: 22.9, you: 93, competitor: 82, delta: 11 },
]

const DEFAULT_FAQ_SUBSCORES: AeoSubScore[] = [
  { name: 'Brand voice',          weight: 30,   you: 96, competitor: 75, delta: 21 },
  { name: 'Factual accuracy',     weight: 30,   you: 95, competitor: 78, delta: 17 },
  { name: 'Content readability',  weight: 25,   you: 94, competitor: 72, delta: 22 },
  { name: 'Originality',          weight: 15,   you: 93, competitor: 65, delta: 28 },
]

// ── AEO score box (mini, in-card thumbnail) ───────────────────────────────────

function AeoScoreBox({ score }: { score: number }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const pct = Math.min(score, 100) / 100
  return (
    <div className="bg-background border border-border rounded p-2 flex flex-col gap-1 items-start flex-shrink-0">
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(270deg)' }} className="flex-shrink-0">
          <circle cx="10" cy="10" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
          <circle cx="10" cy="10" r={r} fill="none" stroke="#4cae3d" strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
        </svg>
        <span className="text-[16px] leading-[24px] font-normal" style={{ color: '#4cae3d' }}>{score}</span>
        <span className="text-[14px] text-muted-foreground leading-[20px]">/100</span>
      </div>
      <p className="text-[12px] text-foreground leading-normal whitespace-nowrap">AEO content score</p>
    </div>
  )
}

// ── AEO Score left panel (screenshot-accurate style) ─────────────────────────
// Matches the design: large number, "AEO Content score" label, progress bar with
// "You" pill, then sub-score rows (name + weight label + score/100).

interface AeoLeftPanelProps {
  score: number
  subScores: AeoSubScore[]
  /** When true, bar + pill use red (low/gap score). Default = high/green. */
  lowScore?: boolean
}

function AeoLeftPanel({ score, subScores, lowScore = false }: AeoLeftPanelProps) {
  const scoreColor = lowScore ? 'text-primary' : 'text-[#3d9e4a]'

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {/* Large score number */}
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-[32px] font-normal leading-[44px]', scoreColor)}>{score}</span>
        <span className="text-[15px] text-muted-foreground font-medium leading-[32px]">/ 100</span>
      </div>

      {/* Label + info icon */}
      <div className="flex items-center gap-1.5 -mt-2">
        <span className="text-[14px] text-muted-foreground font-normal leading-[20px]">AEO Content score</span>
        <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-muted-foreground leading-none">?</span>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Sub-score breakdown — name + "Weights: X.X" + score/100 */}
      <div className="flex flex-col">
        {subScores.map((sub, i) => (
          <div key={sub.name}>
            <div className="flex items-start justify-between gap-2 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-foreground font-medium leading-[18px]">{sub.name}</span>
                <span className="text-[12px] text-muted-foreground leading-[16px]">
                  Weights: {typeof sub.weight === 'number' && sub.weight < 1
                    ? (sub.weight * 100).toFixed(1)
                    : sub.weight}
                </span>
              </div>
              <div className="flex items-baseline gap-0.5 flex-shrink-0">
                <span className="text-[14px] text-foreground font-semibold leading-none">{sub.you}</span>
                <span className="text-[12px] text-muted-foreground leading-none">/100</span>
              </div>
            </div>
            {i < subScores.length - 1 && <div className="border-t border-border" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
      {copied
        ? <Check size={13} strokeWidth={1.6} absoluteStrokeWidth className="text-primary" />
        : <Copy size={13} strokeWidth={1.6} absoluteStrokeWidth />}
    </button>
  )
}

// ── Blog Preview Modal ────────────────────────────────────────────────────────

interface BlogPreviewModalProps {
  rec: Recommendation
  onClose: () => void
  onAccept: () => void
  onNavigateToBlogCanvas?: () => void
  status: RecStatus
}

type DynSection = { heading?: string; body?: string; listItems?: string[]; image?: string; imageAlt?: string }

function BlogPreviewModal({ rec, onClose, onAccept, onNavigateToBlogCanvas, status }: BlogPreviewModalProps) {
  const aeoScore  = rec.aeoScore?.you ?? 98
  const subScores = rec.aeoScore?.subScores ?? DEFAULT_BLOG_SUBSCORES
  const metaTitle = rec.title
  const metaDesc  = rec.description.slice(0, 155)
  const slug      = rec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const dynamicSections: DynSection[] | null = (() => {
    try { return rec.generatedAsset?.fullContent ? JSON.parse(rec.generatedAsset.fullContent) : null } catch { return null }
  })()

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
      style={{ backgroundColor: 'rgba(33,33,33,0.64)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded shadow-[0px_4px_8px_0px_rgba(33,33,33,0.18)] flex flex-col overflow-hidden mt-12 mb-12"
        style={{ width: 1200, maxWidth: 'calc(100vw - 48px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background rounded-t">
          <span className="text-[16px] text-foreground font-normal leading-[24px]">Preview blog</span>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={onNavigateToBlogCanvas ?? onAccept} className="h-9 px-4 text-[14px]">
              {(status === 'accepted' || status === 'in_progress') ? 'Edit blog' : 'Accept and edit blog'}
            </Button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors">
              <X size={16} strokeWidth={2} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Modal body: two columns */}
        <div className="flex gap-5 px-5 pb-5 pt-5 min-h-0" style={{ maxHeight: 'calc(90vh - 64px)' }}>
          {/* Left panel: AEO scores */}
          <div className="w-[360px] flex-shrink-0 border border-border rounded-lg overflow-y-auto bg-background">
            <AeoLeftPanel score={aeoScore} subScores={subScores} lowScore={false} />
          </div>

          {/* Right panel: real blog layout */}
          <div className="flex-1 min-w-0 border border-border rounded-lg overflow-y-auto flex flex-col">

            {/* Hero banner */}
            <div className="relative flex-shrink-0 h-[180px] overflow-hidden flex items-end"
                 style={{ background: 'linear-gradient(135deg, #0f2540 0%, #1a3d6b 50%, #15543a 100%)' }}>
              {/* Subtle grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.07 }}>
                <defs>
                  <pattern id="blog-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#blog-grid)" />
              </svg>
              {/* Category chip */}
              <div className="absolute top-4 left-6">
                <span className="text-[10px] text-white/70 uppercase tracking-[0.8px] font-medium bg-white/10 px-2 py-1 rounded">
                  Content strategy
                </span>
              </div>
              <div className="relative z-10 px-8 pb-8">
                <h1 className="text-[28px] text-white font-semibold leading-[36px] max-w-[520px]">
                  {rec.title}
                </h1>
              </div>
            </div>

            {/* Author / meta row */}
            <div className="flex items-center gap-3 px-8 py-3 border-b border-border flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] text-primary-foreground font-semibold flex-shrink-0">
                B
              </div>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="text-foreground font-medium">Birdeye AI</span>
                <span>·</span>
                <span>May 2025</span>
                <span>·</span>
                <span>6 min read</span>
              </div>
              <div className="ml-auto">
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  AI-generated
                </span>
              </div>
            </div>

            {/* Article body */}
            <article className="flex flex-col gap-8 flex-1" style={{ paddingLeft: 50, paddingRight: 37, paddingTop: 38, paddingBottom: 24 }}>

              {dynamicSections ? (
                dynamicSections.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    {s.heading && <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">{s.heading}</h2>}
                    {s.body && <p className="text-[14px] text-foreground leading-[24px]">{s.body}</p>}
                    {s.listItems && s.listItems.length > 0 && (
                      <ul className="flex flex-col gap-2 mt-1">
                        {s.listItems.map((item, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-[14px] text-foreground leading-[22px]">
                            <span className="mt-[9px] w-[4px] h-[4px] rounded-full bg-primary flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.image && (
                      <div className="w-full rounded-xl overflow-hidden flex-shrink-0 mt-2" style={{ height: 200 }}>
                        <img src={s.image} alt={s.imageAlt ?? s.heading ?? ''} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <p className="text-[15px] text-foreground leading-[26px]">{rec.description}</p>
                  <div className="w-full rounded-xl overflow-hidden flex-shrink-0" style={{ height: 200 }}>
                    <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=200&fit=crop&crop=center&q=80" alt="Suburban property exterior" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-3 text-center">Suburb-level pages signal geographic precision to AI retrieval systems</p>
                  <div className="flex flex-col gap-2 pt-1">
                    <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">Why location-specific pages win more AI citations</h2>
                    <p className="text-[14px] text-foreground leading-[24px]">Search AI platforms — including ChatGPT, Gemini, and Perplexity — surface results that are geographically precise. Competitors who publish suburb-level pages are capturing citation share you're currently missing.</p>
                  </div>
                  <div className="border-l-[3px] border-primary bg-primary/5 pl-4 pr-4 py-3 rounded-r-lg">
                    <p className="text-[14px] text-foreground leading-[22px] italic">"AI models cite pages that directly answer hyper-local queries. A suburb-level service page converts 3× better than a city-level equivalent."</p>
                    <p className="text-[12px] text-muted-foreground mt-1.5">— Birdeye Search AI analysis, 2025</p>
                  </div>
                  <div className="w-full rounded-xl overflow-hidden flex-shrink-0" style={{ height: 200 }}>
                    <img src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&h=200&fit=crop&crop=center&q=80" alt="Real estate agent" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-2 pt-1 pb-2">
                    <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">Getting started</h2>
                    <p className="text-[14px] text-foreground leading-[24px]">Review the AI-generated draft, customise the tone to match your agency's voice, and publish it to your website.</p>
                  </div>
                </>
              )}
            </article>

            {/* SEO metadata */}
            <div className="border-t border-border px-8 py-5 flex-shrink-0 flex flex-col gap-3 bg-muted/30">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-none">SEO metadata</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2 bg-background border border-border rounded px-3 py-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none">Meta title</span>
                    <span className="text-[13px] text-foreground leading-[20px] mt-1">{metaTitle}</span>
                  </div>
                  <CopyButton text={metaTitle} />
                </div>
                <div className="flex items-start justify-between gap-2 bg-background border border-border rounded px-3 py-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none">Meta description</span>
                    <span className="text-[13px] text-foreground leading-[20px] mt-1">{metaDesc}</span>
                  </div>
                  <CopyButton text={metaDesc} />
                </div>
                <div className="flex items-center justify-between gap-2 bg-background border border-border rounded px-3 py-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none">Slug</span>
                    <span className="text-[13px] text-muted-foreground leading-[20px] mt-1 font-mono">{slug}</span>
                  </div>
                  <CopyButton text={slug} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── FAQ Preview Modal ─────────────────────────────────────────────────────────

interface FAQPreviewModalProps {
  rec: Recommendation
  onClose: () => void
  onNavigateToContentHub?: (questions: { question: string; answer: string }[]) => void
  status: RecStatus
}

interface FAQItem {
  question: string
  answer: string
}

const FAQ_ITEMS_PROPERTY_APPRAISAL: FAQItem[] = [
  {
    question: 'What is a property appraisal and why do I need one?',
    answer: 'A property appraisal is a professional assessment of your property\'s current market value based on comparable sales, location, condition, and local demand. In Dubbo, it\'s the essential first step before listing — it helps you price competitively and avoid leaving money on the table.',
  },
  {
    question: 'How much does a property appraisal in Dubbo cost?',
    answer: 'A standard market appraisal from a local agency is typically free of charge — it\'s part of the service we offer to help you understand your property\'s value before you commit to selling or renting. Formal bank valuations, ordered by lenders, carry a separate fee usually between $300–$600.',
  },
  {
    question: 'How long does a property appraisal take?',
    answer: 'An in-person appraisal walk-through generally takes 20–40 minutes. Following the inspection, you\'ll receive a written report within 24–48 hours that outlines the estimated market value, comparable sales data, and our recommended listing strategy.',
  },
  {
    question: 'What factors affect my property\'s value in Dubbo?',
    answer: 'Key factors include land size, number of bedrooms and bathrooms, build quality, recent renovations, proximity to Dubbo schools and the CBD, street appeal, and recent sales of comparable homes in your suburb. Regional economic conditions and interest rate movements also play a role.',
  },
  {
    question: 'How does a Dubbo market appraisal differ from a formal valuation?',
    answer: 'A market appraisal is an agent\'s expert opinion of likely sale price — it\'s free and non-binding. A formal valuation is a certified report prepared by a licensed valuer, often required by banks for mortgage purposes. Both use comparable sales data, but only a formal valuation carries legal weight for lending decisions.',
  },
  {
    question: 'Can I use a property appraisal to set my listing price?',
    answer: 'Yes — and you should. Our appraisal gives you a realistic price range based on what buyers in Dubbo are actually paying right now. Pricing within or slightly below the appraised range typically attracts more enquiries and can lead to stronger competition at auction or during private treaty negotiations.',
  },
  {
    question: 'How often should I get my property appraised?',
    answer: 'The Dubbo market moves, so we recommend a fresh appraisal every 12–18 months if you\'re considering selling or refinancing. If there have been significant infrastructure announcements, new developments nearby, or you\'ve completed renovations, an updated appraisal sooner makes sense.',
  },
  {
    question: 'What should I prepare before an appraisal appointment?',
    answer: 'Gather any recent council rates notices (for land size confirmation), a list of improvements and their approximate costs, and any strata or body corporate documents if applicable. Presenting a clean, decluttered property allows our appraiser to assess it at its best.',
  },
  {
    question: 'Will renovations increase my appraisal value?',
    answer: 'They can, but not all renovations deliver equal returns in Dubbo. Kitchen and bathroom updates, fresh paint, new flooring, and improved street appeal tend to yield the strongest uplift. Highly personalised or overcapitalised improvements may not be fully reflected in the appraised value.',
  },
  {
    question: 'How do I choose the right agency for a Dubbo property appraisal?',
    answer: 'Look for an agency with a proven track record of sales in your specific suburb, local market knowledge, transparent communication, and verifiable results. Ask about their average days on market and sale-to-appraisal ratio — these numbers tell you whether their estimates are realistic or optimistic.',
  },
]

function FAQPreviewModal({ rec, onClose, onNavigateToContentHub, status }: FAQPreviewModalProps) {
  const aeoScore = rec.aeoScore?.you ?? 95
  const subScores = rec.aeoScore?.subScores ?? DEFAULT_FAQ_SUBSCORES
  const asset = rec.generatedAsset
  const [expandedIdx, setExpandedIdx] = useState<number>(0)

  const faqItems: FAQItem[] = asset?.fullContent
    ? [{ question: asset.title, answer: asset.fullContent }]
    : FAQ_ITEMS_PROPERTY_APPRAISAL

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
      style={{ backgroundColor: 'rgba(33,33,33,0.64)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded shadow-[0px_4px_8px_0px_rgba(33,33,33,0.18)] flex flex-col overflow-hidden mt-12 mb-12"
        style={{ width: 1200, maxWidth: 'calc(100vw - 48px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background rounded-t">
          <div className="flex items-center gap-2">
            <img src="/assets/rec/ai-agent.svg" alt="" className="w-4 h-4 flex-shrink-0" />
            <span className="text-[16px] text-foreground font-normal leading-[24px]">Preview FAQ set</span>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToContentHub && (
              <Button
                size="sm"
                className="h-9 px-4 text-[14px]"
                onClick={() => {
                  if (status === 'pending') {
                    toast.success('Recommendation accepted', {
                      duration: 5000,
                      icon: <CheckCircle2 size={20} strokeWidth={1.6} absoluteStrokeWidth className="text-green-600" />,
                    })
                  }
                  onClose()
                  onNavigateToContentHub(faqItems)
                }}
              >
                {(status === 'accepted' || status === 'in_progress') ? 'Edit FAQs' : 'Accept and edit FAQ'}
              </Button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors">
              <X size={16} strokeWidth={2} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Modal body: two columns */}
        <div className="flex gap-5 px-5 pb-5 pt-5 min-h-0" style={{ maxHeight: 'calc(90vh - 64px)' }}>
          {/* Left panel: AEO score + breakdown */}
          <div className="w-[360px] flex-shrink-0 border border-border rounded-lg overflow-y-auto bg-background">
            <AeoLeftPanel score={aeoScore} subScores={subScores} lowScore={false} />
          </div>

          {/* Right panel: FAQ Q&A accordion */}
          <div className="flex-1 min-w-0 border border-border rounded-lg overflow-y-auto flex flex-col gap-6" style={{ paddingLeft: 50, paddingRight: 37, paddingTop: 38, paddingBottom: 24 }}>
            <div className="flex flex-col gap-1">
              <h1 className="text-[18px] text-foreground font-normal leading-[28px]">{asset?.title ?? rec.title}</h1>
              <p className="text-[13px] text-muted-foreground leading-[20px]">AI-generated FAQ set · {faqItems.length} questions</p>
            </div>

            {/* FAQ accordion */}
            <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
              {faqItems.map((faq, i) => {
                const isOpen = expandedIdx === i
                return (
                  <div key={i}>
                    <button
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedIdx(isOpen ? -1 : i)}
                    >
                      <p className="text-[13px] text-foreground font-normal leading-[20px]">
                        <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                        {faq.question}
                      </p>
                      <ChevronDown
                        size={15}
                        strokeWidth={1.6}
                        absoluteStrokeWidth
                        className={cn('flex-shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 bg-muted/20">
                        <p className="text-[13px] text-foreground leading-[22px]">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Schema note */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-2">
              <Sparkles size={14} strokeWidth={1.6} absoluteStrokeWidth className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-foreground leading-[18px]">
                JSON-LD schema markup is automatically generated and ready to embed in your website's <code className="text-primary text-[11px] bg-primary/10 px-1 py-0.5 rounded">&lt;head&gt;</code> for maximum AI platform coverage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Score card ────────────────────────────────────────────────────────────────

function ScoreCard({ rec, metrics }: { rec: Recommendation; metrics: BusinessMetrics }) {
  const { label: metricLabel, key: metricsKey } = getMetricForCategory(rec.category)
  const current = rec.youScore !== undefined ? rec.youScore : metrics[metricsKey]
  const compPct = rec.compScore !== undefined ? rec.compScore : 50
  const yourW = Math.min(current, 100)
  const compW = Math.min(compPct, 100)

  return (
    <div className="bg-background border border-border rounded-lg p-5 flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-0.5">
        <p className="text-[16px] text-foreground font-normal leading-[24px]">
          What is your {metricLabel}
        </p>
        <p className="text-[12px] text-muted-foreground leading-[18px]">You vs competitor average</p>
      </div>

      {/* Scores — 40px gap, both left-aligned, legend dot paired below each number */}
      <div className="flex items-start gap-10 mt-2">
        <div className="flex flex-col gap-1">
          <p className="text-[32px] font-normal text-foreground leading-[48px] tracking-[-0.64px]">{current.toFixed(1)}%</p>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            Current score
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[32px] font-normal text-foreground leading-[48px] tracking-[-0.64px]">{compPct.toFixed(1)}%</p>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
            Competitor average
          </span>
        </div>
      </div>

      {/* Progress bar — blue (your score) then red (competitor gap) then gray track */}
      <div className="relative h-[6px] bg-muted rounded-full">
        <div className="absolute left-0 top-0 h-full bg-destructive rounded-full" style={{ width: `${compW}%` }} />
        <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${yourW}%` }} />
        <div className="absolute top-1/2 w-[9px] h-[9px] bg-primary rounded-full border-2 border-background shadow-sm" style={{ left: `${yourW}%`, transform: 'translate(-50%, -50%)' }} />
        <div className="absolute top-1/2 w-3 h-3 bg-destructive rounded-full border-2 border-background shadow-sm" style={{ left: `${compW}%`, transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  )
}

// ── Blog preview box ──────────────────────────────────────────────────────────

interface BlogPreviewBoxProps {
  rec: Recommendation
  aeoScore: number
  onOpenClick?: () => void
  onAccept?: () => void
}

function BlogPreviewBox({ rec, aeoScore, onOpenClick, onAccept }: BlogPreviewBoxProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg p-3 cursor-pointer"
      style={{ background: '#f9f7fd' }}
      onClick={onOpenClick}
    >
      <img
        src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=120&h=120&fit=crop&crop=center&q=80"
        alt=""
        className="w-[60px] h-[60px] object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex flex-1 min-w-0 flex-col gap-0.5 justify-center">
        <div className="flex items-center gap-1">
          <img src="/assets/rec/ai-agent.svg" alt="" className="w-3 h-3 flex-shrink-0" />
          <span className="text-[12px] leading-[18px]" style={{ color: '#6834B7' }}>AI draft ready</span>
        </div>
        <p className="text-[14px] text-foreground leading-[20px] font-normal truncate">{rec.title}</p>
        <p className="text-[12px] text-muted-foreground leading-[18px] flex items-baseline gap-1 min-w-0">
          <span className="truncate">{rec.description}</span>
          {onOpenClick && (
            <span className="text-primary hover:underline font-normal whitespace-nowrap shrink-0">
              View blog
            </span>
          )}
        </p>
      </div>
      <AeoScoreBox score={aeoScore} />
    </div>
  )
}

// ── FAQ preview box ───────────────────────────────────────────────────────────

interface FAQPreviewBoxProps {
  rec: Recommendation
  onPreviewClick?: () => void
  onNavigateToContentHub?: (questions: { question: string; answer: string }[]) => void
}

function FAQPreviewBox({ rec, onPreviewClick, onNavigateToContentHub }: FAQPreviewBoxProps) {
  const aeoScore = rec.aeoScore?.you ?? 95
  // Title: use shortAction if available (e.g. "Add rental FAQ section"), else rec title — append " draft"
  const draftTitle = `${rec.shortAction ?? rec.title} draft`

  return (
    <div
      className="flex items-start gap-3 rounded-lg p-3 cursor-pointer"
      style={{ background: '#f9f7fd' }}
      onClick={onPreviewClick}
    >
      <div className="flex flex-1 min-w-0 flex-col gap-0.5 justify-center">
        <div className="flex items-center gap-1">
          <img src="/assets/rec/ai-agent.svg" alt="" className="w-3 h-3 flex-shrink-0" />
          <span className="text-[12px] leading-[18px]" style={{ color: '#6834B7' }}>AI draft ready</span>
        </div>
        <p className="text-[14px] text-foreground leading-[20px] font-normal truncate">{draftTitle}</p>
        <p className="text-[12px] text-muted-foreground leading-[18px] flex items-baseline gap-1 min-w-0">
          <span className="truncate">We&apos;ve created a FAQ section draft based on what&apos;s working for competitors. Review and publish on your website.</span>
          {onPreviewClick && (
            <span className="text-primary hover:underline font-normal whitespace-nowrap shrink-0">
              View FAQs
            </span>
          )}
        </p>
      </div>
      <AeoScoreBox score={aeoScore} />
    </div>
  )
}

// ── Stepper ───────────────────────────────────────────────────────────────────

interface Step {
  label: string
  description: string
  cta?: { label: string; onClick: () => void }
}

function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="pb-2">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1
        return (
          <div key={idx} className="flex gap-3 items-stretch px-5">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-5 h-5 border border-border rounded-full flex items-center justify-center text-[11px] text-muted-foreground leading-none flex-shrink-0 bg-background mt-0.5">
                {idx + 1}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className={cn('flex flex-col flex-1 min-w-0 pt-0.5', !isLast ? 'pb-5' : 'pb-1')}>
              <p className="text-[14px] text-foreground leading-[22px]">{step.label}</p>
              <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">{step.description}</p>
              {step.cta && (
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={step.cta.onClick} className="h-8 text-[13px]">
                    {step.cta.label}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Need Help banner ──────────────────────────────────────────────────────────

function NeedHelpBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="flex items-center justify-between gap-4 mx-6 mb-4 mt-2 px-4 py-3 bg-primary/[0.06] rounded-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Info size={14} strokeWidth={1.6} absoluteStrokeWidth className="text-primary flex-shrink-0" />
        <span className="text-[12px] text-muted-foreground leading-[18px]">
          Need help with implementation? Our team will make the updates for you on your website.
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="text-[14px] text-primary font-normal whitespace-nowrap hover:underline">
          Implement for me
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
        >
          <X size={12} strokeWidth={2} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// ── Content/Blog detail ───────────────────────────────────────────────────────

interface ContentDetailProps {
  rec: Recommendation
  metrics: BusinessMetrics
  onAccept: () => void
  onNavigateToBlogCanvas?: () => void
}

function ContentDetail({ rec, metrics, onAccept, onNavigateToBlogCanvas }: ContentDetailProps) {
  const [showBlogPreview, setShowBlogPreview] = useState(false)
  const aeoScore = rec.aeoScore?.you ?? 92
  const topComp = rec.competitors[0]

  const isRejectedOrCompleted = rec.status === 'rejected' || rec.status === 'completed' || rec.status === 'in_progress'

  const steps: Step[] = [
    {
      label: 'Review your Search AI-generated blog',
      description: 'Read through the draft. Change any details, prices, or tone to match your voice',
      cta: isRejectedOrCompleted
        ? undefined
        : { label: 'Review blog', onClick: () => setShowBlogPreview(true) },
    },
    {
      label: rec.status === 'accepted' || rec.status === 'completed' || rec.status === 'in_progress'
        ? 'Publish to your website'
        : 'Accept and publish to your website',
      description: 'Publish to your website to boost Search AI score',
    },
    {
      label: 'Mark it as complete after publishing',
      description: 'Mark this task as complete to observe your progress in Search AI score',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {showBlogPreview && (
        <BlogPreviewModal
          rec={rec}
          onClose={() => setShowBlogPreview(false)}
          onAccept={() => { setShowBlogPreview(false); onAccept() }}
          onNavigateToBlogCanvas={onNavigateToBlogCanvas ? () => { setShowBlogPreview(false); onNavigateToBlogCanvas() } : undefined}
          status={rec.status}
        />
      )}

      {/* Score + why it matters */}
      <div className="flex gap-4 items-stretch">
        <div className="w-[30%] flex-shrink-0">
          <ScoreCard rec={rec} metrics={metrics} />
        </div>
        {rec.whyItWorks.length > 0 && (
          <div className="flex-1 bg-background border border-border rounded-lg p-5 min-w-0">
            <p className="text-[16px] text-foreground font-normal leading-[24px] mb-0.5">Why does this recommendation matter to you</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mb-3">We analyzed your reports and found these gaps</p>
            <ul className="flex flex-col gap-2.5">
              {rec.whyItWorks.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {pt}
                </li>
              ))}
              {topComp && (
                <li className="flex items-start gap-2.5 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {topComp.name} is the top cited competitor
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Blog preview card */}
      <div className="bg-background border border-border rounded-lg">
        <div className="px-5 pt-4 pb-4 flex flex-col">
          <div className="flex flex-col gap-1">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">How can you fix this gap</p>
            <p className="text-[16px] text-foreground font-normal leading-[24px]">{rec.title}</p>
          </div>
          <p className="text-[14px] text-muted-foreground font-normal leading-[20px] mt-1">{rec.description}</p>
          <div className="mt-3">
            <BlogPreviewBox rec={rec} aeoScore={aeoScore} onOpenClick={() => setShowBlogPreview(true)} onAccept={onNavigateToBlogCanvas ?? onAccept} />
          </div>
        </div>
      </div>

      {/* What to do next — hidden when completed */}
      {rec.status !== 'completed' && (
        <div className="bg-background border border-border rounded-lg">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">What to do next</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
          </div>
          <Stepper steps={steps} />
          <NeedHelpBanner />
        </div>
      )}

    </div>
  )
}

// ── FAQ detail ────────────────────────────────────────────────────────────────

interface FAQDetailProps {
  rec: Recommendation
  metrics: BusinessMetrics
  onNavigateToContentHub?: (questions: { question: string; answer: string }[]) => void
}

function FAQDetail({ rec, metrics, onNavigateToContentHub }: FAQDetailProps) {
  const [showFAQPreview, setShowFAQPreview] = useState(false)

  const isFAQRejectedOrCompleted = rec.status === 'rejected' || rec.status === 'completed' || rec.status === 'in_progress'

  const steps: Step[] = [
    {
      label: 'Review your AI-generated FAQ set',
      description: 'Read through the generated Q&As and edit any details to match your voice and local knowledge.',
      cta: isFAQRejectedOrCompleted
        ? undefined
        : { label: 'Review FAQs', onClick: () => setShowFAQPreview(true) },
    },
    {
      label: 'Add FAQ schema to your website',
      description: "Paste the structured JSON-LD schema generated by Birdeye into your site's <head> or page body.",
    },
    {
      label: 'Publish to Birdeye website page',
      description: 'Create a dedicated FAQ page and publish it through Birdeye to maximize AI citation potential.',
    },
    {
      label: 'Mark complete after publishing',
      description: 'Mark this task as complete to track your progress in Search AI score.',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {showFAQPreview && (
        <FAQPreviewModal
          rec={rec}
          onClose={() => setShowFAQPreview(false)}
          onNavigateToContentHub={onNavigateToContentHub}
          status={rec.status}
        />
      )}

      {/* Score + why it matters */}
      <div className="flex gap-4 items-stretch">
        <div className="w-[30%] flex-shrink-0">
          <ScoreCard rec={rec} metrics={metrics} />
        </div>
        {rec.whyItWorks.length > 0 && (
          <div className="flex-1 bg-background border border-border rounded-lg p-5 min-w-0">
            <p className="text-[16px] text-foreground font-normal leading-[24px] mb-0.5">Why does this recommendation matter to you</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mb-3">We analyzed your reports and found these gaps</p>
            <ul className="flex flex-col gap-2.5">
              {rec.whyItWorks.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* FAQ preview card */}
      <div className="bg-background border border-border rounded-lg">
        <div className="px-5 pt-4 pb-4 flex flex-col">
          <div className="flex flex-col gap-1">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">How can you fix this gap</p>
            <p className="text-[16px] text-foreground font-normal leading-[24px]">{rec.title}</p>
          </div>
          <p className="text-[14px] text-muted-foreground font-normal leading-[20px] mt-1">{rec.description}</p>
          <div className="mt-3">
            <FAQPreviewBox
              rec={rec}
              onPreviewClick={() => setShowFAQPreview(true)}
              onNavigateToContentHub={onNavigateToContentHub}
            />
          </div>
        </div>
      </div>

      {/* What to do next — hidden when completed */}
      {rec.status !== 'completed' && (
        <div className="bg-background border border-border rounded-lg">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">What to do next</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
          </div>
          <Stepper steps={steps} />
          <NeedHelpBanner />
        </div>
      )}
    </div>
  )
}

// ── Generic detail ────────────────────────────────────────────────────────────

interface GenericDetailProps {
  rec: Recommendation
  metrics: BusinessMetrics
}

function GenericDetail({ rec, metrics }: GenericDetailProps) {
  const topComp = rec.competitors[0]

  const steps: Step[] = rec.checklist.map(step => ({
    label: step.label,
    description: step.description,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Score + why it matters */}
      <div className="flex gap-4 items-stretch">
        <div className="w-[30%] flex-shrink-0">
          <ScoreCard rec={rec} metrics={metrics} />
        </div>
        {rec.whyItWorks.length > 0 && (
          <div className="flex-1 bg-background border border-border rounded-lg p-5 min-w-0">
            <p className="text-[16px] text-foreground font-normal leading-[24px] mb-0.5">Why does this recommendation matter to you</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mb-3">We analyzed your reports and found these gaps</p>
            <ul className="flex flex-col gap-2.5">
              {rec.whyItWorks.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {pt}
                </li>
              ))}
              {topComp && (
                <li className="flex items-start gap-2.5 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {topComp.name} is the top cited competitor for {rec.category}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* How can you fix this gap card */}
      <div className="bg-background border border-border rounded-lg">
        <div className="px-5 pt-4 pb-1">
          <div className="flex flex-col gap-1">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">How can you fix this gap</p>
            <p className="text-[16px] text-foreground font-normal leading-[24px]">{rec.title}</p>
          </div>
        </div>
        <div className="px-5 py-3">
          <p className="text-[14px] text-muted-foreground font-normal leading-[20px]">{rec.expectedImpact ?? rec.description}</p>
        </div>
      </div>

      {/* What to do next — hidden when completed */}
      {steps.length > 0 && rec.status !== 'completed' && (
        <div className="bg-background border border-border rounded-lg">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">What to do next</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
          </div>
          <Stepper steps={steps} />
          <NeedHelpBanner />
        </div>
      )}
    </div>
  )
}

// ── Evidence tab ─────────────────────────────────────────────────────────────

const LLM_EVIDENCE_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Google AI Mode', 'Google AI Overviews'] as const
type EvidencePlatform = (typeof LLM_EVIDENCE_PLATFORMS)[number]

interface LLMResponseRow {
  date: string
  location: string
  mentioned: boolean
  position: number | null
  positionDelta: number | null
  mentions: { initial: string; color: string }[]
  mentionsOverflow: number
  citations: { initial: string; color: string }[]
  response: string
}

const EVIDENCE_AVATAR_COLORS: Record<string, string> = {
  Z: '#1a73e8', R: '#e53935', T: '#43a047', H: '#fb8c00',
  L: '#3949ab', C: '#00acc1', B: '#8e24aa', M: '#00897b',
}
function avatarColor(initial: string): string {
  return EVIDENCE_AVATAR_COLORS[initial.toUpperCase()]
    ?? `hsl(${(initial.toUpperCase().charCodeAt(0) * 47) % 360},55%,45%)`
}

const MOCK_LLM_ROWS: LLMResponseRow[] = [
  {
    date: 'Jan 10, 2026', location: 'Dubbo, NSW', mentioned: true,
    position: 3, positionDelta: 1,
    mentions: [{ initial: 'Z', color: avatarColor('Z') }, { initial: 'R', color: avatarColor('R') }, { initial: 'T', color: avatarColor('T') }],
    mentionsOverflow: 17,
    citations: [{ initial: 'T', color: avatarColor('T') }, { initial: 'H', color: avatarColor('H') }, { initial: 'L', color: avatarColor('L') }],
    response: 'Here are the top-rated real estate agencies in Dubbo that consistently appear in AI-generated recommendati...',
  },
  {
    date: 'Jan 10, 2026', location: 'Orange, NSW', mentioned: false,
    position: null, positionDelta: null,
    mentions: [], mentionsOverflow: 0,
    citations: [{ initial: 'H', color: avatarColor('H') }, { initial: 'L', color: avatarColor('L') }],
    response: 'The leading property agencies in Orange NSW include several highly regarded firms offering residential sale...',
  },
  {
    date: 'Jan 9, 2026', location: 'Bathurst, NSW', mentioned: true,
    position: 5, positionDelta: 3,
    mentions: [{ initial: 'T', color: avatarColor('T') }, { initial: 'H', color: avatarColor('H') }, { initial: 'L', color: avatarColor('L') }],
    mentionsOverflow: 15,
    citations: [{ initial: 'L', color: avatarColor('L') }, { initial: 'C', color: avatarColor('C') }, { initial: 'Z', color: avatarColor('Z') }],
    response: 'Top real estate agents in Bathurst are active across multiple suburbs, with many offering complimentary pro...',
  },
  {
    date: 'Jan 8, 2026', location: 'Parkes, NSW', mentioned: true,
    position: 4, positionDelta: 2,
    mentions: [{ initial: 'H', color: avatarColor('H') }, { initial: 'L', color: avatarColor('L') }, { initial: 'C', color: avatarColor('C') }],
    mentionsOverflow: 17,
    citations: [{ initial: 'C', color: avatarColor('C') }, { initial: 'Z', color: avatarColor('Z') }],
    response: 'Looking for a property appraisal in Parkes? Several well-reviewed agencies offer no-obligation valuations wit...',
  },
]

function getBadgeStyle(initial: string): { bg: string; color: string } {
  const PALETTES = [
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#dbeafe', color: '#1e3a8a' },
    { bg: '#dcfce7', color: '#166534' },
    { bg: '#fce7f3', color: '#9d174d' },
    { bg: '#ede9fe', color: '#5b21b6' },
    { bg: '#f1f5f9', color: '#334155' },
    { bg: '#fef2f2', color: '#991b1b' },
    { bg: '#ecfdf5', color: '#065f46' },
  ]
  return PALETTES[initial.toUpperCase().charCodeAt(0) % PALETTES.length]
}

// ── Site name map for mentions popover ───────────────────────────────────────

const MENTIONS_SITE_NAMES: Record<string, string> = {
  Z: 'Zillow', R: 'Realtor.com', T: 'Trulia', H: 'Homes.com',
  L: 'LoopNet', C: 'CoStar', B: 'Berkshire Hathaway', M: 'Movoto',
  D: 'Domain.com.au', N: 'Nearmap', A: 'Allhomes', P: 'PropertyGuru',
  S: 'Seek Real Estate', W: 'RealEstate.com.au', E: 'Estate Agents',
  F: 'First Home Buyer', G: 'Gumtree Property', I: 'Invest Smart',
  J: 'Just Listed', K: 'Keysite Realty', O: 'OneRoof', V: 'View.com.au',
}

// Extra site initials for overflow rows (consistent across data rows)
const OVERFLOW_EXTRAS = ['D', 'N', 'A', 'P', 'S', 'W', 'E', 'F', 'G', 'I', 'J', 'K', 'O', 'V', 'B', 'M', 'C']

function MentionsWithPopover({ items, overflow }: { items: { initial: string; color: string }[]; overflow: number }) {
  const [showPopover, setShowPopover] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const overflowRef = useRef<HTMLSpanElement | null>(null)

  function handleOverflowEnter() {
    if (!overflowRef.current) return
    const rect = overflowRef.current.getBoundingClientRect()
    setPopoverPos({ top: rect.bottom + 6, left: rect.left - 80 })
    setShowPopover(true)
  }

  // All site names: visible items + overflow extras
  const allNames = [
    ...items.map(a => MENTIONS_SITE_NAMES[a.initial] ?? a.initial),
    ...OVERFLOW_EXTRAS.slice(0, overflow).map(k => MENTIONS_SITE_NAMES[k] ?? k),
  ]

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {items.map((a, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: a.color }}
          >
            {a.initial}
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span
          ref={overflowRef}
          className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onMouseEnter={handleOverflowEnter}
          onMouseLeave={() => setTimeout(() => setShowPopover(false), 200)}
        >
          +{overflow}
        </span>
      )}
      {showPopover && createPortal(
        <div
          className="fixed z-[9999] bg-background rounded-lg shadow-lg border border-border w-56 py-2"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
        >
          <p className="px-3 pt-1 pb-2 text-[11px] text-muted-foreground font-medium tracking-[0.4px] uppercase">
            All mentions ({allNames.length})
          </p>
          <ul className="max-h-52 overflow-y-auto">
            {allNames.map((name, i) => (
              <li key={i} className="px-3 py-1.5 hover:bg-muted/50">
                <span className="text-[13px] text-foreground leading-[18px]">{name}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}

// ── Competitor citations card ──────────────────────────────────────────────────

const MOCK_EVIDENCE_COMPETITORS: Recommendation['competitors'] = [
  {
    id: 'aspect', name: 'Aspect Property Consultant',
    pageUrl: 'https://aspectpropertyconsultant.com.au',
    llmSnippet: "Aspect Property Consultant's appraisal hub clearly communicates their \"no obligation, no cost\" value promise with a simple form above the fold, capturing more leads from Dubbo property owners searching for valuations.",
    citedBy: [], totalCitations: 120, citationRank: 1, sourceGaps: [], whyTheyWin: '',
  },
  {
    id: 'ray-white', name: 'Ray White Dubbo',
    pageUrl: 'https://raywhitedubbo.com.au',
    llmSnippet: "Ray White Dubbo has a dedicated property appraisal page that answers the top questions AI surfaces for Dubbo sellers — including what a free appraisal covers, timelines, and what to expect from the process.",
    citedBy: [], totalCitations: 98, citationRank: 2, sourceGaps: [], whyTheyWin: '',
  },
  {
    id: 'elders', name: 'Elders Real Estate Dubbo',
    pageUrl: 'https://eldersrealestate.com.au/dubbo',
    llmSnippet: "Elders Real Estate Dubbo prominently features their free appraisal offer across their website, with suburb-specific landing pages that Gemini surfaces when homeowners ask about property values in the Dubbo area.",
    citedBy: [], totalCitations: 87, citationRank: 3, sourceGaps: [], whyTheyWin: '',
  },
]

function CompetitorCitationsCard({ rec }: { rec: Recommendation }) {
  const [compareOpen, setCompareOpen] = useState(false)
  const [subScoresOpen, setSubScoresOpen] = useState(true)
  const rawCompetitors = rec.competitors.length > 0 ? rec.competitors : MOCK_EVIDENCE_COMPETITORS
  const competitors = rawCompetitors.slice(0, 3)
  const aeoCompScore = rec.aeoScore?.competitor ?? 81
  const aeoYourScore = rec.aeoScore?.you ?? 92
  const subScores = rec.aeoScore?.subScores ?? DEFAULT_BLOG_SUBSCORES

  const query = rec.promptsTriggeringThis[0]
    ?? 'Find real estate agencies near me specializing in residential property sales.'

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <p className="text-[16px] text-foreground font-normal leading-[24px]">
          Which top competitor blogs are cited by AI for{' '}
          <span className="text-primary">&lsquo;{query}&rsquo;</span>
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: '#717182' }}>
          Analyze why competitors blog is getting cited instead of you
        </p>
      </div>

      {/* Competitor rows */}
      <div className="px-6 pt-4 pb-4 flex flex-col gap-3">
        {competitors.map(comp => {
          const initial = comp.name.charAt(0).toUpperCase()
          const badge = getBadgeStyle(initial)
          return (
            <div key={comp.id} className="rounded-lg bg-[var(--s-bg-secondary)] p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {initial}
                    </span>
                    <span className="text-[12px] font-normal leading-none" style={{ color: '#717182' }}>{comp.name}</span>
                  </div>
                  {comp.pageUrl && (
                    <a
                      href={comp.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-primary hover:underline leading-[20px] truncate"
                    >
                      {comp.name} | Leading agency in Dubbo
                    </a>
                  )}
                  <p className="text-[13px] leading-[20px] line-clamp-1" style={{ color: '#717182' }}>{comp.llmSnippet}</p>
                </div>
                <AeoScoreBox score={aeoCompScore} />
              </div>
            </div>
          )
        })}

        {/* Compare AEO score collapsible */}
        <div className="rounded-lg bg-[var(--s-bg-secondary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setCompareOpen(v => !v)}
            className="w-full flex items-start justify-between px-5 py-4 hover:bg-[var(--s-bg-secondary)] transition-colors text-left"
          >
            <div>
              <p className="text-[13px] font-medium text-foreground leading-[20px]">
                Compare AEO content score for Search AI generated blog vs competitor&apos;s blog
              </p>
              <p className="text-[12px] text-muted-foreground leading-[18px]">
                AEO content score predicts how well your page is likely to perform in answers generated by AI
              </p>
            </div>
            {compareOpen
              ? <ChevronUp size={15} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground flex-shrink-0 mt-0.5" />
              : <ChevronDown size={15} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground flex-shrink-0 mt-0.5" />
            }
          </button>

          {compareOpen && (
            <div className="overflow-x-auto px-5">
              {/* Column header row — div 2 wrapper owns the px-5 inset */}
              <div className="flex items-center py-4 border-t border-border">
                <div className="w-[38%] flex-shrink-0">
                  <span className="text-[12px] text-muted-foreground">Score</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-[12px] bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full font-medium leading-none">You</span>
                  <Info size={13} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground flex-shrink-0" />
                </div>
                {competitors.map(comp => (
                  <div key={comp.id} className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-[12px] text-muted-foreground leading-none">{comp.name}</span>
                    <Info size={13} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>

              {/* AEO content score row — toggles sub-scores */}
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setSubScoresOpen(v => !v)}
                  className="w-full flex items-center py-4 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="w-[38%] flex-shrink-0 flex items-center gap-2">
                    <ChevronDown
                      size={14}
                      strokeWidth={1.6}
                      absoluteStrokeWidth
                      className={cn('text-foreground flex-shrink-0 transition-transform duration-150', !subScoresOpen && '-rotate-90')}
                    />
                    <span className="text-[13px] text-foreground font-medium">AEO content score</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-foreground">{aeoYourScore}%</span>
                  </div>
                  {competitors.map(comp => (
                    <div key={comp.id} className="flex-1 min-w-0">
                      <span className="text-[13px] text-foreground">{aeoCompScore}%</span>
                    </div>
                  ))}
                </button>

                {/* Sub-score rows */}
                {subScoresOpen && subScores.map(sub => (
                  <div key={sub.name} className="flex items-center py-4 border-t border-border">
                    <div className="w-[38%] flex-shrink-0 pl-6">
                      <p className="text-[13px] text-foreground leading-[18px]">{sub.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-[16px]">
                        Weights: {typeof sub.weight === 'number' && sub.weight < 1
                          ? (sub.weight * 100).toFixed(1)
                          : sub.weight}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-foreground">{sub.you}%</span>
                    </div>
                    {competitors.map(comp => (
                      <div key={comp.id} className="flex-1 min-w-0">
                        <span className="text-[13px] text-foreground">{sub.competitor}%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── LLM responses card ─────────────────────────────────────────────────────────

function LLMResponsesCard({ rec }: { rec: Recommendation }) {
  const [activePlatform, setActivePlatform] = useState<EvidencePlatform>('ChatGPT')

  const query = rec.promptsTriggeringThis[0]
    ?? 'Find real estate agencies near me specializing in residential property sales.'

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <p className="text-[16px] font-normal text-foreground leading-[24px]">
          How did AI sites respond to{' '}
          <span className="text-primary font-normal">{query}</span>
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          To generate this recommendation, we ran these prompts across LLMs. Here are the responses each AI site returned.
        </p>
      </div>

      {/* Platform tabs */}
      {/* Same tab component as Recommendation/Evidence tabs — no border-b on container */}
      <div className="flex px-5 gap-6">
        {LLM_EVIDENCE_PLATFORMS.map(platform => (
          <button
            key={platform}
            type="button"
            onClick={() => setActivePlatform(platform)}
            className={cn(
              'py-3 text-[14px] font-normal border-b-2 -mb-px transition-colors whitespace-nowrap',
              activePlatform === platform
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {platform}
          </button>
        ))}
      </div>

      {/* Table — div 2 wrapper owns the px-5 inset from card edges */}
      <div className="overflow-x-auto px-5">
        {/* Header row */}
        <div className="flex items-center py-4 border-b border-border">
          <span className="text-[12px] text-muted-foreground font-medium w-[110px] flex-shrink-0">Date</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[130px] flex-shrink-0">Location</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[90px] flex-shrink-0 flex items-center gap-1">
            Mention
            <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 flex items-center justify-center text-[9px] text-muted-foreground flex-shrink-0">i</span>
          </span>
          <span className="text-[12px] text-muted-foreground font-medium w-[100px] flex-shrink-0">Position</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[160px] flex-shrink-0">All mentions</span>
          <span className="text-[12px] text-muted-foreground font-medium flex-1 min-w-0">Response</span>
        </div>

        {MOCK_LLM_ROWS.map((row, i) => (
          <div
            key={i}
            className={cn('group/table-row flex items-center py-6', i > 0 && 'border-t border-border')}
          >
            {/* Date */}
            <span className="text-[13px] text-foreground w-[110px] flex-shrink-0">{row.date}</span>

            {/* Location */}
            <span className="text-[13px] text-foreground w-[130px] flex-shrink-0">{row.location}</span>

            {/* Mention */}
            <div className="w-[90px] flex-shrink-0">
              {row.mentioned
                ? <img src="/assets/rec/check_circle.svg" alt="mentioned" className="w-6 h-6" />
                : <img src="/assets/rec/Component 75-2.svg" alt="not mentioned" className="w-6 h-6" />
              }
            </div>

            {/* Position */}
            <div className="w-[100px] flex-shrink-0">
              {row.position !== null
                ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] text-foreground">{row.position}</span>
                    {row.positionDelta !== null && row.positionDelta > 0 && (
                      <span className="text-[12px] text-[#4CAE3D] font-medium">+{row.positionDelta}</span>
                    )}
                  </div>
                )
                : <span className="text-[13px] text-muted-foreground">—</span>
              }
            </div>

            {/* All mentions — hover on +N shows site name popover */}
            <div className="w-[160px] flex-shrink-0">
              {row.mentions.length > 0
                ? <MentionsWithPopover items={row.mentions} overflow={row.mentionsOverflow} />
                : <span className="text-[12px] text-muted-foreground">No mention</span>
              }
            </div>

            {/* Response — "View response" Button reveals on row hover */}
            <div className="flex-1 min-w-0 relative flex items-center overflow-hidden">
              <span className="text-[13px] text-foreground truncate pr-2 group-hover/table-row:pr-36 transition-all">
                {row.response}
              </span>
              <div className="absolute right-0 hidden group-hover/table-row:flex items-center">
                <div className="w-12 h-full bg-gradient-to-r from-transparent to-background flex-shrink-0" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[13px] whitespace-nowrap flex-shrink-0 bg-background"
                >
                  View response
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Evidence tab wrapper ───────────────────────────────────────────────────────

function EvidenceTab({ rec }: { rec: Recommendation }) {
  return (
    <div className="flex flex-col gap-4">
      <CompetitorCitationsCard rec={rec} />
      <LLMResponsesCard rec={rec} />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface RecDetailViewProps {
  rec: Recommendation
  metrics: BusinessMetrics
  onBack: () => void
  onAccept: (id: string) => void
  onReject?: (id: string) => void
  onNavigateToContentHub?: (questions: { question: string; answer: string }[]) => void
  onNavigateToBlogCanvas?: () => void
  onCompleteRec?: (id: string) => void
  onRevertToPending?: (id: string) => void
}

const REJECT_REASONS = [
  "The recommendation doesn't apply to the business",
  "Previously accepted a similar recommendation",
  "The suggestion is unlikely to meaningfully improve performance.",
  "The recommendation contains errors or could misinform customers.",
] as const

interface RejectConfirmDialogProps {
  onCancel: () => void
  onConfirm: () => void
}

export function RejectConfirmDialog({ onCancel, onConfirm }: RejectConfirmDialogProps) {
  const [checkedReasons, setCheckedReasons] = useState<Set<string>>(new Set())
  const [removePermanently, setRemovePermanently] = useState(false)

  const toggleReason = (reason: string) => {
    setCheckedReasons(prev => {
      const next = new Set(prev)
      next.has(reason) ? next.delete(reason) : next.add(reason)
      return next
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(33,33,33,0.64)' }}
      onClick={onCancel}
    >
      <div
        className="relative bg-background rounded shadow-[0px_4px_8px_0px_rgba(33,33,33,0.18)] flex flex-col overflow-hidden"
        style={{ width: 616, maxWidth: 'calc(100vw - 48px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <p className="text-[16px] text-foreground font-normal leading-[24px]">Reject recommendation?</p>
          <button
            onClick={onCancel}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
          >
            <X size={16} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 px-6 py-3">
          {/* Reasons */}
          <div className="flex flex-col gap-2">
            <p className="text-[16px] text-foreground font-normal leading-[24px]">Tell us what didn't work</p>
            <div className="flex flex-col gap-2">
              {REJECT_REASONS.map(reason => (
                <label key={reason} className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={checkedReasons.has(reason)}
                    onCheckedChange={() => toggleReason(reason)}
                  />
                  <span className="text-[14px] text-muted-foreground leading-[20px]">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Remove permanently */}
          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-foreground leading-[20px]">
              Rejecting this recommendation will hide it from your list for 30 days.
            </p>
            <label className="flex items-center gap-1 cursor-pointer">
              <Checkbox
                checked={removePermanently}
                onCheckedChange={v => setRemovePermanently(!!v)}
              />
              <span className="text-[12px] text-muted-foreground leading-[18px]">Remove permanently</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pt-3 pb-6">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Reject
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function RecDetailView({
  rec, metrics, onBack, onAccept, onReject,
  onNavigateToContentHub, onNavigateToBlogCanvas,
  onCompleteRec, onRevertToPending,
}: RecDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'recommendation' | 'evidence'>('recommendation')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const isBlog = rec.category === 'Content' && !!rec.aeoScore
  const isFAQ  = rec.category === 'FAQ'

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {showRejectDialog && (
        <RejectConfirmDialog
          onCancel={() => setShowRejectDialog(false)}
          onConfirm={() => {
            setShowRejectDialog(false)
            if (onReject) onReject(rec.id)
            toast.error('Recommendation rejected', {
              duration: 5000,
              icon: <X size={20} strokeWidth={1.6} absoluteStrokeWidth className="text-destructive" />,
            })
          }}
        />
      )}
      {/* Sticky top block: header + tab bar */}
      <div className="sticky top-0 z-30 bg-background flex-shrink-0">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft size={16} strokeWidth={1.6} absoluteStrokeWidth />
            </button>
            <p className="text-[18px] text-foreground font-normal truncate">{rec.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {rec.status === 'pending' && (
              <>
                {onReject && (
                  <Button variant="outline" size="sm" onClick={() => setShowRejectDialog(true)}>
                    Reject
                  </Button>
                )}
                <Button size="sm" onClick={() => {
                  onAccept(rec.id)
                  toast.success('Recommendation accepted', {
                    duration: 5000,
                    icon: <CheckCircle2 size={20} strokeWidth={1.6} absoluteStrokeWidth className="text-green-600" />,
                  })
                }}>
                  Accept
                </Button>
              </>
            )}

            {rec.status === 'accepted' && (
              <>
                {(isBlog || isFAQ) && (
                  <Button variant="outline" size="sm" onClick={() => {
                    if (isBlog && onNavigateToBlogCanvas) onNavigateToBlogCanvas()
                    else if (isFAQ && onNavigateToContentHub) onNavigateToContentHub([])
                  }}>
                    {isBlog ? 'Edit blog' : 'Edit FAQs'}
                  </Button>
                )}
                <Button size="sm" onClick={() => {
                  if (onCompleteRec) {
                    onCompleteRec(rec.id)
                    toast.success('Recommendation completed', {
                      duration: 5000,
                      icon: <CheckCircle2 size={20} strokeWidth={1.6} absoluteStrokeWidth className="text-green-600" />,
                    })
                  }
                }}>
                  Mark as done
                </Button>
              </>
            )}

            {rec.status === 'rejected' && onRevertToPending && (
              <Button variant="outline" size="sm" onClick={() => onRevertToPending(rec.id)}>
                Revert to pending
              </Button>
            )}

            {/* Dropdown always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical size={16} strokeWidth={1.6} absoluteStrokeWidth />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Download</DropdownMenuItem>
                <DropdownMenuItem>Email recommendation</DropdownMenuItem>
                {(rec.status === 'accepted' || rec.status === 'rejected') && (
                  <DropdownMenuItem onClick={() => onRevertToPending?.(rec.id)}>
                    Revert to pending
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab bar — all rec types, no full-width border (active tab underline is the separator) */}
        <div className="px-6 flex gap-6 bg-background flex-shrink-0">
          {(['recommendation', 'evidence'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-3 text-[14px] font-normal border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>{/* end sticky top block */}

      {/* Body */}
      <div className="px-6 py-4 flex flex-col gap-4">
        {activeTab === 'evidence' ? (
          <EvidenceTab rec={rec} />
        ) : rec.category === 'FAQ' ? (
          <FAQDetail rec={rec} metrics={metrics} onNavigateToContentHub={onNavigateToContentHub} />
        ) : rec.category === 'Content' && rec.aeoScore ? (
          <ContentDetail rec={rec} metrics={metrics} onAccept={() => onAccept(rec.id)} onNavigateToBlogCanvas={onNavigateToBlogCanvas} />
        ) : (
          <GenericDetail rec={rec} metrics={metrics} />
        )}
        <div className="h-4 flex-shrink-0" />
      </div>
    </div>
  )
}
