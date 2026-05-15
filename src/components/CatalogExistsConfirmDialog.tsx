import { useEffect } from 'react';

export interface CatalogExistsConfirmDialogProps {
  open: boolean;
  sourceCatalogName: string;
  destCatalogName: string;
  onContinue: () => void;
  onSkip: () => void;
}

export function CatalogExistsConfirmDialog({
  open,
  sourceCatalogName,
  destCatalogName,
  onContinue,
  onSkip,
}: CatalogExistsConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onSkip]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onClick={onSkip}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="existing-catalog-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="existing-catalog-title" className="text-lg font-semibold text-slate-900">
          Catalog already exists
        </h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            Destination catalog{' '}
            <span className="font-mono font-medium text-slate-800">{destCatalogName}</span> already
            exists
            {destCatalogName !== sourceCatalogName && (
              <>
                {' '}
                (from source{' '}
                <span className="font-mono font-medium text-slate-800">{sourceCatalogName}</span>)
              </>
            )}
            .
          </p>
          <p>
            Continuing will update field mappings if needed, and upload items according to your overwrite
            settings.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Skip this catalog
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Continue migration
          </button>
        </div>
      </div>
    </div>
  );
}
