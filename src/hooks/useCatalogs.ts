import { useCallback } from 'react';
import { getCatalogItems, listAllCatalogNames } from '../api/iterableClient';
import { useMigrationContext } from '../context/MigrationContext';

export function useCatalogs() {
  const { sourceKey, setCatalogs, setCatalogsLoading, setCatalogsError, appendLog } =
    useMigrationContext();

  const log = useCallback(
    (e: Parameters<typeof appendLog>[0]) => {
      appendLog(e);
    },
    [appendLog],
  );

  const loadCatalogNames = useCallback(async () => {
    setCatalogsError(null);
    setCatalogsLoading(true);
    try {
      const names = await listAllCatalogNames(sourceKey, log);
      setCatalogs(names.map((name) => ({ name, selected: false })));
    } catch (e) {
      setCatalogsError(e instanceof Error ? e.message : String(e));
    } finally {
      setCatalogsLoading(false);
    }
  }, [sourceKey, setCatalogs, setCatalogsError, setCatalogsLoading, log]);

  const fetchItemCount = useCallback(
    async (catalogName: string): Promise<number> => {
      const data = await getCatalogItems(sourceKey, catalogName, 1, 1, log);
      return data.totalItemsCount ?? 0;
    },
    [sourceKey, log],
  );

  return { loadCatalogNames, fetchItemCount };
}
