import { useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ArrowLeft, Sparkles, X, Copy, Check, ChevronDown, ChevronUp, CheckCircle2, Info, MoreVertical } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Recommendation, BusinessMetrics, AeoSubScore } from './recTypes'

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

const DEFAULT_BLOG_SUBSCORES: AeoSubScore[] = [
  { name: 'Readability',          weight: 10.2, you: 85, competitor: 78, delta: 7  },
  { name: 'Content freshness',    weight: 16.3, you: 90, competitor: 82, delta: 8  },
  { name: 'Click-through structure', weight: 8.5, you: 93, competitor: 80, delta: 13 },
  { name: 'Information density',  weight: 30.5, you: 84, competitor: 76, delta: 8  },
  { name: 'Machine readability',  weight: 11.5, you: 87, competitor: 88, delta: -1 },
  { name: 'Answerability signals',weight: 22.9, you: 88, competitor: 83, delta: 5  },
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
          <circle cx="10" cy="10" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
        </svg>
        <span className="text-[16px] text-primary leading-[24px] font-normal">{score}</span>
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
  const pct = Math.min(score, 100)
  const scoreColor  = lowScore ? 'text-primary'    : 'text-[#3d9e4a]'
  const barColor    = lowScore ? 'bg-destructive/80' : 'bg-primary'
  const pillColor   = lowScore
    ? 'bg-destructive text-destructive-foreground'
    : 'bg-[#1a3a4a] text-white'

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {/* Large score number */}
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-[52px] font-semibold leading-none', scoreColor)}>{score}</span>
        <span className="text-[20px] text-muted-foreground font-normal leading-none">/ 100</span>
      </div>

      {/* Label + info icon */}
      <div className="flex items-center gap-1.5 -mt-2">
        <span className="text-[14px] text-muted-foreground font-normal leading-[20px]">AEO Content score</span>
        <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-muted-foreground leading-none">?</span>
        </div>
      </div>

      {/* Progress bar with "You" pill */}
      <div className="flex flex-col gap-0.5">
        {/* "You" pill positioned at score% */}
        <div className="relative h-5 mb-1">
          <div
            className="absolute top-0"
            style={{ left: `${Math.max(0, pct - 4)}%`, transform: pct > 90 ? 'translateX(-100%)' : 'none' }}
          >
            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium leading-none', pillColor)}>
              {lowScore ? `You ${score}` : 'You'}
            </span>
          </div>
        </div>
        {/* Track */}
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
        </div>
        {/* Min/max labels */}
        {lowScore && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-muted-foreground">0</span>
            <span className="text-[11px] text-muted-foreground">100</span>
          </div>
        )}
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
}

