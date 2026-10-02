# MYMZ Swimming School

[![CI](https://github.com/mubarak-jimoh/mymz-swimming-school/actions/workflows/ci.yml/badge.svg)](https://github.com/mubarak-jimoh/mymz-swimming-school/actions/workflows/ci.yml)

The website and booking management platform for MYMZ Swimming School, a real swimming school in London.

**Live site:** https://mymz-swimming-school.vercel.app

Parents can read about lessons and send an enquiry. Staff sign in to a private admin area to manage lessons, instructors, pool locations, the schedule, bookings and enquiries.

## Features

**Public site**
- Home, lessons, contact and enquiry pages, built mobile-first
- Enquiry form with server-side validation and email notifications
- Booking flow that only ever shows real availability from the database
- SEO basics: sitemap, robots file and Open Graph image

**Admin area**
- Email and password sign-in for approved staff only
- Manage lesson types, instructors, locations and the lesson schedule
- View and update bookings, customers and enquiries
- Settings for reservation timeouts and for switching bookings on or off

**Security**
- Row Level Security on every table, so visitors can only read public lesson data
- Bot protection on forms with Cloudflare Turnstile
- Rate limiting on the booking and enquiry endpoints
- Prices and capacity are checked inside the database, never trusted from the browser
- A database lock stops two people booking the last place in a lesson at the same time

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database and auth | Supabase (PostgreSQL, Row Level Security, Auth) |
| Email | Resend |
| Bot protection | Cloudflare Turnstile |
| Hosting | Vercel |
| Testing | Node.js test runner |

## Project structure

```
app/          Pages and API routes (public site, /admin, /api)
components/   Reusable UI components
lib/          Booking, pricing, validation, security and Supabase helpers
supabase/     SQL migrations for the database schema and policies
tests/        Unit tests for pricing, validation and security rules
docs/         Setup and launch guides
```

## Run it locally

You need Node.js 20 or newer.

```bash
git clone https://github.com/mubarak-jimoh/mymz-swimming-school.git
cd mymz-swimming-school
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

The site runs without any keys in a safe setup state. To turn on enquiries, bookings and the admin area, follow [docs/SETUP.md](docs/SETUP.md) to connect a Supabase project.

## Checks

```bash
npm run lint    # ESLint
npm test        # unit tests
npm run build   # production build
```

These also run automatically on every push with GitHub Actions.

## What I learned

- Building a full-stack app with the Next.js App Router and server actions
- Designing a PostgreSQL schema and writing Row Level Security policies
- Why the server and database must never trust values sent from the browser
- Handling race conditions, such as two bookings for the last place
- Taking a project for a real business from an empty folder to a live deployment

## Author

Built by **Mubarak Jimoh**.
