# Raza Tech Institute

Static Vite site with Supabase email verification and enrollment storage.

## Supabase setup

1. Create a Supabase project and open **SQL Editor**.
2. Run [`supabase/migrations/20261027220000_create_enrollments.sql`](./supabase/migrations/20261027220000_create_enrollments.sql).
   It creates the `enrollments` table, row-level security, a verified-user enrollment function, and a trigger that saves a new student's application when their email is confirmed.
3. In **Authentication → Providers → Email**, enable email/password sign-in and **Confirm email**.
4. In **Authentication → URL Configuration**, set **Site URL** to your deployed Vercel URL. Add these redirect URLs:
   - `http://localhost:3000/**` for local development.
   - `https://your-production-domain/**` for production.
   - Your Vercel preview URL pattern if preview deployments should send confirmation links back to previews.
5. Configure a production SMTP provider in Supabase before inviting real students; default email sending is rate-limited.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings.
4. Start the site with `npm run dev`.

The browser uses only the Supabase anon/publishable key. Never expose a Supabase `service_role` or secret key in frontend code or any `VITE_` environment variable.

## Deploy to Vercel

1. Import the repository into Vercel. Vercel detects Vite automatically; use `npm run build` and `dist` if prompted.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables** for each environment you deploy.
3. Redeploy after adding or changing environment variables.
4. Add the deployed domain to Supabase's allowed redirect URLs and set it as the Supabase Site URL.

## Enrollment and data access

New students create an account with their enrollment. Their application is stored in Auth metadata only until they verify their email; a database trigger then copies it into `public.enrollments`. Existing verified students can sign in and submit another enrollment. The `submit_enrollment` database function checks the authenticated user and confirmed email server-side.

Row-level security permits authenticated students to read only their own enrollment records. Direct client inserts, updates, and deletes are not granted. Review applications from the Supabase dashboard using an appropriately authorized project account.
