import { useState } from 'react';
import { useMigrationContext } from '../context/MigrationContext';

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-sky-700 bg-sky-100';
    case 'POST':
      return 'text-emerald-700 bg-emerald-100';
    case 'PUT':
      return 'text-amber-800 bg-amber-100';
    case 'PATCH':
      return 'text-violet-700 bg-violet-100';
    case 'DELETE':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-slate-700 bg-slate-100';
  }
}

export function LogPanel() {
  const { logs, clearLogs } = useMigrationContext();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800"
      >
        <span>API log ({logs.length} entries)</span>
        <span className="text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-200">
          <div className="flex justify-end border-b border-slate-100 px-2 py-1">
            <button
              type="button"
              onClick={() => clearLogs()}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Clear log
            </button>
          </div>
          <div className="max-h-72 overflow-auto text-xs">
            {logs.length === 0 ? (
              <p className="p-4 text-slate-500">No requests yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <li key={entry.id} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
                        className="flex w-full flex-wrap items-center gap-2 text-left"
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono ${methodColor(entry.method)}`}
                        >
                          {entry.method}
                        </span>
                        <span className="font-mono text-slate-700">{entry.path}</span>
                        <span
                          className={
                            entry.statusCode >= 400
                              ? 'text-red-600'
                              : entry.statusCode >= 200
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                          }
                        >
                          {entry.statusCode || 'ERR'}
                        </span>
                        <span className="text-slate-400">{entry.durationMs}ms</span>
                        {entry.catalog && (
                          <span className="text-slate-500">· {entry.catalog}</span>
                        )}
                      </button>
                      {expandedId === entry.id && (
                        <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100">
                          {entry.error && `Error: ${entry.error}\n`}
                          {entry.responseSnippet ?? ''}
                        </pre>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
