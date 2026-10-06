import raw from './screens.json';
import { parseCatalog } from './parseCatalog';

/**
 * The 30 v1 screen definitions, bundled so the runner works without a backend.
 * Same shape GET /api/screens returns; adding a screen means adding an entry to screens.json.
 */
export const bundledCatalog = parseCatalog(raw);
