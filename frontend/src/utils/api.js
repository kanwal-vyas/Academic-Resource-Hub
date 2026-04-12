// Shared API base URL — reads from .env (VITE_API_URL), falls back to localhost for dev
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
