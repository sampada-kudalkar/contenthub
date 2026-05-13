import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { MODAL_OVERLAY_VISUAL_CLASS } from "@/app/components/ui/modalOverlayClasses";
import { cn } from "@/app/components/ui/utils";
import { L1_STRIP_ICON_STROKE_PX } from "@/app/components/l1StripIconTokens";
import type { SearchAIRecommendation } from "./SearchAIRecommendationsPanel";

interface SearchAIBlogPreviewModalProps {
  rec: SearchAIRecommendation | null;
  open: boolean;
  onClose: () => void;
}

export function SearchAIBlogPreviewModal({ rec, open, onClose }: SearchAIBlogPreviewModalProps) {
  const blog = rec?.blogContent;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            MODAL_OVERLAY_VISUAL_CLASS,
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-[50%] left-[50%] z-50 flex max-h-[90vh] w-[calc(100vw-48px)] max-w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          {rec && blog ? (
            <>
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{rec.title}</span>
                  <Badge variant="outline" className="shrink-0 text-[11px]">Blog</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  onClick={onClose}
                  aria-label="Close preview"
                >
                  <X size={16} strokeWidth={L1_STRIP_ICON_STROKE_PX} absoluteStrokeWidth />
                </Button>
              </div>

              {/* Scrollable body */}
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col">
                  {/* Hero image */}
                  <img
                    src={blog.heroImage}
                    alt={rec.title}
                    className="h-[220px] w-full object-cover"
                  />

                  <div className="px-8 pb-8 pt-6">
                    {/* Article meta */}
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">AI generated</Badge>
                      <span className="text-xs text-muted-foreground">Raine &amp; Horne AI</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">May 2025</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">5 min read</span>
                    </div>

                    {/* Sections */}
                    <div className="flex flex-col gap-4">
                      {blog.sections.map((section, i) => (
                        <div key={i}>
                          {section.heading && (
                            <h2 className="mb-2 text-base font-semibold text-foreground">
                              {section.heading}
                            </h2>
                          )}
                          {section.body && (
                            <p className="text-sm leading-relaxed text-foreground">
                              {section.body}
                            </p>
                          )}
                          {section.listItems && section.listItems.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1 pl-4">
                              {section.listItems.map((item, j) => (
                                <li key={j} className="list-disc text-sm leading-relaxed text-foreground">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                          {section.image && (
                            <img
                              src={section.image}
                              alt={section.imageAlt ?? section.heading ?? ""}
                              className="mt-4 h-[200px] w-full rounded-lg object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* SEO metadata footer */}
                    <div className="mt-8 rounded-lg border border-border bg-muted/40 px-4 py-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        SEO metadata
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2 text-xs">
                          <span className="w-28 shrink-0 text-muted-foreground">Meta title</span>
                          <span className="text-foreground">{blog.metaTitle}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="w-28 shrink-0 text-muted-foreground">Slug</span>
                          <span className="font-mono text-foreground">/{blog.slug}</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="w-28 shrink-0 text-muted-foreground">Meta description</span>
                          <span className="text-foreground">{blog.metaDescription}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