function BlogPreviewModal({ rec, onClose, onAccept, onNavigateToBlogCanvas }: BlogPreviewModalProps) {
  const aeoScore  = rec.aeoScore?.you ?? 98
  const subScores = rec.aeoScore?.subScores ?? DEFAULT_BLOG_SUBSCORES
  const metaTitle = rec.title
  const metaDesc  = rec.description.slice(0, 155)
  const slug      = rec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 960, maxWidth: 'calc(100vw - 40px)', height: '90vh', maxHeight: 800 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.6} absoluteStrokeWidth className="text-primary" />
            <span className="text-[15px] text-foreground font-normal leading-[24px]">Preview blog</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onNavigateToBlogCanvas ?? onAccept} className="h-8 text-[13px]">
              Accept and edit blog →
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
              <X size={18} strokeWidth={1.6} absoluteStrokeWidth />
            </button>
          </div>
        </div>

        {/* Modal body: two columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel: AEO scores */}
          <div className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto bg-background">
            <AeoLeftPanel score={aeoScore} subScores={subScores} lowScore={false} />
          </div>

          {/* Right panel: real blog layout */}
          <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">

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
            <article className="px-8 py-6 flex flex-col gap-5 flex-1">

              {/* Intro */}
              <p className="text-[15px] text-foreground leading-[26px]">
                {rec.description}
              </p>

              {/* Image 1 — suburban property exterior */}
              <div className="w-full rounded-xl overflow-hidden flex-shrink-0" style={{ height: 200 }}>
                <img
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=200&fit=crop&crop=center&q=80"
                  alt="Suburban property exterior"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-3 text-center">Suburb-level pages signal geographic precision to AI retrieval systems</p>

              {/* H2 — Section 1 */}
              <div className="flex flex-col gap-2 pt-1">
                <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">
                  Why location-specific pages win more AI citations
                </h2>
                <p className="text-[14px] text-foreground leading-[24px]">
                  Search AI platforms — including ChatGPT, Gemini, and Perplexity — surface results that are geographically precise. A page titled after your suburb signals relevance to both traditional search algorithms and AI retrieval systems far more effectively than a generic agency homepage. Competitors who publish suburb-level pages are capturing citation share you're currently missing.
                </p>
              </div>

              {/* Pull quote */}
              <div className="border-l-[3px] border-primary bg-primary/5 pl-4 pr-4 py-3 rounded-r-lg">
                <p className="text-[14px] text-foreground leading-[22px] italic">
                  "AI models cite pages that directly answer hyper-local queries. A suburb-level service page converts 3× better than a city-level equivalent."
                </p>
                <p className="text-[12px] text-muted-foreground mt-1.5">— Birdeye Search AI analysis, 2025</p>
              </div>

              {/* Image 2 — real estate agent / property consultation */}
              <div className="w-full rounded-xl overflow-hidden flex-shrink-0" style={{ height: 200 }}>
                <img
                  src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&h=200&fit=crop&crop=center&q=80"
                  alt="Real estate agent reviewing property listings"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-3 text-center">Citation share improvement observed across Birdeye clients · 90-day window</p>

              {/* H2 — Section 2 with list */}
              <div className="flex flex-col gap-2 pt-1">
                <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">
                  What a high-performing service page includes
                </h2>
                <p className="text-[14px] text-foreground leading-[24px]">
                  Based on analysis of top-cited competitor pages in your market, the following elements consistently appear in pages that win AI citations:
                </p>
                <ul className="flex flex-col gap-2 mt-1">
                  {[
                    'A suburb-specific H1 that names the service and location (e.g. "Property Appraisal in Dubbo North")',
                    'A 200–400 word introduction addressing the most common local question',
                    'FAQ schema markup covering 5–8 questions with concise answers',
                    'Social proof — review count, star rating, and years operating in the area',
                    'A clear CTA with a local phone number and Google Maps embed',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] text-foreground leading-[22px]">
                      <span className="mt-[9px] w-[4px] h-[4px] rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image 3 — modern home / neighbourhood */}
              <div className="w-full rounded-xl overflow-hidden flex-shrink-0" style={{ height: 200 }}>
                <img
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=200&fit=crop&crop=center&q=80"
                  alt="Modern residential property"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-3 text-center">JSON-LD schema is auto-generated and ready to embed — no developer needed</p>

              {/* H2 — Section 3 */}
              <div className="flex flex-col gap-2 pt-1">
                <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">
                  Maximising AI citation potential after publishing
                </h2>
                <p className="text-[14px] text-foreground leading-[24px]">
                  Once live, AI platforms index your page through structured signals — not just raw content. Embedding JSON-LD schema, maintaining consistent NAP (Name, Address, Phone) data across directories, and earning fresh reviews on your Google Business Profile all compound the page's citation probability over time. Birdeye automates the schema generation and review syndication steps so you can focus entirely on the content itself.
                </p>
              </div>

              {/* Conclusion */}
              <div className="flex flex-col gap-2 pt-1 pb-2">
                <h2 className="text-[20px] text-foreground font-semibold leading-[28px]">Getting started</h2>
                <p className="text-[14px] text-foreground leading-[24px]">
                  Review the AI-generated draft, customise the tone to match your agency's voice, and publish it to your website. Once live, measurable improvements in your Search AI citation score typically appear within 4–6 weeks and are tracked automatically in your Birdeye dashboard.
                </p>
              </div>
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

function FAQPreviewModal({ rec, onClose, onNavigateToContentHub }: FAQPreviewModalProps) {
  const aeoScore = rec.aeoScore?.you ?? 95
  const subScores = rec.aeoScore?.subScores ?? DEFAULT_FAQ_SUBSCORES
  const asset = rec.generatedAsset
  const [expandedIdx, setExpandedIdx] = useState<number>(0)

  const faqItems: FAQItem[] = asset?.fullContent
    ? [{ question: asset.title, answer: asset.fullContent }]
    : FAQ_ITEMS_PROPERTY_APPRAISAL

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 900, maxWidth: 'calc(100vw - 40px)', height: '85vh', maxHeight: 720 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.6} absoluteStrokeWidth className="text-primary" />
            <span className="text-[15px] text-foreground font-normal leading-[24px]">Preview FAQ set</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToContentHub && (
              <Button
                size="sm"
                className="h-8 text-[13px]"
                onClick={() => {
                  toast.success('Recommendation accepted', {
                    duration: 3000,
                    icon: <CheckCircle2 size={20} strokeWidth={1.6} className="text-green-600" />,
                  });
                  onClose();
                  onNavigateToContentHub(faqItems);
                }}
              >
                Accept and edit FAQ →
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
              <X size={18} strokeWidth={1.6} absoluteStrokeWidth />
            </button>
          </div>
        </div>

        {/* Modal body: two columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel: AEO score + breakdown */}
          <div className="w-[300px] flex-shrink-0 border-r border-border overflow-y-auto bg-background">
            <AeoLeftPanel score={aeoScore} subScores={subScores} lowScore={false} />
          </div>

          {/* Right panel: FAQ Q&A accordion */}
          <div className="flex-1 min-w-0 overflow-y-auto px-8 py-6 flex flex-col gap-6">
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
    <div className="bg-background border border-border rounded-lg p-4 flex flex-col gap-2 h-full">
      <p className="text-[14px] text-foreground leading-[22px]">
        Your {metricLabel}
      </p>
      <p className="text-[12px] text-muted-foreground leading-[18px]">You vs competitor average</p>

      <div className="flex items-start gap-8 mt-1">
        <div className="flex flex-col gap-1">
          <p className="text-[32px] font-normal text-foreground leading-none">{current.toFixed(0)}%</p>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            Current score
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[28px] font-normal text-foreground leading-none">{compPct.toFixed(0)}%</p>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
            Competitor average
          </span>
        </div>
      </div>

      <div className="relative h-1.5 bg-muted rounded-full mt-1">
        <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${yourW}%` }} />
        {compW > yourW && (
          <div className="absolute top-0 h-full bg-destructive/40 rounded-full" style={{ left: `${yourW}%`, width: `${compW - yourW}%` }} />
        )}
        <div className="absolute top-1/2 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-sm" style={{ left: `${yourW}%`, transform: 'translate(-50%, -50%)' }} />
        <div className="absolute top-1/2 w-2 h-2 bg-destructive rounded-full border-2 border-background shadow-sm" style={{ left: `${compW}%`, transform: 'translate(-50%, -50%)' }} />
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
  const displayTitle = rec.title
  const rawBody = rec.description
  const displayBody = rawBody.length > 120 ? rawBody.slice(0, 120) + '...' : rawBody

  return (
    <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 dark:bg-violet-950/20 dark:border-violet-800/30 rounded-lg p-3">
      <div className="flex flex-1 gap-2 items-start min-w-0">
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          <div className="flex items-center gap-1">
            <Sparkles size={12} strokeWidth={1.6} absoluteStrokeWidth className="text-violet-600 flex-shrink-0" />
            <span className="text-[12px] leading-[18px] text-violet-600">Blog generated for you</span>
          </div>
          <p className="text-[14px] text-foreground leading-[20px] font-normal">{displayTitle}</p>
          {displayBody && (
            <p className="text-[13px] text-muted-foreground leading-[18px] line-clamp-2">{displayBody}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {onOpenClick && (
              <Button variant="outline" size="sm" onClick={onOpenClick} className="h-8 text-[13px]">
                Preview blog
              </Button>
            )}
          </div>
        </div>
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
  const asset = rec.generatedAsset
  const title = asset?.title ?? rec.title
  const preview = asset?.previewText ?? ''
  const aeoScore = rec.aeoScore?.you ?? 95

  return (
    <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 dark:bg-violet-950/20 dark:border-violet-800/30 rounded-lg p-3">
      <div className="flex flex-1 gap-2 items-start min-w-0">
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          <div className="flex items-center gap-1">
            <Sparkles size={12} strokeWidth={1.6} absoluteStrokeWidth className="text-violet-600 flex-shrink-0" />
            <span className="text-[12px] leading-[18px] text-violet-600">FAQ set generated for you</span>
          </div>
          <p className="text-[14px] text-foreground leading-[20px] font-normal">{title}</p>
          {preview && (
            <p className="text-[13px] text-muted-foreground leading-[18px] line-clamp-2">{preview}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {onPreviewClick && (
              <Button
                variant="outline"
                onClick={onPreviewClick}
                size="sm"
                className="h-8 text-[13px]"
              >
                Preview FAQs
              </Button>
            )}
          </div>
        </div>
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
          <div key={idx} className="flex gap-2 items-stretch px-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-5 h-5 border border-border rounded-full flex items-center justify-center text-[11px] text-muted-foreground leading-none flex-shrink-0 bg-background mt-0.5">
                {idx + 1}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className={cn('flex flex-col flex-1 min-w-0 pt-0.5', !isLast ? 'pb-4' : 'pb-1')}>
              <p className="text-[14px] text-foreground leading-[22px]">{step.label}</p>
              <p className="text-[13px] text-muted-foreground leading-[20px] mt-0.5">{step.description}</p>
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

  const steps: Step[] = [
    {
      label: 'Review your Search AI-generated blog.',
      description: 'Read through the draft. Change any details, prices, or tone to match your voice.',
      cta: { label: 'Review blog', onClick: () => setShowBlogPreview(true) },
    },
    {
      label: 'Accept and publish to your website.',
      description: 'Publish to your website to boost Search AI score.',
      cta: { label: 'Accept and edit blog', onClick: onAccept },
    },
    {
      label: 'Mark it as complete after publishing.',
      description: 'Mark this task as complete to observe your progress in Search AI score.',
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
        />
      )}

      {/* Score + why it matters */}
      <div className="flex gap-4 items-stretch">
        <div className="w-[30%] flex-shrink-0">
          <ScoreCard rec={rec} metrics={metrics} />
        </div>
        {rec.whyItWorks.length > 0 && (
          <div className="flex-1 bg-background border border-border rounded-lg p-4 min-w-0">
            <p className="text-[13px] text-muted-foreground font-medium leading-[20px] mb-0.5">Why does this matter to you</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mb-2">We analyzed and found these gaps</p>
            <ul className="flex flex-col gap-2">
              {rec.whyItWorks.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {pt}
                </li>
              ))}
              {topComp && (
                <li className="flex items-start gap-2 text-[13px] text-foreground leading-[21px]">
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
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] text-muted-foreground font-medium leading-[20px]">How can you fix this gap</p>
          <p className="text-[14px] text-foreground font-normal leading-[22px] mt-2">{rec.title}</p>
        </div>
        <div className="px-4 pb-4 flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground font-normal leading-[20px]">{rec.description}</p>
          <BlogPreviewBox rec={rec} aeoScore={aeoScore} onOpenClick={() => setShowBlogPreview(true)} onAccept={onNavigateToBlogCanvas ?? onAccept} />
        </div>
      </div>

      {/* What to do next */}
      <div className="bg-background border border-border rounded-lg">
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] text-muted-foreground font-medium leading-[20px]">What to do next</p>
          <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
        </div>
        <Stepper steps={steps} />
      </div>

      {/* Competitor section */}
      {topComp && (
        <div className="bg-background border border-border rounded-lg">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[13px] text-muted-foreground font-medium leading-[20px]">
              What top competitor blog is cited by AI
            </p>
          </div>
          <div className="px-4 pb-4">
            <div className="bg-muted/50 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center text-background text-[10px] font-bold flex-shrink-0">
                    {topComp.name.charAt(0)}
                  </span>
                  <span className="text-[12px] text-foreground leading-[18px]">{topComp.name}</span>
                </div>
                {topComp.pageUrl && (
                  <a href={topComp.pageUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] text-primary hover:underline leading-[20px]">
                    {topComp.name} | Best result
                  </a>
                )}
                <p className="text-[14px] text-foreground leading-[20px] truncate">{topComp.llmSnippet}</p>
              </div>
              <AeoScoreBox score={rec.aeoScore?.competitor ?? 85} />
            </div>
          </div>
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

  const steps: Step[] = [
    {
      label: 'Review your AI-generated FAQ set',
      description: 'Read through the generated Q&As and edit any details to match your voice and local knowledge.',
      cta: { label: 'Preview FAQs', onClick: () => setShowFAQPreview(true) },
    },
    { label: 'Add FAQ schema to your website', description: 'Paste the structured JSON-LD schema generated by Birdeye into your site\'s <head> or page body.' },
    { label: 'Publish to Birdeye website page', description: 'Create a dedicated FAQ page and publish it through Birdeye to maximize AI citation potential.' },
    { label: 'Mark complete after publishing', description: 'Mark this task as complete to track your progress in Search AI score.' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {showFAQPreview && (
        <FAQPreviewModal
          rec={rec}
          onClose={() => setShowFAQPreview(false)}
          onNavigateToContentHub={onNavigateToContentHub}
        />
      )}

      {/* Score + why it matters */}
      <div className="flex gap-4 items-stretch">
        <div className="w-[30%] flex-shrink-0">
          <ScoreCard rec={rec} metrics={metrics} />
        </div>
        {rec.whyItWorks.length > 0 && (
          <div className="flex-1 bg-background border border-border rounded-lg p-4 min-w-0">
            <p className="text-[13px] text-muted-foreground font-medium leading-[20px] mb-0.5">Why does this matter to you</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mb-2">We analyzed and found these gaps</p>
            <ul className="flex flex-col gap-2">
              {rec.whyItWorks.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-[21px]">
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
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] text-muted-foreground font-medium leading-[20px]">How can you fix this gap</p>
          <p className="text-[14px] text-foreground font-normal leading-[22px] mt-2">{rec.title}</p>
        </div>
        <div className="px-4 pb-4 flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground font-normal leading-[20px]">{rec.description}</p>
          <FAQPreviewBox
            rec={rec}
            onPreviewClick={() => setShowFAQPreview(true)}
            onNavigateToContentHub={onNavigateToContentHub}
          />
        </div>
      </div>

      {/* What to do next */}
      <div className="bg-background border border-border rounded-lg">
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] text-muted-foreground font-medium leading-[20px]">What to do next</p>
          <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
        </div>
        <Stepper steps={steps} />
      </div>
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
          <div className="flex-1 bg-background border border-border rounded-lg p-4 min-w-0">
            <p className="text-[13px] text-muted-foreground font-medium leading-[20px] mb-0.5">Why does this recommendation matter to you</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mb-2">We analyzed your reports and found these gaps</p>
            <ul className="flex flex-col gap-2">
              {rec.whyItWorks.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {pt}
                </li>
              ))}
              {topComp && (
                <li className="flex items-start gap-2 text-[13px] text-foreground leading-[21px]">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-muted-foreground flex-shrink-0" />
                  {topComp.name} is the top cited competitor for {rec.category}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Overview card */}
      <div className="bg-background border border-border rounded-lg px-4 pt-4 pb-4">
        <p className="text-[14px] text-foreground font-normal leading-[22px]">{rec.title}</p>
        <p className="text-[13px] text-muted-foreground font-normal leading-[20px] mt-1">{rec.description}</p>
      </div>

      {/* What to do next */}
      {steps.length > 0 && (
        <div className="bg-background border border-border rounded-lg">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[13px] text-muted-foreground font-medium leading-[20px]">What to do next</p>
            <p className="text-[12px] text-muted-foreground leading-[18px] mt-0.5">Step by step guide on what you need to do next</p>
          </div>
          <Stepper steps={steps} />
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
    position: 1, positionDelta: 1,
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
    position: 2, positionDelta: 3,
    mentions: [{ initial: 'T', color: avatarColor('T') }, { initial: 'H', color: avatarColor('H') }, { initial: 'L', color: avatarColor('L') }],
    mentionsOverflow: 15,
    citations: [{ initial: 'L', color: avatarColor('L') }, { initial: 'C', color: avatarColor('C') }, { initial: 'Z', color: avatarColor('Z') }],
    response: 'Top real estate agents in Bathurst are active across multiple suburbs, with many offering complimentary pro...',
  },
  {
    date: 'Jan 8, 2026', location: 'Parkes, NSW', mentioned: true,
    position: 1, positionDelta: 2,
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

function AvatarStack({ items, overflow }: { items: { initial: string; color: string }[]; overflow: number }) {
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
        <span className="text-[12px] text-muted-foreground">+{overflow}</span>
      )}
    </div>
  )
}

// ── Competitor citations card ──────────────────────────────────────────────────

const MOCK_EVIDENCE_COMPETITORS: Recommendation['competitors'] = [
  {
    id: 'bowery', name: 'Bowery',
    pageUrl: '#',
    llmSnippet: 'Bowery maintains dedicated suburb service pages for key Dubbo areas including Dubbo South, Delroy Park, and Whylandra, consistently appearing in AI answers for suburb-specific real estate searches.',
    citedBy: [], totalCitations: 120, citationRank: 1, sourceGaps: [], whyTheyWin: '',
  },
  {
    id: 'ray-white', name: 'Ray White Dubbo',
    pageUrl: '#',
    llmSnippet: "Ray White Dubbo's suburb profile pages include median sale prices, days-on-market data, and local agent bios — making them the primary source Perplexity and Gemini cite for suburb-level property queries in Dubbo.",
    citedBy: [], totalCitations: 98, citationRank: 2, sourceGaps: [], whyTheyWin: '',
  },
  {
    id: 'mcgrath', name: 'McGrath Dubbo',
    pageUrl: '#',
    llmSnippet: 'McGrath Dubbo has suburb-specific pages targeting rural and lifestyle property seekers in surrounding areas like Narromine and Trangie, frequently cited by ChatGPT for rural Dubbo suburb searches.',
    citedBy: [], totalCitations: 87, citationRank: 3, sourceGaps: [], whyTheyWin: '',
  },
]

function CompetitorCitationsCard({ rec }: { rec: Recommendation }) {
  const [compareOpen, setCompareOpen] = useState(false)
  const [subScoresOpen, setSubScoresOpen] = useState(true)
  const rawCompetitors = rec.competitors.length > 0 ? rec.competitors : MOCK_EVIDENCE_COMPETITORS
  const competitors = rawCompetitors.slice(0, 3)
  const aeoCompScore = rec.aeoScore?.competitor ?? 79
  const aeoYourScore = rec.aeoScore?.you ?? 92
  const subScores = rec.aeoScore?.subScores ?? DEFAULT_BLOG_SUBSCORES

  const query = rec.promptsTriggeringThis[0]
    ?? 'Find real estate agencies near me specializing in residential property sales.'

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        <p className="text-[14px] font-semibold text-foreground leading-[22px]">
          Which top competitor blogs are cited by AI for &lsquo;{query}&rsquo;
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Analyze why competitors blog is getting cited instead of you
        </p>
      </div>

      {/* Competitor rows */}
      <div className="p-4 pt-0 space-y-4">
        {competitors.map(comp => {
          const initial = comp.name.charAt(0).toUpperCase()
          const badge = getBadgeStyle(initial)
          return (
            <div key={comp.id} className="rounded-lg bg-[var(--s-bg-secondary)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {initial}
                    </span>
                    <span className="text-[13px] text-foreground font-medium leading-none">{comp.name}</span>
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
                  <p className="text-[13px] text-foreground leading-[20px]">{comp.llmSnippet}</p>
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
            className="w-full flex items-start justify-between p-4 hover:bg-[var(--s-bg-secondary)] transition-colors text-left"
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
            <div className="overflow-x-auto">
              {/* Column header row */}
              <div className="flex items-center px-5 py-3 border-t border-border">
                <div className="w-[38%] flex-shrink-0">
                  <span className="text-[12px] text-muted-foreground">Score</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-[12px] bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full font-medium leading-none">You</span>
                  <Info size={13} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground flex-shrink-0" />
                </div>
                {competitors.map(comp => (
                  <div key={comp.id} className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-[12px] text-foreground leading-none">{comp.name}</span>
                    <Info size={13} strokeWidth={1.6} absoluteStrokeWidth className="text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>

              {/* AEO content score row — toggles sub-scores */}
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setSubScoresOpen(v => !v)}
                  className="w-full flex items-center px-5 py-4 hover:bg-muted/20 transition-colors text-left"
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
                  <div key={sub.name} className="flex items-center px-5 py-3.5 border-t border-border">
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
        <p className="text-[14px] font-semibold text-foreground leading-[22px]">
          How did AI sites respond to{' '}
          <span className="text-primary">{query}</span>
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          To generate this recommendation, we ran these prompts across LLMs. Here are the responses each AI site returned.
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex border-b border-border px-2">
        {LLM_EVIDENCE_PLATFORMS.map(platform => (
          <button
            key={platform}
            type="button"
            onClick={() => setActivePlatform(platform)}
            className={cn(
              'px-3 py-3 text-[13px] leading-none relative whitespace-nowrap',
              activePlatform === platform
                ? 'text-foreground font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-t'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {platform}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-2">
        {/* Header row */}
        <div className="flex items-center px-5 py-3 border-b border-border">
          <span className="text-[12px] text-muted-foreground font-medium w-[110px] flex-shrink-0">Date</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[130px] flex-shrink-0">Location</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[90px] flex-shrink-0 flex items-center gap-1">
            Mention
            <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 flex items-center justify-center text-[9px] text-muted-foreground flex-shrink-0">i</span>
          </span>
          <span className="text-[12px] text-muted-foreground font-medium w-[100px] flex-shrink-0">Position</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[140px] flex-shrink-0">All mentions</span>
          <span className="text-[12px] text-muted-foreground font-medium w-[110px] flex-shrink-0">Citations</span>
          <span className="text-[12px] text-muted-foreground font-medium flex-1 min-w-0">Response</span>
        </div>

        {MOCK_LLM_ROWS.map((row, i) => (
          <div
            key={i}
            className={cn('flex items-center px-5 py-5', i > 0 && 'border-t border-border')}
          >
            {/* Date */}
            <span className="text-[13px] text-foreground w-[110px] flex-shrink-0">{row.date}</span>

            {/* Location */}
            <span className="text-[13px] text-foreground w-[130px] flex-shrink-0">{row.location}</span>

            {/* Mention */}
            <div className="w-[90px] flex-shrink-0">
              {row.mentioned
                ? (
                  <div className="w-6 h-6 rounded-full bg-[#e8f5e9] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#43a047" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#fce8e6] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="#e53935" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )
              }
            </div>

            {/* Position */}
            <div className="w-[100px] flex-shrink-0">
              {row.position !== null
                ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] text-foreground">{row.position}</span>
                    {row.positionDelta !== null && row.positionDelta > 0 && (
                      <span className="text-[12px] text-[#43a047] font-medium">+{row.positionDelta}</span>
                    )}
                  </div>
                )
                : <span className="text-[13px] text-muted-foreground">—</span>
              }
            </div>

            {/* All mentions */}
            <div className="w-[140px] flex-shrink-0">
              {row.mentions.length > 0
                ? <AvatarStack items={row.mentions} overflow={row.mentionsOverflow} />
                : <span className="text-[12px] text-muted-foreground">No mention</span>
              }
            </div>

            {/* Citations */}
            <div className="w-[110px] flex-shrink-0">
              <AvatarStack items={row.citations} overflow={0} />
            </div>

            {/* Response */}
            <span className="text-[13px] text-foreground flex-1 min-w-0 truncate">{row.response}</span>
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
  /** Callback to mark the recommendation as completed (e.g. after publish) */
  onCompleteRec?: (id: string) => void
}

export function RecDetailView({ rec, metrics, onBack, onAccept, onReject, onNavigateToContentHub, onNavigateToBlogCanvas, onCompleteRec: _onCompleteRec }: RecDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'recommendation' | 'evidence'>('recommendation')

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} strokeWidth={1.6} absoluteStrokeWidth />
          </button>
          <p className="text-[15px] text-foreground truncate">{rec.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onReject && (
            <Button variant="outline" size="sm" onClick={() => onReject(rec.id)}>
              Reject
            </Button>
          )}
          <Button size="sm" onClick={() => onAccept(rec.id)}>
            Accept
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical size={16} strokeWidth={1.6} absoluteStrokeWidth />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Download</DropdownMenuItem>
              <DropdownMenuItem>Email recommendation</DropdownMenuItem>
              <DropdownMenuItem>Revert to pending</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab bar — all rec types */}
      <div className="flex border-b border-border px-6 flex-shrink-0">
        {(['recommendation', 'evidence'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-1 py-3 mr-6 text-[13px] leading-none relative',
              activeTab === tab
                ? 'text-foreground font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-t'
                : 'text-muted-foreground hover:text-foreground transition-colors',
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

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
