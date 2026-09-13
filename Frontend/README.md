# Spartment frontend

Run npm install, then npm run dev in this folder. Also run npm run dev in Backend.
Set VITE_API_URL=/api in .env.local (see .env.example). Vite proxies /api to
http://127.0.0.1:5000 while keeping browser cookies on the frontend's own site.
Sessions use HttpOnly cookies and are restored through the backend. Sign in
again once after upgrading from the previous localStorage session. Production
requires HTTPS and a same-site API proxy; see Backend/SECURITY.md.

This folder contains React UI, API request/session handling and display helpers.
All Supabase database access, server operations and configuration are in Backend.
There is no browser Supabase dependency or database credential configuration.

Use npm run build for a production bundle.
