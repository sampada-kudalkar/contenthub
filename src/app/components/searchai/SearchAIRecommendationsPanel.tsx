/**
 * Search AI — Recommendations 2.0 (prototype)
 *
 * Design reference: Figma **Recommendations 2.0** — node `86-40295`
 * https://www.figma.com/design/h2UBW91Ecj9rwQHMJfZHE4/Recommendations-2.0?node-id=86-40295
 */
import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Filter, MoreVertical, CheckCircle2, XCircle } from "lucide-react";
import { MainCanvasViewHeader } from "@/app/components/layout/MainCanvasViewHeader";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { AppDataTable } from "@/app/components/ui/AppDataTable";
import { SearchAIBlogPreviewModal } from "@/app/components/searchai/SearchAIBlogPreviewModal";
import { L1_STRIP_ICON_STROKE_PX } from "@/app/components/l1StripIconTokens";

export type BlogSection = {
  heading?: string;
  body?: string;
  listItems?: string[];
  image?: string;
  imageAlt?: string;
};

export type SearchAIRecommendation = {
  id: string;
  title: string;
  description: string;
  type: "Blog" | "FAQ" | "Services" | "Photos" | "Google description";
  impact: "High" | "Medium" | "Low";
  category: string;
  locations: number;
  blogContent?: {
    heroImage: string;
    sections: BlogSection[];
    metaTitle: string;
    metaDescription: string;
    slug: string;
  };
};

const recommendationColumnHelper = createColumnHelper<SearchAIRecommendation>();

