# Raza Tech Institute

Static Vite site with a Vercel API route and Neon Postgres for enrollment submissions.

## Set up Neon

1. Sign in to [Neon](https://neon.tech/) and create a project. Choose a region near your Vercel deployment.
2. Open the project dashboard and select **SQL Editor**.
3. Open [`neon/migrations/20261028010500_create_enrollments.sql`](./neon/migrations/20261028010500_create_enrollments.sql), copy its full contents, paste them into the SQL Editor, and run the script. It creates the enrollment table, a private rate-limit table, and the database function used by the API. Run it once per database.
4. In the Neon dashboard, open **Connect** and copy the connection string for your database. Use the pooled connection string if Neon offers a pooled option. Keep the whole string private.

## Configure and deploy on Vercel

1. Import this repository into Vercel. Set the build command to `npm run build` and the output directory to `dist`.
2. In your Vercel project, open **Settings → Environment Variables** and add `DATABASE_URL`. Paste the Neon connection string as the value and select every environment you use (Production, Preview, and/or Development).
3. Save the variable and redeploy the project so the serverless API picks it up.
4. Open the deployed site, submit a test enrollment, then check **Neon → SQL Editor** with `select * from public.enrollments order by created_at desc;` to confirm it was saved.
5. If submission fails, check **Vercel → Deployments → latest deployment → Functions → `/api/enrollments` → Logs**. Confirm `DATABASE_URL` is configured and that the migration ran against the same Neon database referenced by the connection string.

The connection string is used only by the server-side API route. Do not put it in browser code, commit it, or use a `VITE_` prefix. The API limits each client IP to five submissions per 15 minutes.

## Local development

1. Copy `.env.example` to `.env.local` and replace the example `DATABASE_URL` with your Neon connection string. Do not commit `.env.local`.
2. Install the Vercel CLI if needed, then run `npx vercel dev` from the project directory.
3. Open the local URL printed by Vercel and submit a test form. Vercel's local development server runs both the site and `/api/enrollments`; `npm run dev` starts Vite only and does not run the API route.

## Existing submissions

Changing the application database does not copy existing records or delete the old Supabase project. New submissions are written to Neon after deployment. To bring over previous submissions, export the old `enrollments` table as CSV from Supabase and import that CSV into the Neon `public.enrollments` table, mapping the matching columns. The new table has no `user_id` or `email` columns.
