import { useCallback } from 'react';
import {
  bulkCreateItems,
  catalogItemDocumentPayload,
  createCatalog,
  getCatalogItems,
  getFieldMappings,
  setFieldMappings,
} from '../api/iterableClient';
import { useMigrationContext } from '../context/MigrationContext';
import type { CatalogMigrationPhase } from '../types/iterable';

export function useMigration() {
  const {
    sourceKey,
    destKey,
    catalogs,
    config,
    appendLog,
    updateCatalogProgress,
    setMigrationRunning,
  } = useMigrationContext();

  const destinationCatalogName = useCallback(
    (sourceName: string) => {
      const row = catalogs.find((c) => c.name === sourceName);
      const custom = row?.destinationName?.trim();
      return custom || sourceName;
    },
    [catalogs],
  );

  const log = useCallback(
    (e: Parameters<typeof appendLog>[0]) => {
      appendLog(e);
    },
    [appendLog],
  );

  const migrateOneCatalog = useCallback(
    async (catalogName: string) => {
      const setPhase = (phase: CatalogMigrationPhase) => {
        updateCatalogProgress(catalogName, { phase });
      };

      const destCatalogName = destinationCatalogName(catalogName);

      setPhase('copying-schema');
      const mappings = await getFieldMappings(sourceKey, catalogName, log);
      if (!config.dryRun) {
        await createCatalog(destKey, destCatalogName, log);
        const hasDefined =
          mappings.definedMappings &&
          typeof mappings.definedMappings === 'object' &&
          Object.keys(mappings.definedMappings).length > 0;
        if (hasDefined) {
          await setFieldMappings(destKey, destCatalogName, mappings, log);
        }
      }

      setPhase('copying-items');
      let page = 1;
      const pageSize = 1000;

      for (;;) {
        const batch = await getCatalogItems(sourceKey, catalogName, page, pageSize, log);
        const items = batch.catalogItemsWithProperties;
        if (items.length === 0) break;

        const totalItems = batch.totalItemsCount ?? 0;
        updateCatalogProgress(catalogName, (cur) => ({
          totalItems: totalItems || cur.totalItems,
        }));

        const documents: Record<string, Record<string, unknown>> = {};
        for (const item of items) {
          documents[item.itemId] = catalogItemDocumentPayload(item.value);
        }
        if (!config.dryRun) {
          await bulkCreateItems(
            destKey,
            destCatalogName,
            documents,
            !config.overwrite,
            log,
          );
        }

        const n = items.length;
        updateCatalogProgress(catalogName, (cur) => ({
          copiedItems: cur.copiedItems + n,
        }));

        page += 1;
      }

      setPhase('done');
    },
    [
      sourceKey,
      destKey,
      config.dryRun,
      config.overwrite,
      destinationCatalogName,
      log,
      updateCatalogProgress,
    ],
  );

  const runMigration = useCallback(
    async (catalogNames: string[]) => {
      setMigrationRunning(true);
      try {
        for (const name of catalogNames) {
          try {
            await migrateOneCatalog(name);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            updateCatalogProgress(name, { phase: 'error', error: msg });
          }
        }
      } finally {
        setMigrationRunning(false);
      }
    },
    [migrateOneCatalog, setMigrationRunning, updateCatalogProgress],
  );

  const retryCatalog = useCallback(
    async (catalogName: string) => {
      updateCatalogProgress(catalogName, {
        phase: 'pending',
        error: undefined,
        copiedItems: 0,
        totalItems: 0,
      });
      setMigrationRunning(true);
      try {
        await migrateOneCatalog(catalogName);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        updateCatalogProgress(catalogName, { phase: 'error', error: msg });
      } finally {
        setMigrationRunning(false);
      }
    },
    [migrateOneCatalog, setMigrationRunning, updateCatalogProgress],
  );

  const retryFailedCatalogs = useCallback(
    async (catalogNames: string[]) => {
      setMigrationRunning(true);
      try {
        for (const name of catalogNames) {
          updateCatalogProgress(name, {
            phase: 'pending',
            error: undefined,
            copiedItems: 0,
            totalItems: 0,
          });
          try {
            await migrateOneCatalog(name);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            updateCatalogProgress(name, { phase: 'error', error: msg });
          }
        }
      } finally {
        setMigrationRunning(false);
      }
    },
    [migrateOneCatalog, setMigrationRunning, updateCatalogProgress],
  );

  return { migrateOneCatalog, runMigration, retryCatalog, retryFailedCatalogs };
}
