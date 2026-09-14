# Database setup

All application database definitions and protected functions live in this folder.
Supabase provides the `auth` schema, roles and Auth service.

## Existing linked project

Run these commands from Backend after signing in to the Supabase CLI:

```powershell
npm run db:status
npm run db:preview
npm run db:push
```

Migrations 202609130001 through 202609130009 and 202609140001 through 202609140003 are applied to Spartment-Final. Never run
`schema.sql` over that database: it creates the full application schema.

## Fresh Supabase project

1. Create an empty Supabase project and run `schema.sql` in its SQL Editor.
   It contains application tables, enums, constraints, indexes, functions,
   triggers, grants and row-level security policies. It contains no accounts
   or other application records and expects Supabase's standard Auth schema.
2. Link the CLI to the new project, then mark the snapshot's migrations applied
   so subsequent `db push` commands apply only newer migrations:

   ```powershell
   npx supabase link --project-ref YOUR_PROJECT_REFERENCE
   npx supabase migration repair --linked --status applied 202609130001 202609130002 202609130003 202609130004 202609130005 202609130006 202609130007 202609130008 202609130009 202609140001 202609140002 202609140003
   ```

3. Set the new URL and public API key in `Backend/.env`. Keep the frontend's
   configuration limited to its Express API URL.
4. Deploy `create-tenant` to the new project with the CLI. Its service-role
   credentials are supplied by Supabase; administrator authorization is checked
   inside the function. Create the initial administrator through Supabase Auth
   and set that user's profile role to `admin` using the privileged SQL Editor.
5. Follow [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md) for SMTP, redirects,
   the email template and protected recovery storage activation.

The snapshot was exported from the linked database's catalogs. A full restore
into a separate empty project has not been exercised. It is a fresh-project
snapshot, not a data backup; preserve database backups separately.

`npm run db:schema` refreshes `schema.sql` without exporting table contents.
Review its output and update the snapshot migration list when adding migrations.
