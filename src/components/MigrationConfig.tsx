import { useMigrationContext } from '../context/MigrationContext';

export function MigrationConfig() {
  const {
    catalogs,
    setCatalogs,
    config,
    setConfig,
    setStep,
    resetProgressForMigration,
    clearLogs,
    setPendingMigrationStart,
    setActiveMigrationCatalogs,
  } = useMigrationContext();

  const selected = catalogs.filter((c) => c.selected);

  function setDestinationName(sourceName: string, value: string) {
    setCatalogs((rows) =>
      rows.map((r) => (r.name === sourceName ? { ...r, destinationName: value } : r)),
    );
  }

  function resolvedDestName(row: (typeof selected)[number]) {
    const t = row.destinationName?.trim();
    return t || row.name;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Migration options</h2>
      <p className="mb-6 text-sm text-slate-600">
        Control how items are written to the destination. Schema is copied from the source when not
        in dry-run mode.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="font-medium text-slate-900">Destination catalog names</p>
          <p className="mt-1 text-sm text-slate-600">
            Each selected catalog is created in the destination project under the name you set below.
            Leave a field matching the source name to keep the same catalog name.
          </p>
          <ul className="mt-4 space-y-3">
            {selected.map((row) => (
              <li
                key={row.name}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="min-w-0 shrink-0 text-sm text-slate-500">
                  <span className="text-slate-600">From</span>{' '}
                  <span className="font-mono text-slate-900">{row.name}</span>
                </span>
                <span className="hidden text-slate-400 sm:inline" aria-hidden>
                  →
                </span>
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">Destination name</span>
                  <input
                    type="text"
                    value={row.destinationName ?? row.name}
                    onChange={(e) => setDestinationName(row.name, e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={`Destination catalog name for ${row.name}`}
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
          <input
            type="checkbox"
            checked={config.overwrite}
            onChange={(e) => setConfig((c) => ({ ...c, overwrite: e.target.checked }))}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-900">Full document overwrite</span>
            <p className="text-sm text-slate-600">
              When on, each item replaces the entire document in the destination. When off, Iterable
              merges uploaded fields only (<code className="text-xs">replaceUploadedFieldsOnly</code>
              ).
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 hover:bg-amber-50">
          <input
            type="checkbox"
            checked={config.dryRun}
            onChange={(e) => setConfig((c) => ({ ...c, dryRun: e.target.checked }))}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-900">Dry run</span>
            <p className="text-sm text-slate-600">
              Reads from the source and simulates progress. No catalogs or items are created in the
              destination.
            </p>
          </div>
        </label>
      </div>

      <div className="mt-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-800">
        <p className="font-medium">Summary</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700">
          <li>
            {selected.length} catalog{selected.length === 1 ? '' : 's'} selected
          </li>
          {selected.map((row) => (
            <li key={row.name} className="font-mono text-sm">
              {row.name} → {resolvedDestName(row)}
            </li>
          ))}
          <li>Overwrite full documents: {config.overwrite ? 'Yes' : 'No (merge fields)'}</li>
          <li>Dry run: {config.dryRun ? 'Yes' : 'No'}</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            clearLogs();
            const names = selected.map((c) => c.name);
            resetProgressForMigration(names);
            setActiveMigrationCatalogs(names);
            setPendingMigrationStart(true);
            setStep(3);
          }}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Next: run migration
        </button>
      </div>
    </div>
  );
}
