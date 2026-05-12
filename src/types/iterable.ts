export type IterableApiCode =
  | 'Success'
  | 'BadApiKey'
  | 'BadParams'
  | 'RateLimitExceeded'
  | string;

export interface IterableApiResponse {
  code: IterableApiCode;
  msg: string;
  params?: Record<string, unknown>;
}

export interface CatalogName {
  name: string;
}

export interface GetCatalogsResponse {
  catalogNames: CatalogName[];
  nextPageUrl?: string;
  previousPageUrl?: string;
  totalCatalogsCount: number;
}

export interface CatalogFieldDefinitionSerializedModel {
  fieldName: string;
  fieldType: string;
  children?: CatalogFieldDefinitionSerializedModel[];
}

export interface CatalogFieldMappingsResponse {
  definedMappings: Record<string, unknown>;
  undefinedFields: string[];
}

export interface CatalogMappingsUpdateRequest {
  mappingsUpdates: CatalogFieldDefinitionSerializedModel[];
}

export interface CatalogItemWithProperties {
  catalogName: string;
  itemId: string;
  lastModified: string;
  size: number;
  /** Raw catalog item JSON; may include Iterable's `{ underlying: { ... } }` shape or a flat object. */
  value: Record<string, unknown>;
}

export interface GetCatalogItemsResponse {
  catalogItemsWithProperties: CatalogItemWithProperties[];
  nextPageUrl?: string;
  previousPageUrl?: string;
  totalItemsCount: number;
}

export interface CatalogBulkUploadRequest {
  documents: Record<string, Record<string, unknown>>;
  replaceUploadedFieldsOnly: boolean;
}

export interface ApiLogEntry {
  id: string;
  timestamp: number;
  catalog?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  error?: string;
  responseSnippet?: string;
}

export type CatalogMigrationPhase =
  | 'pending'
  | 'copying-schema'
  | 'copying-items'
  | 'done'
  | 'error';

export interface CatalogProgress {
  name: string;
  phase: CatalogMigrationPhase;
  copiedItems: number;
  totalItems: number;
  error?: string;
}

export interface CatalogRow {
  name: string;
  /** Destination catalog name in the target project; defaults to `name` when unset. */
  destinationName?: string;
  selected: boolean;
  itemCount?: number;
}
