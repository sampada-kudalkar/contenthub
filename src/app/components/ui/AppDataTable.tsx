"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { AppDataTableColumnSettingsTrigger } from "@/app/components/ui/AppDataTableColumnSettingsTrigger";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnSizingState,
  type SortingState,
  type VisibilityState,
  type OnChangeFn,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { cn } from "@/app/components/ui/utils";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import {
  type AppDataTablePersistedSlice,
  buildAppDataTableStorageKey,
} from "@/app/components/ui/appDataTableTypes";
import {
  type AppDataTableRowDensity,
  APP_DATA_TABLE_DENSITY_CELL,
  APP_DATA_TABLE_DENSITY_HEAD,
  APP_DATA_TABLE_DENSITY_RESIZE_HANDLE_H,
} from "@/app/components/ui/appDataTableRowDensity";
import {
  buildLayoutInputsFromColumnDefs,
  buildSizeWeightsFromColumnDefs,
  distributeWidths,
  resolveWeights,
} from "@/app/components/ui/appDataTableColumnSizing";
import { ColumnSettingsSheet, type ColumnSettingsSheetColumn } from "@/app/components/ui/ColumnSettingsSheet";

function applyTableUpdater<T>(updater: T | ((old: T) => T), old: T): T {
  return typeof updater === "function" ? (updater as (o: T) => T)(old) : updater;
}

/** Avoid persisting when TanStack passes a no-op updater — prevents render loops in layout effects. */
function isSameColumnSizing(next: ColumnSizingState, prev: ColumnSizingState): boolean {
  if (next === prev) return true;
  const pk = Object.keys(prev);
  const nk = Object.keys(next);
  if (pk.length !== nk.length) return false;
  for (const k of pk) {
    if (prev[k] !== next[k]) return false;
  }
  return true;
}

/** Non-frozen header cells: pin to top of the table scrollport; z below inline leader heads (30+). */
const STICKY_SCROLLING_HEAD_CLASS = "sticky top-0 z-[25] bg-background";
const STICKY_SCROLLING_CELL_CLASS = "relative z-0";

/** Leading sticky columns share background + row state; `left` / `z-index` are set inline from column widths. */
const STICKY_LEADER_HEAD_BASE =
  "sticky top-0 border-r border-transparent bg-background transition-[box-shadow,border-color] duration-200 ease-out overflow-visible";
const STICKY_LEADER_CELL_BASE =
  "sticky border-r border-transparent bg-background transition-[box-shadow,border-color] duration-200 ease-out overflow-visible group-hover/table-row:bg-muted/30 group-data-[state=selected]/table-row:bg-muted";
/** Applied on the **last** leading sticky column when `scrollLeft > 0` (edge of the frozen band). */
const STICKY_EDGE_ACTIVE_CLASS =
  "border-border shadow-[8px_0_24px_-10px_rgba(15,23,42,0.1)] dark:shadow-[8px_0_28px_-12px_rgba(0,0,0,0.55)]";

function sumColumnWidthsBefore(beforeIndex: number, getSizeAt: (i: number) => number): number {
  let sum = 0;
  for (let i = 0; i < beforeIndex; i++) sum += getSizeAt(i);
  return sum;
}

