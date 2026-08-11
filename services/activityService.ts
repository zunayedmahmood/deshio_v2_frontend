import axios from '@/lib/axios';

export type BusinessHistoryCategory =
  | 'all'
  | 'product-dispatches'
  | 'orders'
  | 'purchase-orders'
  | 'store-assignments'
  | 'products';

export interface BusinessHistoryWho {
  id: number;
  type: string;
  name: string;
  email?: string;
}

export interface BusinessHistoryWhen {
  timestamp: string;
  formatted: string;
  human?: string;
}

export type BusinessHistoryChanges = Record<string, { from: any; to: any }>;

export interface BusinessHistoryWhat {
  action: string; // created|updated|deleted
  description: string;
  fields_changed?: string[];
  changes?: BusinessHistoryChanges;
  action_label?: string;
  human_changes?: Array<{ field?: string; from?: any; to?: any; sentence?: string; raw_field?: string }>;
  [key: string]: any;
}

export interface BusinessHistorySubject {
  id: number;
  type: string;
  raw_type?: string;
  data?: any;
}

export interface ActivityLogEntry {
  id: number;
  category: Exclude<BusinessHistoryCategory, 'all'>;
  who: BusinessHistoryWho;
  when: BusinessHistoryWhen;
  what: BusinessHistoryWhat;
  subject: BusinessHistorySubject;
}

export interface ActivityLogParams {
  category?: BusinessHistoryCategory;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  event?: string; // created|updated|deleted
  per_page?: number;
  page?: number;
  /** Fetch every available backend page for the selected filters. */
  fetch_all?: boolean;
  /** Allow endpoint-specific filters (order_id, product_id, dispatch_id, etc.) */
  [key: string]: any;
}

// Backward/compat alias used by UI components
export type BusinessHistoryEntry = ActivityLogEntry;

type Paginated<T> = {
  data: T[];
  links?: any;
  meta?: any;
};

type StatsResponse = {
  total_activities: number;
  date_range?: { from: string; to: string };
  by_model?: Record<string, number>;
  by_event?: Record<string, number>;
  most_active_users?: Array<{ id: number; type: string; name: string; email?: string; activity_count: number }>;
};

const endpointForCategory: Record<Exclude<BusinessHistoryCategory, 'all'>, string> = {
  'product-dispatches': '/business-history/product-dispatches',
  orders: '/business-history/orders',
  'purchase-orders': '/business-history/purchase-orders',
  'store-assignments': '/business-history/store-assignments',
  products: '/business-history/products',
};

/**
 * Supports BOTH response shapes:
 * 1) Docs shape:      { data: [...], links, meta }
 * 2) Your controller: { success:true, data:{ activities:[...], pagination:{...} } }
 */
function extractItemsAndMeta(payload: any): { items: any[]; meta?: any; links?: any } {
  // Controller shape
  if (payload?.data?.activities && Array.isArray(payload.data.activities)) {
    return { items: payload.data.activities, meta: payload.data.pagination, links: payload.links };
  }
  // Docs shape
  if (Array.isArray(payload?.data)) {
    return { items: payload.data, meta: payload.meta, links: payload.links };
  }
  // Fallbacks (just in case)
  if (Array.isArray(payload?.activities)) {
    return { items: payload.activities, meta: payload.pagination, links: payload.links };
  }
  return { items: [], meta: payload?.meta, links: payload?.links };
}

