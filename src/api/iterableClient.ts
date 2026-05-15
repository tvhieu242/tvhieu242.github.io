import type {
  ApiLogEntry,
  CatalogBulkUploadRequest,
  CatalogFieldDefinitionSerializedModel,
  CatalogFieldMappingsResponse,
  CatalogMappingsUpdateRequest,
  GetCatalogItemsResponse,
  GetCatalogsResponse,
  IterableApiResponse,
} from '../types/iterable';

/** Dev: Vite proxy (`vite.config.ts`) maps this to `https://api.iterable.com/api`. Prod: call Iterable directly. */
const API_BASE = import.meta.env.DEV
  ? '/iterable-api'
  : 'https://api.iterable.com/api';

export type LogFn = (entry: Omit<ApiLogEntry, 'id' | 'timestamp'>) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(res: Response): number | undefined {
  const ra = res.headers.get('Retry-After');
  if (!ra) return undefined;
  const n = Number(ra);
  if (!Number.isNaN(n)) return n * 1000;
  const d = Date.parse(ra);
  if (!Number.isNaN(d)) return Math.max(0, d - Date.now());
  return undefined;
}

async function fetchWithRetry(
  path: string,
  init: RequestInit,
  log?: LogFn,
  catalog?: string,
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const method = (init.method ?? 'GET').toUpperCase();
  const maxAttempts = 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = performance.now();
    try {
      const res = await fetch(url, init);
      const durationMs = Math.round(performance.now() - start);
      let responseSnippet: string | undefined;
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const clone = res.clone();
        try {
          const text = await clone.text();
          responseSnippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
        } catch {
          /* ignore */
        }
      }
      log?.({
        catalog,
        method,
        path,
        statusCode: res.status,
        durationMs,
        responseSnippet,
      });

      if (res.status === 429) {
        const wait = parseRetryAfterMs(res) ?? 1000 * 2 ** attempt;
        await sleep(wait);
        continue;
      }

      if (!res.ok && res.status >= 500 && attempt < maxAttempts - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }

      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const durationMs = Math.round(performance.now() - start);
      log?.({
        catalog,
        method,
        path,
        statusCode: 0,
        durationMs,
        error: lastError.message,
      });
      if (attempt < maxAttempts - 1) {
        await sleep(1000 * 2 ** attempt);
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

function headersForKey(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Api-Key': apiKey,
  };
}

/** Item fields to send in bulk upload: unwrap Iterable's `underlying` when present, else use the object as-is. */
export function catalogItemDocumentPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const u = record.underlying;
  if (u !== null && typeof u === 'object' && !Array.isArray(u)) {
    return u as Record<string, unknown>;
  }
  return record;
}

/**
 * Iterable may return either an OpenAPI-shaped body or an envelope
 * `{ code, msg, params }` with the real payload inside `params`.
 */
function extractPayload(raw: unknown, ...keys: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid JSON response');
  }
  const root = raw as Record<string, unknown>;
  const hasAny = (o: Record<string, unknown>) => keys.some((k) => k in o);
  if (hasAny(root)) return root;
  const params = root.params;
  if (params !== null && typeof params === 'object' && !Array.isArray(params)) {
    const p = params as Record<string, unknown>;
    if (hasAny(p)) return p;
  }
  throw new Error(`Unexpected response shape (expected one of: ${keys.join(', ')})`);
}

function asGetCatalogsResponse(raw: unknown): GetCatalogsResponse {
  const blob = extractPayload(raw, 'catalogNames');
  const catalogNames = Array.isArray(blob.catalogNames) ? (blob.catalogNames as GetCatalogsResponse['catalogNames']) : [];
  const nextPageUrl = typeof blob.nextPageUrl === 'string' ? blob.nextPageUrl : undefined;
  const previousPageUrl = typeof blob.previousPageUrl === 'string' ? blob.previousPageUrl : undefined;
  const totalCatalogsCount =
    typeof blob.totalCatalogsCount === 'number' ? blob.totalCatalogsCount : catalogNames.length;
  return { catalogNames, nextPageUrl, previousPageUrl, totalCatalogsCount };
}

function asCatalogFieldMappingsResponse(raw: unknown): CatalogFieldMappingsResponse {
  const blob = extractPayload(raw, 'definedMappings', 'undefinedFields');
  const definedMappings =
    blob.definedMappings !== null &&
    typeof blob.definedMappings === 'object' &&
    !Array.isArray(blob.definedMappings)
      ? (blob.definedMappings as Record<string, unknown>)
      : {};
  const undefinedFields = Array.isArray(blob.undefinedFields)
    ? (blob.undefinedFields as string[])
    : [];
  return { definedMappings, undefinedFields };
}

