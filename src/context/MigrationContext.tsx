import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CatalogExistsConfirmDialog } from '../components/CatalogExistsConfirmDialog';
import type { ApiLogEntry, CatalogProgress, CatalogRow } from '../types/iterable';

const STORAGE_SOURCE = 'iterable-copier-source-key';
const STORAGE_DEST = 'iterable-copier-dest-key';

export interface ExistingCatalogConfirmPayload {
  sourceCatalogName: string;
  destCatalogName: string;
}

export interface MigrationConfig {
  overwrite: boolean;
  dryRun: boolean;
}

interface MigrationState {
  step: number;
  sourceKey: string;
  destKey: string;
  sourceValidated: boolean;
  destValidated: boolean;
  catalogs: CatalogRow[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  config: MigrationConfig;
  progress: Record<string, CatalogProgress>;
  logs: ApiLogEntry[];
  migrationRunning: boolean;
  pendingMigrationStart: boolean;
  activeMigrationCatalogs: string[];
}

interface MigrationContextValue extends MigrationState {
  setStep: (n: number) => void;
  setSourceKey: (v: string) => void;
  setDestKey: (v: string) => void;
  setSourceValidated: (v: boolean) => void;
  setDestValidated: (v: boolean) => void;
  setCatalogs: (rows: CatalogRow[] | ((prev: CatalogRow[]) => CatalogRow[])) => void;
  setCatalogsLoading: (v: boolean) => void;
  setCatalogsError: (v: string | null) => void;
  setConfig: (c: MigrationConfig | ((prev: MigrationConfig) => MigrationConfig)) => void;
  setProgress: (p: Record<string, CatalogProgress> | ((prev: Record<string, CatalogProgress>) => Record<string, CatalogProgress>)) => void;
  updateCatalogProgress: (
    name: string,
    patch: Partial<CatalogProgress> | ((prev: CatalogProgress) => Partial<CatalogProgress>),
  ) => void;
  appendLog: (entry: Omit<ApiLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  setMigrationRunning: (v: boolean) => void;
  setPendingMigrationStart: (v: boolean) => void;
  setActiveMigrationCatalogs: (names: string[]) => void;
  resetProgressForMigration: (catalogNames: string[]) => void;
  loadKeysFromStorage: () => void;
  persistKeys: () => void;
  requestExistingCatalogConfirm: (payload: ExistingCatalogConfirmPayload) => Promise<boolean>;
}

const MigrationContext = createContext<MigrationContextValue | null>(null);

export function MigrationProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [sourceKey, setSourceKeyState] = useState('');
  const [destKey, setDestKeyState] = useState('');
  const [sourceValidated, setSourceValidated] = useState(false);
  const [destValidated, setDestValidated] = useState(false);
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [config, setConfig] = useState<MigrationConfig>({ overwrite: true, dryRun: false });
  const [progress, setProgress] = useState<Record<string, CatalogProgress>>({});
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [pendingMigrationStart, setPendingMigrationStart] = useState(false);
  const [activeMigrationCatalogs, setActiveMigrationCatalogs] = useState<string[]>([]);
  const [existingCatalogConfirm, setExistingCatalogConfirm] = useState<ExistingCatalogConfirmPayload | null>(
    null,
  );
  const existingCatalogConfirmResolverRef = useRef<((proceed: boolean) => void) | null>(null);

  const requestExistingCatalogConfirm = useCallback((payload: ExistingCatalogConfirmPayload) => {
    return new Promise<boolean>((resolve) => {
      existingCatalogConfirmResolverRef.current = resolve;
      setExistingCatalogConfirm(payload);
    });
  }, []);

  const resolveExistingCatalogConfirm = useCallback((proceed: boolean) => {
    setExistingCatalogConfirm(null);
    const r = existingCatalogConfirmResolverRef.current;
    existingCatalogConfirmResolverRef.current = null;
    r?.(proceed);
  }, []);

  const onExistingCatalogContinue = useCallback(() => {
    resolveExistingCatalogConfirm(true);
  }, [resolveExistingCatalogConfirm]);

