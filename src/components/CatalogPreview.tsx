import { useEffect, useState } from 'react';
import {
  catalogItemDocumentPayload,
  definedMappingsToUpdates,
  getCatalogItems,
  getFieldMappings,
} from '../api/iterableClient';
import { useMigrationContext } from '../context/MigrationContext';
import type { CatalogFieldMappingsResponse } from '../types/iterable';

interface CatalogPreviewProps {
  catalogName: string;
}

export function CatalogPreview({ catalogName }: CatalogPreviewProps) {
  const { sourceKey, appendLog } = useMigrationContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<CatalogFieldMappingsResponse | null>(null);
  const [samples, setSamples] = useState<string>('');

  const log = (e: Parameters<typeof appendLog>[0]) => appendLog(e);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [fm, items] = await Promise.all([
          getFieldMappings(sourceKey, catalogName, log),
          getCatalogItems(sourceKey, catalogName, 1, 5, log),
        ]);
        if (cancelled) return;
        setMappings(fm);
        const preview = items.catalogItemsWithProperties.map((it) => ({
          itemId: it.itemId,
          value: catalogItemDocumentPayload(it.value),
        }));
        setSamples(JSON.stringify(preview, null, 2));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceKey, catalogName, appendLog]);

  if (loading) {
    return (
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        Loading schema and samples…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-slate-100 bg-red-50 px-4 py-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const flatFields = mappings ? definedMappingsToUpdates(mappings.definedMappings) : [];

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 text-sm">
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 font-medium text-slate-800">Field mappings</h4>
          {flatFields.length === 0 ? (
            <p className="text-slate-600">No defined mappings (inferred fields only).</p>
          ) : (
            <ul className="max-h-48 overflow-auto rounded border border-slate-200 bg-white text-xs">
              {flatFields.map((f, idx) => (
                <li
                  key={`${idx}-${f.fieldName}`}
                  className="flex justify-between gap-2 border-b border-slate-100 px-2 py-1 last:border-0"
                >
                  <code className="text-slate-800">{f.fieldName}</code>
                  <span className="text-sky-700">{f.fieldType}</span>
                </li>
              ))}
            </ul>
          )}
          {mappings && mappings.undefinedFields.length > 0 && (
            <p className="mt-2 text-xs text-amber-800">
              Undefined fields: {mappings.undefinedFields.join(', ')}
            </p>
          )}
        </div>
        <div>
          <h4 className="mb-2 font-medium text-slate-800">Sample items (up to 5)</h4>
          <pre className="max-h-48 overflow-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-800">
            {samples || '[]'}
          </pre>
        </div>
      </div>
    </div>
  );
}
