import { useEffect, useState } from 'react';
import { validateApiKey } from '../api/iterableClient';
import { useMigrationContext } from '../context/MigrationContext';

export function ApiKeyForm() {
  const {
    sourceKey,
    destKey,
    setSourceKey,
    setDestKey,
    sourceValidated,
    destValidated,
    setSourceValidated,
    setDestValidated,
    setStep,
    appendLog,
    loadKeysFromStorage,
    persistKeys,
  } = useMigrationContext();

  const [busy, setBusy] = useState<'idle' | 'validating'>('idle');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [destError, setDestError] = useState<string | null>(null);

  useEffect(() => {
    loadKeysFromStorage();
  }, [loadKeysFromStorage]);

  async function validateBoth() {
    setBusy('validating');
    setSourceError(null);
    setDestError(null);
    setSourceValidated(false);
    setDestValidated(false);

    const log = appendLog;
    try {
      const [okSrc, okDst] = await Promise.all([
        validateApiKey(sourceKey.trim(), log),
        validateApiKey(destKey.trim(), log),
      ]);
      if (!okSrc) {
        setSourceError('Invalid or unauthorized source API key.');
      } else {
        setSourceValidated(true);
      }
      if (!okDst) {
        setDestError('Invalid or unauthorized destination API key.');
      } else {
        setDestValidated(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSourceError(msg);
      setDestError(msg);
    } finally {
      setBusy('idle');
    }
  }

  const canContinue = sourceValidated && destValidated;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Connect projects</h2>
      <p className="mb-6 text-sm text-slate-600">
        Use Iterable API keys from the source project (read) and destination project (write). Keys
        stay in this browser only.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="src-key" className="mb-1 block text-sm font-medium text-slate-700">
            Source API key
          </label>
          <input
            id="src-key"
            type="password"
            autoComplete="off"
            value={sourceKey}
            onChange={(e) => setSourceKey(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Iterable API key (read catalogs)"
          />
          {sourceError && <p className="mt-1 text-sm text-red-600">{sourceError}</p>}
          {sourceValidated && <p className="mt-1 text-sm text-emerald-600">Source key accepted.</p>}
        </div>

        <div>
          <label htmlFor="dst-key" className="mb-1 block text-sm font-medium text-slate-700">
            Destination API key
          </label>
          <input
            id="dst-key"
            type="password"
            autoComplete="off"
            value={destKey}
            onChange={(e) => setDestKey(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Iterable API key (create catalogs & items)"
          />
          {destError && <p className="mt-1 text-sm text-red-600">{destError}</p>}
          {destValidated && (
            <p className="mt-1 text-sm text-emerald-600">Destination key accepted.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy === 'validating' || !sourceKey.trim() || !destKey.trim()}
          onClick={() => void validateBoth()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {busy === 'validating' ? 'Validating…' : 'Validate keys'}
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => {
            persistKeys();
            setStep(1);
          }}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          Next: catalogs
        </button>
      </div>
    </div>
  );
}
