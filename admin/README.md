# PrayerMap Admin Dashboard

Admin dashboard for managing the PrayerMap application.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

The admin dashboard will be available at `http://localhost:5174`

## Requirements

- Admin users must have `role = 'admin'` in the `profiles` table
- Uses the same Supabase project as the main PrayerMap app

## Tech Stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router v7
- TanStack Query
- Supabase