function asGetCatalogItemsResponse(raw: unknown): GetCatalogItemsResponse {
  const blob = extractPayload(raw, 'catalogItemsWithProperties');
  const catalogItemsWithProperties = Array.isArray(blob.catalogItemsWithProperties)
    ? (blob.catalogItemsWithProperties as GetCatalogItemsResponse['catalogItemsWithProperties'])
    : [];
  const nextPageUrl = typeof blob.nextPageUrl === 'string' ? blob.nextPageUrl : undefined;
  const previousPageUrl = typeof blob.previousPageUrl === 'string' ? blob.previousPageUrl : undefined;
  const totalItemsCount =
    typeof blob.totalItemsCount === 'number' ? blob.totalItemsCount : catalogItemsWithProperties.length;
  return { catalogItemsWithProperties, nextPageUrl, previousPageUrl, totalItemsCount };
}

export async function validateApiKey(
  apiKey: string,
  log?: LogFn,
): Promise<boolean> {
  const res = await fetchWithRetry(
    '/catalogs?page=1&pageSize=1',
    { method: 'GET', headers: headersForKey(apiKey) },
    log,
  );
  return res.ok;
}

export async function listCatalogsPage(
  apiKey: string,
  page: number,
  pageSize: number,
  log?: LogFn,
): Promise<GetCatalogsResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await fetchWithRetry(
    `/catalogs?${q}`,
    { method: 'GET', headers: headersForKey(apiKey) },
    log,
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `List catalogs failed: ${res.status}`);
  }
  const raw: unknown = await res.json();
  return asGetCatalogsResponse(raw);
}

export async function listAllCatalogNames(apiKey: string, log?: LogFn): Promise<string[]> {
  const names: string[] = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const data = await listCatalogsPage(apiKey, page, pageSize, log);
    for (const c of data.catalogNames) {
      names.push(c.name);
    }
    if (data.catalogNames.length === 0 || data.catalogNames.length < pageSize) break;
    if (!data.nextPageUrl) break;
    page += 1;
  }
  return names;
}

export async function getFieldMappings(
  apiKey: string,
  catalogName: string,
  log?: LogFn,
): Promise<CatalogFieldMappingsResponse> {
  const enc = encodeURIComponent(catalogName);
  const res = await fetchWithRetry(
    `/catalogs/${enc}/fieldMappings`,
    { method: 'GET', headers: headersForKey(apiKey) },
    log,
    catalogName,
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Get field mappings failed: ${res.status}`);
  }
  const raw: unknown = await res.json();
  return asCatalogFieldMappingsResponse(raw);
}

/** Convert Iterable GET definedMappings tree into PUT mappingsUpdates. */
export function definedMappingsToUpdates(
  node: unknown,
  prefix = '',
): CatalogFieldDefinitionSerializedModel[] {
  if (node === null || node === undefined) return [];
  if (typeof node === 'string') {
    if (!prefix) return [];
    return [{ fieldName: prefix, fieldType: node }];
  }
  if (typeof node !== 'object' || Array.isArray(node)) return [];

  const o = node as Record<string, unknown>;
  if (typeof o.fieldType === 'string' && typeof o.fieldName === 'string') {
    const childrenRaw = o.children;
    const children = Array.isArray(childrenRaw)
      ? childrenRaw.flatMap((c) => definedMappingsToUpdates(c, ''))
      : undefined;
    return [
      {
        fieldName: o.fieldName,
        fieldType: o.fieldType,
        ...(children?.length ? { children } : {}),
      },
    ];
  }

  const out: CatalogFieldDefinitionSerializedModel[] = [];
  for (const [key, val] of Object.entries(o)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      out.push({ fieldName: fieldPath, fieldType: val });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      const v = val as Record<string, unknown>;
      if (typeof v.fieldType === 'string') {
        const fn = typeof v.fieldName === 'string' ? v.fieldName : fieldPath;
        const childrenRaw = v.children;
        const children = Array.isArray(childrenRaw)
          ? childrenRaw.flatMap((c) => definedMappingsToUpdates(c, ''))
          : undefined;
        out.push({
          fieldName: fn,
          fieldType: v.fieldType,
          ...(children?.length ? { children } : {}),
        });
      } else {
        out.push(...definedMappingsToUpdates(val, fieldPath));
      }
    }
  }
  return out;
}

function normalizeFieldMappingNode(
  x: unknown,
  path: string,
): { ok: true; node: CatalogFieldDefinitionSerializedModel } | { ok: false; error: string } {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) {
    return { ok: false, error: `${path} must be an object` };
  }
  const o = x as Record<string, unknown>;
  if (typeof o.fieldName !== 'string' || o.fieldName.length === 0) {
    return { ok: false, error: `${path}.fieldName must be a non-empty string` };
  }
  if (typeof o.fieldType !== 'string' || o.fieldType.length === 0) {
    return { ok: false, error: `${path}.fieldType must be a non-empty string` };
  }

  let children: CatalogFieldDefinitionSerializedModel[] | undefined;
  if (o.children !== undefined) {
    if (!Array.isArray(o.children)) {
      return { ok: false, error: `${path}.children must be an array` };
    }
    const next: CatalogFieldDefinitionSerializedModel[] = [];
    for (let i = 0; i < o.children.length; i++) {
      const cn = normalizeFieldMappingNode(o.children[i], `${path}.children[${i}]`);
      if (!cn.ok) return cn;
      next.push(cn.node);
    }
    if (next.length > 0) children = next;
  }

  return {
    ok: true,
    node: {
      fieldName: o.fieldName,
      fieldType: o.fieldType,
      ...(children ? { children } : {}),
    },
  };
}

/** Parse and validate the JSON body for PUT /catalogs/{name}/fieldMappings (expects `{ mappingsUpdates: [...] }`). */
export function parseMappingsUpdatesPutBody(jsonText: string):
  | { ok: true; mappingsUpdates: CatalogFieldDefinitionSerializedModel[] }
  | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : 'Invalid JSON';
    return { ok: false, error: msg };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Root value must be a JSON object' };
  }
  const root = raw as Record<string, unknown>;
  if (!Array.isArray(root.mappingsUpdates)) {
    return { ok: false, error: 'Missing or invalid top-level mappingsUpdates array' };
  }
  const out: CatalogFieldDefinitionSerializedModel[] = [];
  for (let i = 0; i < root.mappingsUpdates.length; i++) {
    const n = normalizeFieldMappingNode(root.mappingsUpdates[i], `mappingsUpdates[${i}]`);
    if (!n.ok) return n;
    out.push(n.node);
  }
  return { ok: true, mappingsUpdates: out };
}

export async function setFieldMappingsUpdates(
  apiKey: string,
  catalogName: string,
  mappingsUpdates: CatalogFieldDefinitionSerializedModel[],
  log?: LogFn,
): Promise<void> {
  if (mappingsUpdates.length === 0) return;

  const body: CatalogMappingsUpdateRequest = { mappingsUpdates };
  const enc = encodeURIComponent(catalogName);
  const res = await fetchWithRetry(
    `/catalogs/${enc}/fieldMappings`,
    {
      method: 'PUT',
      headers: headersForKey(apiKey),
      body: JSON.stringify(body),
    },
    log,
    catalogName,
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Set field mappings failed: ${res.status}`);
  }
}