function normalizeEntry(category: Exclude<BusinessHistoryCategory, 'all'>, e: any): ActivityLogEntry {
  // Backend controller returns description at root: e.description
  const rootDescription = e?.description ? String(e.description) : '';

  // Backend controller returns subject_type/subject_id/subject (model)
  const subjectId =
    Number(e?.subject?.id ?? e?.subject_id ?? e?.subjectId ?? 0);

  const subjectType =
    String(e?.subject?.type ?? e?.subject_label ?? e?.subject_type ?? e?.subjectType ?? '');
  const rawSubjectType = String(e?.subject?.raw_type ?? e?.subject_type ?? e?.subjectType ?? '');

  // Build a consistent "subject.data"
  const subjectData =
    e?.subject?.data ?? e?.subject ?? e?.subject_data ?? undefined;

  const whatObj = (e?.what && typeof e.what === 'object') ? e.what : {};

  return {
    id: Number(e?.id),
    category,

    who: {
      id: Number(e?.who?.id ?? 0),
      type: String(e?.who?.type ?? ''),
      name: String(e?.who?.name ?? 'Unknown'),
      email: e?.who?.email ? String(e.who.email) : undefined,
    },

    when: {
      timestamp: String(e?.when?.timestamp ?? ''),
      formatted: String(e?.when?.formatted ?? e?.when?.timestamp ?? ''),
      human: e?.when?.human ? String(e.when.human) : undefined,
    },

    what: {
      // Backend has what.action but not what.description -> fallback to root description
      action: String(whatObj?.action ?? e?.event ?? ''),
      action_label: String(whatObj?.action_label ?? e?.human?.action ?? ''),
      description: String(whatObj?.description ?? e?.human_description ?? e?.human?.description ?? rootDescription ?? ''),
      fields_changed: Array.isArray(whatObj?.fields_changed) ? whatObj.fields_changed : [],
      changes: whatObj?.changes && typeof whatObj.changes === 'object' ? whatObj.changes : {},
      human_changes: Array.isArray(whatObj?.human_changes) ? whatObj.human_changes : (Array.isArray(e?.human?.changes) ? e.human.changes : []),
      ...(typeof whatObj === 'object' ? whatObj : {}),
    },

    subject: {
      id: subjectId,
      type: subjectType,
      raw_type: rawSubjectType,
      data: subjectData,
    },
  };
}

async function fetchCategoryPage(
  category: Exclude<BusinessHistoryCategory, 'all'>,
  params: ActivityLogParams
): Promise<Paginated<ActivityLogEntry>> {
  const url = endpointForCategory[category];

  // Pass through endpoint-specific filters (e.g., order_id, product_id, dispatch_id, etc.)
  // `fetch_all` is a frontend-only control and must never be sent to Laravel.
  const { category: _cat, fetch_all: _fetchAll, ...rest } = params as any;

  // Backend versions in this project have used both naming conventions.
  const date_from = params.date_from || undefined;
  const date_to = params.date_to || undefined;

  const res = await axios.get(url, {
    params: {
      ...rest,
      per_page: params.per_page ?? 50,
      page: params.page ?? 1,
      date_from,
      date_to,
      start_date: date_from,
      end_date: date_to,
    },
  });

  const payload = res.data;
  const { items, meta, links } = extractItemsAndMeta(payload);

  return {
    data: items.map((e: any) => normalizeEntry(category, e)),
    links,
    meta,
  };
}

