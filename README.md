# Raza Tech Institute

Static Vite site with Vercel API routes for enrollment submissions and Supabase for storage.

## Supabase setup

1. Create a Supabase project and open **SQL Editor**.
2. For a new database, run these migrations in order:
   - [`supabase/migrations/20261027220000_create_enrollments.sql`](./supabase/migrations/20261027220000_create_enrollments.sql)
   - [`supabase/migrations/20261028010500_public_whatsapp_enrollments.sql`](./supabase/migrations/20261028010500_public_whatsapp_enrollments.sql)
3. If the original enrollments migration has already been run, run only the second migration. It removes the old email-verification flow and allows enrollment records without user accounts or email addresses.
4. In **Project Settings → API**, copy the Project URL and the `service_role` secret key for the Vercel environment variables. The service-role key is secret and must never be exposed in browser code.

The second migration creates the rate-limit table and a database function that only the server-side service role can execute. Row-level security stays enabled on `public.enrollments`; the browser cannot write directly to the table. The API limits each client IP to five submissions per 15 minutes.

## Deploy to Vercel

1. Import the repository into Vercel. Use `npm run build` as the build command and `dist` as the output directory.
2. Add these environment variables in **Project Settings → Environment Variables**:
   - `SUPABASE_URL` — the project URL, for example `https://your-project-id.supabase.co` (do not add `/rest/v1/`).
   - `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role secret key.
3. Add the variables to the Vercel environments you use and redeploy.
4. Test an enrollment from the deployed site. A successful submission is stored in **Supabase → Table Editor → `enrollments`**. The team can use the submitted WhatsApp number to contact the student.

The form does not collect email addresses or passwords and does not send emails. Keep the service-role key in Vercel's server environment only; never prefix it with `VITE_`.

## Local development

The Vercel API route is at [`api/enrollments.js`](./api/enrollments.js). To test submissions locally, use the Vercel CLI (`vercel dev`) and set the two server environment variables in Vercel's local environment. Vite's `npm run dev` serves the static site but does not execute Vercel API routes.