export async function setFieldMappings(
  apiKey: string,
  catalogName: string,
  mappings: CatalogFieldMappingsResponse,
  log?: LogFn,
): Promise<void> {
  const updates = definedMappingsToUpdates(mappings.definedMappings);
  await setFieldMappingsUpdates(apiKey, catalogName, updates, log);
}

export async function createCatalog(
  apiKey: string,
  catalogName: string,
  log?: LogFn,
): Promise<{ created: boolean; alreadyExists: boolean }> {
  const enc = encodeURIComponent(catalogName);
  const res = await fetchWithRetry(
    `/catalogs/${enc}`,
    { method: 'POST', headers: headersForKey(apiKey) },
    log,
    catalogName,
  );
  if (res.status === 201) return { created: true, alreadyExists: false };
  if (res.ok) return { created: true, alreadyExists: false };

  let msg = '';
  let code: string | undefined;
  try {
    const j = (await res.json()) as IterableApiResponse;
    msg = j.msg ?? '';
    code = typeof j.code === 'string' ? j.code : undefined;
  } catch {
    msg = await res.text();
  }
  const lower = msg.toLowerCase();
  const duplicateCatalogName =
    res.status === 400 &&
    (lower.includes('already') ||
      lower.includes('exist') ||
      lower.includes('duplicate') ||
      lower.includes('unique') ||
      (code === 'BadParams' && lower.includes('unable to create a catalog')));
  if (duplicateCatalogName) {
    return { created: false, alreadyExists: true };
  }
  throw new Error(msg || `Create catalog failed: ${res.status}`);
}

export async function getCatalogItems(
  apiKey: string,
  catalogName: string,
  page: number,
  pageSize: number,
  log?: LogFn,
): Promise<GetCatalogItemsResponse> {
  const enc = encodeURIComponent(catalogName);
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await fetchWithRetry(
    `/catalogs/${enc}/items?${q}`,
    { method: 'GET', headers: headersForKey(apiKey) },
    log,
    catalogName,
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Get catalog items failed: ${res.status}`);
  }
  const raw: unknown = await res.json();
  return asGetCatalogItemsResponse(raw);
}

export async function bulkCreateItems(
  apiKey: string,
  catalogName: string,
  documents: Record<string, Record<string, unknown>>,
  replaceUploadedFieldsOnly: boolean,
  log?: LogFn,
): Promise<void> {
  const enc = encodeURIComponent(catalogName);
  const body: CatalogBulkUploadRequest = { documents, replaceUploadedFieldsOnly };
  const res = await fetchWithRetry(
    `/catalogs/${enc}/items`,
    {
      method: 'POST',
      headers: headersForKey(apiKey),
      body: JSON.stringify(body),
    },
    log,
    catalogName,
  );
  if (res.status === 202 || res.ok) return;
  const t = await res.text();
  throw new Error(t || `Bulk create items failed: ${res.status}`);
}