function paginationLastPage(meta: any, perPage: number): number | null {
  const explicit = Number(meta?.last_page ?? meta?.total_pages ?? meta?.pages ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const total = Number(meta?.total ?? meta?.total_items ?? meta?.count ?? 0);
  const backendPerPage = Number(meta?.per_page ?? meta?.page_size ?? perPage);
  if (Number.isFinite(total) && total > 0 && Number.isFinite(backendPerPage) && backendPerPage > 0) {
    return Math.max(1, Math.ceil(total / backendPerPage));
  }

  return null;
}

async function fetchCategoryAllPages(
  category: Exclude<BusinessHistoryCategory, 'all'>,
  params: ActivityLogParams
): Promise<Paginated<ActivityLogEntry>> {
  // Business-history endpoints commonly cap page size around 100. Requesting 100
  // keeps the number of requests reasonable without relying on an unsupported huge limit.
  const perPage = Math.max(Number(params.per_page || 0), 100);
  const first = await fetchCategoryPage(category, { ...params, per_page: perPage, page: 1 });

  const all: ActivityLogEntry[] = [];
  const seen = new Set<string>();
  const appendUnique = (rows: ActivityLogEntry[]) => {
    let added = 0;
    for (const row of rows) {
      const key = `${row.category}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(row);
      added += 1;
    }
    return added;
  };

  appendUnique(first.data || []);

  let meta = first.meta;
  let links = first.links;
  let lastPage = paginationLastPage(meta, perPage);
  let page = 1;

  // The high ceiling is only an infinite-loop guard for malformed pagination metadata.
  // Normal requests stop on last_page/total_pages, has_more_pages=false, an empty page,
  // or a repeated page when a backend accidentally ignores the `page` parameter.
  const MAX_PAGES_SAFETY = 1000;
  while (page < MAX_PAGES_SAFETY) {
    if (lastPage !== null && page >= lastPage) break;
    if (meta?.has_more_pages === false || meta?.has_more === false) break;

    page += 1;
    const next = await fetchCategoryPage(category, { ...params, per_page: perPage, page });
    const rows = next.data || [];
    if (!rows.length) break;

    const added = appendUnique(rows);
    meta = next.meta ?? meta;
    links = next.links ?? links;
    lastPage = paginationLastPage(meta, perPage) ?? lastPage;

    // If every row is a duplicate, the endpoint is most likely returning page 1
    // repeatedly. Stop rather than looping forever.
    if (added === 0) break;
  }

  return {
    data: all,
    links,
    meta: {
      ...(meta || {}),
      fetched_all_pages: true,
      fetched_count: all.length,
      fetched_pages: page,
    },
  };
}

async function fetchCategory(
  category: Exclude<BusinessHistoryCategory, 'all'>,
  params: ActivityLogParams
): Promise<Paginated<ActivityLogEntry>> {
  return params.fetch_all
    ? fetchCategoryAllPages(category, params)
    : fetchCategoryPage(category, params);
}

const activityService = {
  /**
   * Fetch business history entries.
   *
   * - If category is omitted or "all", it fetches the first page from all supported categories and merges them.
   * - If a specific category is provided, it fetches that endpoint only.
   */
  async getLogs(params: ActivityLogParams): Promise<Paginated<ActivityLogEntry>> {
    const category = params.category ?? 'all';

    if (category !== 'all') {
      return fetchCategory(category, params);
    }

    const cats: Exclude<BusinessHistoryCategory, 'all'>[] = [
      'orders',
      'product-dispatches',
      'purchase-orders',
      'store-assignments',
      'products',
    ];

    const results = await Promise.all(
      cats.map((c) => fetchCategory(c, { ...params, category: c }))
    );

    const merged = results.flatMap((r) => r.data);

    // Sort newest first (timestamp ISO string)
    merged.sort((a, b) => (b.when.timestamp || '').localeCompare(a.when.timestamp || ''));

    return {
      data: merged,
      meta: {
        combined: true,
        combined_categories: cats,
        combined_count: merged.length,
        // keep some pagination info if it exists
        ...(results[0]?.meta ? { sample_pagination: results[0].meta } : {}),
      },
    };
  },

  /** Preferred API name used in some UI: getHistory(category, params) */
  async getHistory(category: BusinessHistoryCategory, params: ActivityLogParams) {
    return this.getLogs({ ...params, category });
  },

  async getStatistics(date_from?: string, date_to?: string): Promise<StatsResponse> {
    const res = await axios.get('/business-history/statistics', {
      params: {
        date_from: date_from || undefined,
        date_to: date_to || undefined,
        start_date: date_from || undefined,
        end_date: date_to || undefined,
      },
    });

    // Your controller returns { success:true, data:{...stats} }
    return (res.data?.data ?? res.data) as StatsResponse;
  },
};

export default activityService;