const MOCK_RECOMMENDATIONS: SearchAIRecommendation[] = [
  {
    id: "b1",
    title: "Create Dubbo Property Appraisal Hub Page",
    description: "Adding a dedicated appraisal hub page improves local search visibility for high-intent property queries in Dubbo.",
    type: "Blog",
    impact: "High",
    category: "Content",
    locations: 1,
    blogContent: {
      heroImage: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=80",
      metaTitle: "Free Property Appraisal in Dubbo | Raine & Horne",
      metaDescription: "Get a free, obligation-free property appraisal in Dubbo from Raine & Horne. Expert local advice on your home's current market value.",
      slug: "free-property-appraisal-dubbo",
      sections: [
        {
          body: "If you've been wondering what your property is worth in today's market, getting a professional appraisal is one of the smartest first steps. Whether you're thinking of selling, renting, refinancing, or simply planning ahead, a local property appraisal gives you a clear understanding of your home's current value. At Raine & Horne Dubbo, we help homeowners across Dubbo and surrounding areas with accurate, obligation-free property appraisals backed by local market knowledge and real buyer demand.",
        },
        {
          heading: "Why Get a Property Appraisal?",
          body: "A professional appraisal can help you:",
          listItems: [
            "Understand your home's likely sale price in the current market",
            "Estimate potential rental returns",
            "Decide whether now is the right time to sell",
            "Plan renovations that may increase value",
            "Compare your property against recent local sales",
            "Make informed financial decisions",
          ],
          image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80",
          imageAlt: "Suburban house exterior",
        },
        {
          heading: "Free Property Appraisals in Dubbo",
          body: "We offer free property appraisals for homeowners throughout Dubbo and nearby communities. Our team assesses factors such as:",
          listItems: [
            "Property size and land area",
            "Location and street appeal",
            "Number of bedrooms and bathrooms",
            "Renovations and overall presentation",
            "Comparable recent sales nearby",
            "Current market demand in your suburb",
          ],
          image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80",
          imageAlt: "Property for sale",
        },
        {
          heading: "Areas We Service",
          body: "We cover all major suburbs and surrounding areas, including:",
          listItems: [
            "Central Dubbo",
            "South Dubbo",
            "West Dubbo",
            "East Dubbo",
            "North Dubbo",
            "Delroy Park",
            "Keswick Estate",
            "Grangewood",
            "Brocklehurst",
            "Wongarbon",
            "Eumungerie and nearby regions",
          ],
          image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80",
          imageAlt: "Dubbo neighbourhood",
        },
        {
          heading: "Fast Turnaround Times",
          body: "We understand timing matters. Most property appraisals are completed within 24–48 hours, depending on location and property type.",
        },
        {
          heading: "Thinking of Selling?",
          body: "Many homeowners request an appraisal before deciding whether to list. A professional market estimate can help you understand:",
          listItems: [
            "If current market conditions suit your goals",
            "What buyers may pay today",
            "How to prepare your home for sale",
            "Whether small improvements could boost price",
          ],
        },
        {
          heading: "Request Your Free Dubbo Property Appraisal Today",
          body: "If you'd like to know what your property could be worth, the team at Raine & Horne Dubbo is here to help. Get in touch today to book your free, no-obligation appraisal and receive expert local advice you can trust.",
        },
      ],
    },
  },
  {
    id: "b2",
    title: "Create Dubbo Suburb Service Pages",
    description: "Suburb-specific landing pages for sales and rentals improve search ranking for location-based queries across Dubbo.",
    type: "Blog",
    impact: "High",
    category: "Content",
    locations: 1,
    blogContent: {
      heroImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80",
      metaTitle: "Dubbo Property Sales & Rentals by Suburb | Raine & Horne",
      metaDescription: "Find expert real estate services in Dubbo by suburb. Raine & Horne helps buyers, sellers, landlords and tenants across all Dubbo areas.",
      slug: "dubbo-suburb-property-sales-rentals",
      sections: [
        {
          body: "If you're thinking of selling, leasing, buying, or renting in Dubbo, working with a local team who understands each suburb can make all the difference. Every part of Dubbo has its own buyer demand, rental trends, property styles, and community appeal. At Raine & Horne Dubbo, we know that property decisions are local. Whether you need help selling your family home, managing an investment property, or finding the right rental, our experienced team is here to guide you.",
        },
        {
          heading: "Why Suburb Knowledge Matters",
          body: "The Dubbo market is not one-size-fits-all. A strategy that works in one suburb may not be the best fit for another. For example:",
          listItems: [
            "Family homes in South Dubbo may attract owner-occupiers looking for schools and parks",
            "Investment properties near the CBD may appeal to professionals seeking convenience",
            "Larger homes in newer estates may suit growing families",
          ],
          image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=900&q=80",
          imageAlt: "Aerial view of Dubbo suburb",
        },
        {
          heading: "Areas We Service in Dubbo",
          body: "We assist clients across Dubbo and surrounding areas, including:",
          listItems: [
            "South Dubbo — popular with families and owner-occupiers, offering established homes, schools, and convenient amenities",
            "Central Dubbo / CBD — ideal for buyers seeking lifestyle and convenience",
            "West Dubbo — a mix of residential living and strong rental appeal",
            "East Dubbo — known for quality homes, open space, and a strong community feel",
            "North Dubbo — affordable options with excellent access to major roads and facilities",
            "Delroy Park — a well-regarded area with golf course surroundings and modern homes",
            "Keswick Estate — popular with buyers seeking modern builds, larger blocks, and contemporary layouts",
          ],
          image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&q=80",
          imageAlt: "Dubbo residential street",
        },
        {
          heading: "Property Sales in Dubbo Suburbs",
          body: "If you're selling, we provide:",
          listItems: [
            "Accurate suburb-based pricing advice",
            "Targeted marketing to active buyers",
            "Professional presentation guidance",
            "Skilled negotiation to maximise results",
            "Ongoing support from appraisal to settlement",
          ],
        },
        {
          heading: "Rental & Property Management Services",
          body: "For landlords and investors, we offer:",
          listItems: [
            "Rental appraisals based on local demand",
            "Quality tenant screening",
            "Routine inspections and maintenance coordination",
            "Lease management and communication",
            "Strategies to maximise rental returns",
          ],
        },
        {
          heading: "Why Choose Raine & Horne Dubbo?",
          body: "Our strong reputation, trusted local presence, and commitment to personalised service help property owners achieve better outcomes with less stress. We combine recognised brand strength with real local knowledge of the Dubbo market.",
        },
        {
          heading: "Looking to Buy, Sell or Rent in Dubbo?",
          body: "No matter which suburb you're focused on, our team can help you make the right move. Contact Raine & Horne Dubbo today for expert advice, a free appraisal, or support with your next property decision.",
        },
      ],
    },
  },
];

const FILTER_CHIPS = ["All", "High impact", "Medium impact", "Low impact"] as const;

function impactVariant(impact: SearchAIRecommendation["impact"]): "default" | "secondary" | "outline" {
  if (impact === "High") return "default";
  if (impact === "Medium") return "secondary";
  return "outline";
}

