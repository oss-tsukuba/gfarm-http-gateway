export const API_URL = import.meta.env.VITE_API_BASE_URL;
export const FETCH_INTERVAL = parseInt(import.meta.VITE_API_CACHE_AGE) || 60000;
export const PARALLEL_LIMIT = parseInt(import.meta.VITE_API_PARALLEL_LIMIT) || 3;
export const PARALLEL_LIMIT_MIN = 1;
export const PARALLEL_LIMIT_MAX = parseInt(import.meta.VITE_API_PARALLEL_LIMIT_MAX) || 8;
export const ROUTE_STORAGE = "/ui";
export const ROUTE_DOWNLOAD = "/dl";
export const GFARM_PREFIX = "gfarm";
