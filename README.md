# CineWeb + Netlify + Supabase

This version keeps the existing CineWeb UI but loads movie data from a Supabase PostgreSQL database through a Netlify Function.

## 1. Supabase
Create a Supabase project, open SQL Editor, and run `supabase_schema.sql`.

## 2. Netlify environment variables
In Netlify Project configuration -> Environment variables, add:

SUPABASE_URL=your-project-url
SUPABASE_SECRET_KEY=your-server-side-secret-key

If your project uses the older key naming, the function also accepts:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

Never put the secret/service-role key in `index.html`, `script.js`, or any other browser file.

## 3. Deploy
Push this folder to GitHub and import the repository into Netlify.

The Netlify Function endpoint will be:
`/.netlify/functions/movies`

## 4. Current scope
This first step moves movie data to the database. The watchlist is still browser LocalStorage.

Next steps can add:
- Supabase Auth login/register
- Database-backed user watchlists
- Admin movie management
- Authorized trailer/video links
