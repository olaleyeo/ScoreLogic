// In production, when backend serves frontend or via reverse proxy, relative '/api' is used.
// If VITE_API_URL is provided (e.g., frontend on Vercel, backend on Render), it will use that origin.
// In local development, direct requests to http://localhost:3000 so calls don't fail if proxy is disconnected.
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

