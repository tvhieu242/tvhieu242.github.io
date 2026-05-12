import { Fragment, useEffect, useState } from 'react';
import { useMigrationContext } from '../context/MigrationContext';
import { useCatalogs } from '../hooks/useCatalogs';
import { CatalogPreview } from './CatalogPreview';

export function CatalogList() {
  const { catalogs, setCatalogs, setStep, catalogsLoading, catalogsError } = useMigrationContext();
  const { loadCatalogNames, fetchItemCount } = useCatalogs();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    void loadCatalogNames();
  }, [loadCatalogNames]);

  const selectedCount = catalogs.filter((c) => c.selected).length;
  const allSelected = catalogs.length > 0 && catalogs.every((c) => c.selected);

  function toggleAll() {
    const next = !allSelected;
    setCatalogs((rows) => rows.map((r) => ({ ...r, selected: next })));
  }

  function toggleOne(name: string) {
    setCatalogs((rows) =>
      rows.map((r) => (r.name === name ? { ...r, selected: !r.selected } : r)),
    );
  }

  async function loadAllCounts() {
    setCountsLoading(true);
    try {
      const chunk = 4;
      for (let i = 0; i < catalogs.length; i += chunk) {
        const slice = catalogs.slice(i, i + chunk);
        await Promise.all(
          slice.map(async (row) => {
            try {
              const n = await fetchItemCount(row.name);
              setCatalogs((prev) =>
                prev.map((r) => (r.name === row.name ? { ...r, itemCount: n } : r)),
              );
            } catch {
              setCatalogs((prev) =>
                prev.map((r) => (r.name === row.name ? { ...r, itemCount: undefined } : r)),
              );
            }
          }),
        );
      }
    } finally {
      setCountsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Catalogs</h2>
          <p className="text-sm text-slate-600">
            Select catalogs to copy. Expand a row for schema and sample items.
          </p>
        </div>
        <button
          type="button"
          disabled={countsLoading || catalogs.length === 0}
          onClick={() => void loadAllCounts()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {countsLoading ? 'Loading counts…' : 'Load item counts'}
        </button>
      </div>

      {catalogsError && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{catalogsError}</div>
      )}

      {catalogsLoading ? (
        <div className="animate-pulse space-y-2 py-8 text-center text-slate-500">Loading catalogs…</div>
      ) : catalogs.length === 0 ? (
        <p className="py-8 text-center text-slate-600">No catalogs found in the source project.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all catalogs"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Catalog</th>
                <th className="px-3 py-2 font-medium">Items (approx.)</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.map((row) => (
                <Fragment key={row.name}>
                  <tr
                    className="cursor-pointer border-t border-slate-200 bg-white hover:bg-slate-50"
                    onClick={() => setExpanded((e) => (e === row.name ? null : row.name))}
                  >
                    <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleOne(row.name)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-900">{row.name}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {row.itemCount !== undefined ? row.itemCount : '—'}
                    </td>
                  </tr>
                  {expanded === row.name && (
                    <tr className="border-t border-slate-200">
                      <td colSpan={3} className="p-0">
                        <CatalogPreview catalogName={row.name} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {selectedCount} catalog{selectedCount === 1 ? '' : 's'} selected
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => setStep(2)}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            Next: options
          </button>
        </div>
      </div>
    </div>
  );
}
