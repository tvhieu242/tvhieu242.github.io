import { useEffect, useRef, useState } from 'react';
import { parseMappingsUpdatesPutBody } from '../api/iterableClient';
import type { CatalogFieldDefinitionSerializedModel } from '../types/iterable';

export interface MappingsReviewPayload {
  sourceCatalogName: string;
  destCatalogName: string;
  mappingsUpdates: CatalogFieldDefinitionSerializedModel[];
  undefinedFields: string[];
  dryRun: boolean;
}

export type MappingsReviewResult =
  | { outcome: 'skip' }
  | { outcome: 'dryRunContinue' }
  | { outcome: 'apply'; mappingsUpdates: CatalogFieldDefinitionSerializedModel[] };

export interface MappingsReviewDialogProps {
  open: boolean;
  payload: MappingsReviewPayload | null;
  onResolve: (result: MappingsReviewResult) => void;
}

export function MappingsReviewDialog({ open, payload, onResolve }: MappingsReviewDialogProps) {
  const [draft, setDraft] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (open && payload) {
      setDraft(JSON.stringify({ mappingsUpdates: payload.mappingsUpdates }, null, 2));
      setParseError(null);
    }
  }, [open, payload]);

  useEffect(() => {
    if (!open || !payload) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (payload.dryRun) {
          const parsed = parseMappingsUpdatesPutBody(draftRef.current);
          if (!parsed.ok) {
            setParseError(parsed.error);
            return;
          }
          onResolve({ outcome: 'dryRunContinue' });
        } else {
          onResolve({ outcome: 'skip' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, payload, onResolve]);

  if (!open || !payload) return null;

  const dismissOverlay = () => {
    if (payload.dryRun) {
      const parsed = parseMappingsUpdatesPutBody(draft);
      if (!parsed.ok) {
        setParseError(parsed.error);
        return;
      }
      onResolve({ outcome: 'dryRunContinue' });
    } else {
      onResolve({ outcome: 'skip' });
    }
  };

  const resetToSource = () => {
    setDraft(JSON.stringify({ mappingsUpdates: payload.mappingsUpdates }, null, 2));
    setParseError(null);
  };

  const handleDryRunContinue = () => {
    const parsed = parseMappingsUpdatesPutBody(draft);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }
    onResolve({ outcome: 'dryRunContinue' });
  };

  const handleApply = () => {
    const parsed = parseMappingsUpdatesPutBody(draft);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }
    if (parsed.mappingsUpdates.length === 0) {
      setParseError('Add at least one mapping in mappingsUpdates, or use Skip applying mappings.');
      return;
    }
    onResolve({ outcome: 'apply', mappingsUpdates: parsed.mappingsUpdates });
  };

  const handleSkipApply = () => {
    onResolve({ outcome: 'skip' });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onClick={dismissOverlay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mappings-review-title"
        className="flex max-h-[min(90vh,640px)] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 p-6 pb-4">
          <h2 id="mappings-review-title" className="text-lg font-semibold text-slate-900">
            Review field mappings payload
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Edit the JSON below if needed — this becomes the <code className="rounded bg-slate-100 px-1 text-slate-800">PUT …/fieldMappings</code> body
            (<span className="font-mono text-slate-800">mappingsUpdates</span>) for the destination catalog.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Source{' '}
            <span className="font-mono font-medium text-slate-800">{payload.sourceCatalogName}</span>
            {' → '}
            destination{' '}
            <span className="font-mono font-medium text-slate-800">{payload.destCatalogName}</span>
          </p>
          {payload.dryRun && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Dry run — nothing will be written. Fix any JSON errors; Continue when satisfied.
            </p>
          )}
          {payload.undefinedFields.length > 0 && (
            <p className="mt-3 text-xs text-amber-800">
              Undefined fields (inferred only, not in this payload):{' '}
              {payload.undefinedFields.join(', ')}
            </p>
          )}
        </div>
        <div className="min-h-0 flex-1 px-6 py-3">
          <div className="mb-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetToSource}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              Reset to source mappings
            </button>
          </div>
          <label htmlFor="mappings-review-json" className="sr-only">
            Field mappings PUT body JSON
          </label>
          <textarea
            id="mappings-review-json"
            spellCheck={false}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setParseError(null);
            }}
            className="h-[min(50vh,360px)] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          {parseError && (
            <p className="mt-2 text-xs font-medium text-red-700" role="alert">
              {parseError}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-wrap justify-end gap-2 border-t border-slate-100 p-6 pt-4">
          {payload.dryRun ? (
            <button
              type="button"
              onClick={handleDryRunContinue}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Continue
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSkipApply}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Skip applying mappings
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Apply mappings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
