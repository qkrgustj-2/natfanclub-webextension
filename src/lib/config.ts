/**
 * Base URL for Hackomania API (no trailing slash).
 * Extension dev server runs on 3001 so the website can use 3000.
 * For production, set this to your deployed app origin and add it to host_permissions in wxt.config.ts.
 */
export const HACKOMANIA_API_BASE = 'http://localhost:3000';

export const HACKOMANIA_LOGIN_PATH = '/api/auth/login';
export const HACKOMANIA_CHAT_REPORT_PATH = '/api/internal/extension/chat-report';

export const BACKEND_VERIFY_CONTENT_URL =
  'https://natfanclub-backend-809989871890.asia-southeast1.run.app/verify_content';