function mergeColumnOrder(saved: string[], defaults: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of saved) {
    if (defaults.includes(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of defaults) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function buildDefaultSlice(columnIds: string[]): AppDataTablePersistedSlice {
  return {
    columnOrder: [...columnIds],
    columnVisibility: Object.fromEntries(columnIds.map((id) => [id, true])),
    columnSizing: {},
  };
}

export interface AppDataTableProps<TData> {
  /** Stable id for session persistence (e.g. `campaigns.list`). */
  tableId: string;
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  /** When false, skip sessionStorage (Storybook / tests). Default true. */
  persist?: boolean;
  onRowClick?: (row: TData) => void;
  getRowId?: (originalRow: TData, index: number) => string;
  emptyState?: ReactNode;
  /** Extra toolbar controls to the left of the Columns button. */
  toolbarLeft?: ReactNode;
  /** Optional title row: title left, Columns (label) right; `toolbarLeft` on the row below. */
  toolbarTitle?: ReactNode;
  /** Sheet title override. */
  columnSheetTitle?: string;
  /** Initial sort (e.g. Storybook). */
  initialSorting?: SortingState;
  /** Root wrapper classes (e.g. remove horizontal padding when nested in a card). */
  className?: string;
  /** Marks row as selected (e.g. `data-state="selected"` for directory tables). */
  isRowSelected?: (row: TData) => boolean;
  /**
   * Pin the first **visible** column while scrolling horizontally (primary label column stays readable).
   * Default true for all directory `AppDataTable` instances; set false only for rare layouts that conflict with sticky.
   */
  stickyFirstColumn?: boolean;
  /**
   * Pin the first N **visible** columns (left offsets stack). When {@link stickyFirstColumn} is false, this is ignored.
   * Default **1** when omitted. Use **0** with `stickyFirstColumn` true to disable horizontal pinning.
   */
  stickyLeadingColumnCount?: number;
  /** When true, omit the built-in Columns control; use with `columnSheetOpen` + `onColumnSheetOpenChange` and {@link AppDataTableColumnSettingsTrigger} in the page header. */
  hideColumnsButton?: boolean;
  /** Controlled column sheet open state (pair with `onColumnSheetOpenChange`). */
  columnSheetOpen?: boolean;
  onColumnSheetOpenChange?: (open: boolean) => void;
  /**
   * Keep the toolbar row (filters + Columns) pinned to the top of the **nearest vertical scroll ancestor**.
   * Use when the table lives inside a scrollable canvas (e.g. Surveys).
   */
  stickyToolbar?: boolean;
  /**
   * Scroll the table body vertically **inside** this component (`overflow-auto` on the table scrollport).
   * Keeps thead `position: sticky` reliable (parent flex column should use `min-h-0 flex-1`).
   */
  scrollableBody?: boolean;
  /**
   * Row vertical padding + header min-height. **`default`** = compact reference (Payments/Contacts directory);
   * **`medium`** = legacy AppDataTable spacing; **`large`** = extra comfort. See `appDataTableRowDensity.ts`.
   * @default "medium"
   */
  rowDensity?: AppDataTableRowDensity;
}

export function AppDataTable<TData>({
  tableId,
  data,
  columns,
  persist = true,
  onRowClick,
  getRowId,
  emptyState,
  toolbarLeft,
  toolbarTitle,
  columnSheetTitle,
  initialSorting,
  className,
  isRowSelected,
  hideColumnsButton = false,
  columnSheetOpen: columnSheetOpenProp,
  onColumnSheetOpenChange,
  stickyFirstColumn = true,
  stickyLeadingColumnCount: stickyLeadingColumnCountProp,
  stickyToolbar = false,
  scrollableBody = false,
  rowDensity = "medium",
}: AppDataTableProps<TData>) {
  const densityCell = APP_DATA_TABLE_DENSITY_CELL[rowDensity];
  const densityHead = APP_DATA_TABLE_DENSITY_HEAD[rowDensity];
  const densityResizeH = APP_DATA_TABLE_DENSITY_RESIZE_HANDLE_H[rowDensity];
  if (
    process.env.NODE_ENV !== "production" &&
    hideColumnsButton &&
    (columnSheetOpenProp === undefined || onColumnSheetOpenChange === undefined)
  ) {
    throw new Error(
      "AppDataTable: hideColumnsButton requires columnSheetOpen and onColumnSheetOpenChange so the header trigger can control the sheet.",
    );
  }

  const columnSheetControlled =
    columnSheetOpenProp !== undefined && onColumnSheetOpenChange !== undefined;
  const [columnSheetOpenInternal, setColumnSheetOpenInternal] = useState(false);
  const columnSheetOpen = columnSheetControlled ? columnSheetOpenProp : columnSheetOpenInternal;
  const setColumnSheetOpen = useCallback(
    (open: boolean) => {
      if (columnSheetControlled) onColumnSheetOpenChange(open);
      else setColumnSheetOpenInternal(open);
    },
    [columnSheetControlled, onColumnSheetOpenChange],
  );
  const columnIds = useMemo(
    () => columns.map((c) => String(c.id ?? "")).filter(Boolean),
    [columns],
  );

  const defaultSlice = useMemo(() => buildDefaultSlice(columnIds), [columnIds]);

  const storageKey = persist && tableId ? buildAppDataTableStorageKey(tableId) : undefined;
  const [persisted, setPersisted] = usePersistedState<AppDataTablePersistedSlice>(
    storageKey,
    defaultSlice,
  );

  const merged = useMemo((): AppDataTablePersistedSlice => {
    return {
      columnOrder: mergeColumnOrder(persisted.columnOrder, columnIds),
      columnVisibility: { ...defaultSlice.columnVisibility, ...persisted.columnVisibility },
      columnSizing: persisted.columnSizing ?? {},
    };
  }, [persisted, columnIds, defaultSlice.columnVisibility]);

  const [sorting, setSorting] = useState<SortingState>(() => initialSorting ?? []);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutW, setLayoutW] = useState(0);
  /** Sticky first-column edge shadow only while horizontally scrolled (see `STICKY_EDGE_ACTIVE_CLASS`). */
  const [stickyHScroll, setStickyHScroll] = useState(false);

  const setColumnOrder: OnChangeFn<ColumnOrderState> = useCallback(
    (updater) => {
      setPersisted((prev) => {
        const current = mergeColumnOrder(prev.columnOrder, columnIds);
        const next = applyTableUpdater(updater, current);
        return { ...prev, columnOrder: mergeColumnOrder(next, columnIds) };
      });
    },
    [columnIds, setPersisted],
  );

  const setColumnVisibility: OnChangeFn<VisibilityState> = useCallback(
    (updater) => {
      setPersisted((prev) => ({
        ...prev,
        columnVisibility: applyTableUpdater(updater, prev.columnVisibility),
      }));
    },
    [setPersisted],
  );

  const setColumnSizing: OnChangeFn<ColumnSizingState> = useCallback(
    (updater) => {
      setPersisted((prev) => {
        const nextSizing = applyTableUpdater(updater, prev.columnSizing);
        if (isSameColumnSizing(nextSizing, prev.columnSizing)) return prev;
        return { ...prev, columnSizing: nextSizing };
      });
    },
    [setPersisted],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnOrder: merged.columnOrder,
      columnVisibility: merged.columnVisibility,
      columnSizing: merged.columnSizing,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getRowId,
    defaultColumn: {
      /** Directory tables: sort any accessor column unless the column opts out (`enableSorting: false`). */
      enableSorting: true,
      minSize: 72,
      maxSize: 640,
      size: 160,
    },
  });

  const visibleLeafCount = table.getVisibleLeafColumns().length;
  const stickyN =
    stickyLeadingColumnCountProp !== undefined ? stickyLeadingColumnCountProp : 1;
  const effectiveStickyCount = stickyFirstColumn
    ? Math.min(Math.max(0, stickyN), visibleLeafCount)
    : 0;

  const visibleOrderedIds = useMemo(() => {
    return merged.columnOrder.filter((id) => {
      if (!columnIds.includes(id)) return false;
      return merged.columnVisibility[id] !== false;
    });
  }, [merged.columnOrder, merged.columnVisibility, columnIds]);

  const sizingEmpty = Object.keys(merged.columnSizing).length === 0;

  useLayoutEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w != null) setLayoutW(Math.floor(w));
    });
    ro.observe(el);
    setLayoutW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!sizingEmpty || layoutW < 1 || visibleOrderedIds.length === 0) return;
    const inputs = buildLayoutInputsFromColumnDefs(columns, visibleOrderedIds);
    const weights = resolveWeights(
      visibleOrderedIds.length,
      buildSizeWeightsFromColumnDefs(columns, visibleOrderedIds),
    );
    const sizes = distributeWidths(layoutW, inputs, weights);
    if (Object.keys(sizes).length > 0) {
      setColumnSizing(() => sizes);
    }
  }, [layoutW, sizingEmpty, visibleOrderedIds, columns, setColumnSizing]);

  const sheetColumns: ColumnSettingsSheetColumn[] = table.getAllLeafColumns().map((col) => ({
    id: col.id,
    label: (col.columnDef.meta as { settingsLabel?: string } | undefined)?.settingsLabel ?? col.id,
    visible: col.getIsVisible(),
    canHide: col.getCanHide(),
  }));

  const handleReorderColumnIds = useCallback(
    (orderedIds: string[]) => {
      setColumnOrder(mergeColumnOrder(orderedIds, columnIds));
    },
    [columnIds, setColumnOrder],
  );

  const handleReset = useCallback(() => {
    setPersisted(defaultSlice);
    setSorting(initialSorting ?? []);
  }, [defaultSlice, setPersisted, initialSorting]);

  const columnsLabel = columnSheetTitle ?? "Columns";

  const columnTotalPx = Math.max(1, table.getTotalSize());
  /** Sum of column widths — floor for `minWidth` and horizontal scroll when wider than the scrollport. */
  const tableMinWidthPx = columnTotalPx;
  /**
   * At least `tableMinWidthPx`; when the table is narrower than the scrollport, grow to `layoutW` so
   * row borders span the container edge-to-edge (display only — does not change persisted column sizes).
   */
  const tableWidthPx = layoutW > 0 ? Math.max(layoutW, tableMinWidthPx) : tableMinWidthPx;

  const setStickyEdgeFromScrollLeft = useCallback((scrollLeft: number) => {
    const next = scrollLeft > 1;
    setStickyHScroll((prev) => (prev !== next ? next : prev));
  }, []);

  const handleTableHorizontalScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (effectiveStickyCount === 0) return;
      setStickyEdgeFromScrollLeft(e.currentTarget.scrollLeft);
    },
    [effectiveStickyCount, setStickyEdgeFromScrollLeft],
  );

  useLayoutEffect(() => {
    if (effectiveStickyCount === 0) {
      setStickyHScroll(false);
      return;
    }
    const el = layoutRef.current;
    setStickyEdgeFromScrollLeft(el?.scrollLeft ?? 0);
  }, [
    effectiveStickyCount,
    setStickyEdgeFromScrollLeft,
    layoutW,
    tableMinWidthPx,
    data.length,
    visibleOrderedIds,
  ]);

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const showToolbar =
    Boolean(toolbarTitle) || Boolean(toolbarLeft) || !hideColumnsButton;

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 px-6",
        scrollableBody && "min-h-0 flex-1",
        className,
      )}
    >
      {showToolbar ? (
        <div
          className={cn(
            "flex shrink-0 flex-col gap-2",
            stickyToolbar &&
              "sticky top-0 z-[25] shrink-0 border-b border-border bg-background pb-2 pt-0",
          )}
        >
          {toolbarTitle ? (
            <>
              <div className="flex min-h-0 items-center justify-between gap-2">
                <div className="min-w-0 flex-1 text-sm font-medium text-foreground">{toolbarTitle}</div>
                {!hideColumnsButton ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => setColumnSheetOpen(true)}
                  >
                    <Columns3 className="size-4 shrink-0" aria-hidden />
                    Columns
                  </Button>
                ) : null}
              </div>
              {toolbarLeft ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">{toolbarLeft}</div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbarLeft}</div>
              {!hideColumnsButton ? (
                <AppDataTableColumnSettingsTrigger
                  sheetTitle={columnsLabel}
                  onClick={() => setColumnSheetOpen(true)}
                />
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <ColumnSettingsSheet
        open={columnSheetOpen}
        onOpenChange={setColumnSheetOpen}
        title={columnsLabel}
        columns={sheetColumns}
        onReorder={handleReorderColumnIds}
        onToggleVisibility={(id, visible) => {
          table.getColumn(id)?.toggleVisibility(visible);
        }}
        onReset={handleReset}
      />

      <div
        ref={layoutRef}
        className={cn(
          "relative w-full min-w-0",
          scrollableBody ? "min-h-0 flex-1 overflow-auto" : "min-h-0 overflow-x-auto",
        )}
        onScroll={effectiveStickyCount > 0 ? handleTableHorizontalScroll : undefined}
      >
        <Table
          withScrollContainer={false}
          className={cn(
            "table-fixed w-full text-[length:var(--font-size)] leading-normal",
            effectiveStickyCount > 0 && "isolate",
          )}
          style={{ width: tableWidthPx, minWidth: tableMinWidthPx }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                {headerGroup.headers.map((header, headerIndex) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const sortedActive = sorted === "asc" || sorted === "desc";
                  const isStickyLeader =
                    effectiveStickyCount > 0 && headerIndex < effectiveStickyCount && !header.isPlaceholder;
                  const isLastStickyLeader = isStickyLeader && headerIndex === effectiveStickyCount - 1;
                  const stickyLeftPx = isStickyLeader
                    ? sumColumnWidthsBefore(headerIndex, (i) => headerGroup.headers[i].getSize())
                    : undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-auto text-left align-middle text-[length:var(--table-label-size)] font-medium leading-normal text-muted-foreground",
                        densityHead,
                        isStickyLeader ? "overflow-visible" : "overflow-hidden",
                        (effectiveStickyCount === 0 || !isStickyLeader) && STICKY_SCROLLING_HEAD_CLASS,
                        header.column.getIsResizing() && "select-none",
                        isStickyLeader &&
                          effectiveStickyCount > 0 &&
                          cn(
                            STICKY_LEADER_HEAD_BASE,
                            isLastStickyLeader && stickyHScroll && STICKY_EDGE_ACTIVE_CLASS,
                          ),
                      )}
                      style={{
                        width: header.getSize(),
                        ...(isStickyLeader
                          ? {
                              left: stickyLeftPx,
                              zIndex: 30 + headerIndex,
                            }
                          : {}),
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex min-w-0 items-center gap-1 pr-2">
                          {canSort ? (
                            <button
                              type="button"
                              className="flex min-w-0 items-center gap-1 rounded-md py-1 text-left text-[length:var(--table-label-size)] leading-normal font-medium text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <span
                                className={cn(
                                  "min-w-0 truncate",
                                  sortedActive && "font-semibold text-foreground",
                                )}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              {sorted === "asc" ? (
                                <ChevronUp
                                  className="size-3 shrink-0 text-foreground/80"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              ) : (
                                <ChevronDown
                                  className={cn(
                                    "size-3 shrink-0 transition-colors",
                                    sorted === "desc"
                                      ? "text-foreground/80"
                                      : "text-muted-foreground opacity-50",
                                  )}
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              )}
                            </button>
                          ) : (
                            <span className="min-w-0 truncate font-medium">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                          )}
                        </div>
                      )}
                      {header.column.getCanResize() ? (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${header.column.id}`}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute top-1/2 right-0 z-10 flex w-3 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center hover:[&>span]:bg-primary",
                            densityResizeH,
                          )}
                          data-active={header.column.getIsResizing()}
                        >
                          <span
                            className={cn(
                              "pointer-events-none block h-[13px] w-px shrink-0 rounded-full bg-border transition-colors",
                              header.column.getIsResizing() && "bg-primary",
                            )}
                            aria-hidden
                          />
                        </div>
                      ) : null}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const visibleCells = row.getVisibleCells();
              return (
                <TableRow
                  key={row.id}
                  data-state={isRowSelected?.(row.original) ? "selected" : undefined}
                  className={cn(
                    "group/table-row border-b border-border hover:bg-muted/30 data-[state=selected]:bg-muted",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                {visibleCells.map((cell, cellIndex) => {
                  const isStickyLeader = effectiveStickyCount > 0 && cellIndex < effectiveStickyCount;
                  const isLastStickyLeader = isStickyLeader && cellIndex === effectiveStickyCount - 1;
                  const stickyLeftPx = isStickyLeader
                    ? sumColumnWidthsBefore(cellIndex, (i) => visibleCells[i].column.getSize())
                    : undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "min-w-0 whitespace-normal align-middle text-[length:var(--font-size)] leading-normal text-foreground",
                        densityCell,
                        isStickyLeader ? "overflow-visible" : "overflow-hidden",
                        effectiveStickyCount > 0 && !isStickyLeader && STICKY_SCROLLING_CELL_CLASS,
                        isStickyLeader &&
                          cn(
                            STICKY_LEADER_CELL_BASE,
                            isLastStickyLeader && stickyHScroll && STICKY_EDGE_ACTIVE_CLASS,
                          ),
                      )}
                      style={{
                        width: cell.column.getSize(),
                        ...(isStickyLeader
                          ? {
                              left: stickyLeftPx,
                              zIndex: 20 + cellIndex,
                            }
                          : {}),
                      }}
                      onClick={
                        cell.column.id === "actions" ||
                        (cell.column.columnDef.meta as { stopRowClick?: boolean } | undefined)?.stopRowClick
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