  const onExistingCatalogSkip = useCallback(() => {
    resolveExistingCatalogConfirm(false);
  }, [resolveExistingCatalogConfirm]);

  const setSourceKey = useCallback((v: string) => {
    setSourceKeyState(v);
    setSourceValidated(false);
  }, []);

  const setDestKey = useCallback((v: string) => {
    setDestKeyState(v);
    setDestValidated(false);
  }, []);

  const updateCatalogProgress = useCallback(
    (name: string, patch: Partial<CatalogProgress> | ((prev: CatalogProgress) => Partial<CatalogProgress>)) => {
      setProgress((prev) => {
        const cur = prev[name];
        if (!cur) return prev;
        const applied = typeof patch === 'function' ? patch(cur) : patch;
        return { ...prev, [name]: { ...cur, ...applied } };
      });
    },
    [],
  );

  const appendLog = useCallback((entry: Omit<ApiLogEntry, 'id' | 'timestamp'>) => {
    const full: ApiLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    setLogs((prev) => [...prev.slice(-500), full]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const resetProgressForMigration = useCallback((catalogNames: string[]) => {
    const next: Record<string, CatalogProgress> = {};
    for (const name of catalogNames) {
      next[name] = {
        name,
        phase: 'pending',
        copiedItems: 0,
        totalItems: 0,
      };
    }
    setProgress(next);
  }, []);

  const loadKeysFromStorage = useCallback(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_SOURCE) ?? '';
      const d = sessionStorage.getItem(STORAGE_DEST) ?? '';
      if (s) setSourceKeyState(s);
      if (d) setDestKeyState(d);
      setSourceValidated(false);
      setDestValidated(false);
    } catch {
      /* ignore */
    }
  }, []);

  const persistKeys = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_SOURCE, sourceKey);
      sessionStorage.setItem(STORAGE_DEST, destKey);
    } catch {
      /* ignore */
    }
  }, [sourceKey, destKey]);

  const value = useMemo<MigrationContextValue>(
    () => ({
      step,
      sourceKey,
      destKey,
      sourceValidated,
      destValidated,
      catalogs,
      catalogsLoading,
      catalogsError,
      config,
      progress,
      logs,
      migrationRunning,
      pendingMigrationStart,
      activeMigrationCatalogs,
      setStep,
      setSourceKey,
      setDestKey,
      setSourceValidated,
      setDestValidated,
      setCatalogs,
      setCatalogsLoading,
      setCatalogsError,
      setConfig,
      setProgress,
      updateCatalogProgress,
      appendLog,
      clearLogs,
      setMigrationRunning,
      setPendingMigrationStart,
      setActiveMigrationCatalogs,
      resetProgressForMigration,
      loadKeysFromStorage,
      persistKeys,
      requestExistingCatalogConfirm,
    }),
    [
      step,
      sourceKey,
      destKey,
      sourceValidated,
      destValidated,
      catalogs,
      catalogsLoading,
      catalogsError,
      config,
      progress,
      logs,
      migrationRunning,
      pendingMigrationStart,
      activeMigrationCatalogs,
      setSourceKey,
      setDestKey,
      updateCatalogProgress,
      appendLog,
      resetProgressForMigration,
      persistKeys,
      loadKeysFromStorage,
      requestExistingCatalogConfirm,
    ],
  );

  return (
    <MigrationContext.Provider value={value}>
      {children}
      <CatalogExistsConfirmDialog
        open={existingCatalogConfirm !== null}
        sourceCatalogName={existingCatalogConfirm?.sourceCatalogName ?? ''}
        destCatalogName={existingCatalogConfirm?.destCatalogName ?? ''}
        onContinue={onExistingCatalogContinue}
        onSkip={onExistingCatalogSkip}
      />
    </MigrationContext.Provider>
  );
}

export function useMigrationContext(): MigrationContextValue {
  const ctx = useContext(MigrationContext);
  if (!ctx) throw new Error('useMigrationContext must be used within MigrationProvider');
  return ctx;
}
