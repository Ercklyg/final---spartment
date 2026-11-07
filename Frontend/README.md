# Spartment frontend

Run npm install, then npm run dev in this folder. Also run npm run dev in Backend.
Set VITE_API_URL=/api in .env.local (see .env.example). Vite proxies /api to
http://127.0.0.1:5000 while keeping browser cookies on the frontend's own site.
Sessions use HttpOnly cookies and are restored through the backend. Sign in
again once after upgrading from the previous localStorage session. Production
requires HTTPS and a same-site API proxy; see Backend/SECURITY.md.

On Vercel, set VITE_API_URL=/api as a Config variable and redeploy after changing
it. The /api rewrite in vercel.json forwards requests to the Render backend.
On Render, set FRONTEND_ORIGIN to the exact frontend origin (for example,
https://final-spartment.vercel.app), HOST=0.0.0.0 and NODE_ENV=production.
Keep the rewrite destination in sync with the Render service URL.

Offline mode persists only the tenant account, billing overview and request-list
responses. Copies expire after 24 hours, are size/count limited, and are cleared
on logout or account changes. Administrator workspaces, analytics, notifications,
receipts, attachments and settings are never written to the offline cache.

This folder contains React UI, API request/session handling and display helpers.
All Supabase database access, server operations and configuration are in Backend.
There is no browser Supabase dependency or database credential configuration.

Use npm run build for a production bundle.
