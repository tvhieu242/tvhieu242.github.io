import { useEffect, useRef } from 'react';
import { useMigrationContext } from '../context/MigrationContext';
import { useMigration } from '../hooks/useMigration';
import { LogPanel } from './LogPanel';
import type { CatalogMigrationPhase } from '../types/iterable';

function phaseLabel(phase: CatalogMigrationPhase): string {
  switch (phase) {
    case 'pending':
      return 'Pending';
    case 'copying-schema':
      return 'Copying schema';
    case 'review-mappings':
      return 'Review mappings';
    case 'copying-items':
      return 'Copying items';
    case 'done':
      return 'Done';
    case 'error':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return phase;
  }
}

function phaseBadgeClass(phase: CatalogMigrationPhase): string {
  switch (phase) {
    case 'done':
      return 'bg-emerald-100 text-emerald-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'skipped':
      return 'bg-amber-100 text-amber-900';
    case 'copying-schema':
    case 'copying-items':
    case 'review-mappings':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function MigrationProgress() {
  const {
    progress,
    config,
    catalogs,
    migrationRunning,
    setStep,
    pendingMigrationStart,
    setPendingMigrationStart,
    activeMigrationCatalogs,
  } = useMigrationContext();

  function displayDestName(sourceName: string) {
    const row = catalogs.find((c) => c.name === sourceName);
    const t = row?.destinationName?.trim();
    return t || sourceName;
  }
  const { runMigration, retryCatalog, retryFailedCatalogs } = useMigration();

  const catalogNames = activeMigrationCatalogs;
  const entries = catalogNames.map((name) => progress[name]).filter(Boolean);

  const catalogNamesRef = useRef(catalogNames);
  catalogNamesRef.current = catalogNames;
  const runMigrationRef = useRef(runMigration);
  runMigrationRef.current = runMigration;

  useEffect(() => {
    if (!pendingMigrationStart) return;
    const names = catalogNamesRef.current;
    if (names.length === 0) return;
    setPendingMigrationStart(false);
    void runMigrationRef.current(names);
  }, [pendingMigrationStart, setPendingMigrationStart]);

  const terminal = (p: CatalogMigrationPhase) =>
    p === 'done' || p === 'error' || p === 'skipped';
  const allDone = entries.length > 0 && entries.every((e) => terminal(e.phase));
  const hasError = entries.some((e) => e.phase === 'error');
  const hasSkipped = entries.some((e) => e.phase === 'skipped');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Migration progress</h2>
          <p className="text-sm text-slate-600">
            Catalogs are processed one at a time. Bulk uploads use up to 1000 items per request.
          </p>
          {config.dryRun && (
            <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Dry run — destination not modified
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={migrationRunning}
            onClick={() => setStep(2)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Back to options
          </button>
          <button
            type="button"
            disabled={migrationRunning || !hasError}
            onClick={() => {
              const failed = catalogNames.filter((n) => progress[n]?.phase === 'error');
              void retryFailedCatalogs(failed);
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            Retry failed
          </button>
        </div>
      </div>

      {migrationRunning && (
        <div className="mb-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Working… do not close this tab.
        </div>
      )}

      {allDone && !migrationRunning && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${hasError ? 'bg-amber-50 text-amber-900' : hasSkipped ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}
        >
          {hasError
            ? 'Migration finished with errors. Use Retry failed or inspect the API log.'
            : hasSkipped
              ? 'Migration finished. One or more catalogs were skipped after you chose not to continue.'
              : 'Migration completed successfully.'}
        </div>
      )}

      <ul className="space-y-4">
        {catalogNames.map((name) => {
          const p = progress[name];
          if (!p) {
            const dest = displayDestName(name);
            return (
              <li key={name} className="rounded-lg border border-slate-200 p-4">
                <div className="font-mono text-slate-800">
                  {name}
                  {dest !== name && (
                    <span className="block text-sm font-normal text-slate-600">
                      → {dest}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">Initializing…</p>
              </li>
            );
          }
          const pct =
            p.totalItems > 0 ? Math.min(100, Math.round((p.copiedItems / p.totalItems) * 100)) : 0;
          const dest = displayDestName(name);
          return (
            <li key={name} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-medium text-slate-900">
                  {name}
                  {dest !== name && (
                    <span className="mt-0.5 block text-sm font-normal text-slate-600">
                      → {dest}
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${phaseBadgeClass(p.phase)}`}
                >
                  {phaseLabel(p.phase)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${p.phase === 'done' ? 100 : pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Items: {p.copiedItems}
                {p.totalItems > 0 ? ` / ${p.totalItems}` : ''}
                {config.dryRun && p.phase !== 'pending' && ' (simulated)'}
              </p>
              {p.phase === 'skipped' && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                  <span className="flex-1">
                    Skipped because the destination catalog already exists and you chose not to continue.
                  </span>
                  <button
                    type="button"
                    disabled={migrationRunning}
                    onClick={() => void retryCatalog(name)}
                    className="rounded border border-amber-200 bg-white px-2 py-0.5 font-medium hover:bg-amber-100 disabled:opacity-50"
                  >
                    Run again
                  </button>
                </div>
              )}
              {p.error && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                  <span className="flex-1">{p.error}</span>
                  <button
                    type="button"
                    disabled={migrationRunning}
                    onClick={() => void retryCatalog(name)}
                    className="rounded border border-red-200 bg-white px-2 py-0.5 font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <LogPanel />
    </div>
  );
}