export function SearchAIRecommendationsPanel() {
  const [previewRec, setPreviewRec] = useState<SearchAIRecommendation | null>(null);

  const columns = useMemo(
    () => [
      recommendationColumnHelper.accessor("title", {
        id: "recommendation",
        header: "Recommendations",
        meta: { settingsLabel: "Recommendations" },
        size: 280,
        enableSorting: true,
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{rec.category}</span>
              <span className="font-medium text-foreground">{rec.title}</span>
            </div>
          );
        },
      }),
      recommendationColumnHelper.accessor("type", {
        id: "type",
        header: "Type",
        meta: { settingsLabel: "Type" },
        size: 100,
        enableSorting: true,
        cell: (info) => (
          <Badge variant="outline" className="text-[11px]">
            {info.getValue()}
          </Badge>
        ),
      }),
      recommendationColumnHelper.accessor("impact", {
        id: "impact",
        header: "Impact",
        meta: { settingsLabel: "Impact" },
        size: 120,
        enableSorting: true,
        cell: (info) => {
          const impact = info.getValue();
          return (
            <Badge
              variant={impact === "High" ? "destructive" : "secondary"}
              className={
                impact === "High"
                  ? "border-red-100 bg-red-50 text-[length:var(--font-size)] text-red-600 hover:bg-red-50"
                  : "text-[length:var(--font-size)]"
              }
            >
              {impact}
            </Badge>
          );
        },
      }),
      recommendationColumnHelper.accessor("locations", {
        id: "locations",
        header: "Locations",
        meta: { settingsLabel: "Locations" },
        size: 100,
        enableSorting: true,
        cell: (info) => <span className="text-foreground">{info.getValue()}</span>,
      }),
      recommendationColumnHelper.display({
        id: "actions",
        header: "",
        meta: { settingsLabel: "Actions" },
        size: 160,
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <div className="flex items-center gap-2">
              {rec.type === "Blog" && rec.blogContent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewRec(rec);
                  }}
                >
                  Preview blog
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                <MoreVertical size={16} strokeWidth={L1_STRIP_ICON_STROKE_PX} absoluteStrokeWidth />
              </Button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <MainCanvasViewHeader
        title="AI recommendations"
        description="Enhance your business's search ranking with AI-driven recommendations and one-click optimization"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="shrink-0">
              <MoreVertical size={16} strokeWidth={L1_STRIP_ICON_STROKE_PX} absoluteStrokeWidth />
            </Button>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter size={16} strokeWidth={L1_STRIP_ICON_STROKE_PX} absoluteStrokeWidth />
            </Button>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-8 pt-6">
        <div className="mx-auto flex w-full flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-blue-50 dark:bg-blue-950/40 flex h-[104px] flex-col justify-between rounded-xl p-6">
              <span className="text-3xl font-semibold tabular-nums text-foreground">2</span>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-foreground">Pending</span>
              </div>
            </div>

            <div className="bg-card flex h-[104px] flex-col justify-between rounded-xl border border-border p-6">
              <span className="text-3xl font-semibold tabular-nums text-foreground">0</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} strokeWidth={L1_STRIP_ICON_STROKE_PX} absoluteStrokeWidth className="text-emerald-500" />
                <span className="text-xs font-medium text-foreground">Accepted</span>
              </div>
            </div>

            <div className="bg-card flex h-[104px] flex-col justify-between rounded-xl border border-border p-6">
              <span className="text-3xl font-semibold tabular-nums text-foreground">0</span>
              <div className="flex items-center gap-2">
                <XCircle size={12} strokeWidth={L1_STRIP_ICON_STROKE_PX} absoluteStrokeWidth className="text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Rejected</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <AppDataTable<SearchAIRecommendation>
              tableId="searchai.recommendations"
              data={MOCK_RECOMMENDATIONS}
              columns={columns}
              initialSorting={[{ id: "recommendation", desc: false }]}
              getRowId={(r) => r.id}
              columnSheetTitle="Recommendation columns"
              className="min-w-0 px-0"
              hideColumnsButton
            />
          </div>
        </div>
      </div>

      <SearchAIBlogPreviewModal
        rec={previewRec}
        open={previewRec !== null}
        onClose={() => setPreviewRec(null)}
      />
    </div>
  );
}
