# Claude Builder Club — Penn State

The official website for Penn State University's Claude Builder Club — Anthropic's campus partnership at PSU. This platform serves as a community hub, education resource center, project showcase, and event coordination tool for students and faculty exploring AI with Claude.

---

## Table of Contents

1. [Overview](#overview)
2. [Mission](#mission)
3. [Tech Stack](#tech-stack)
4. [Feature Set](#feature-set)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Local Development Setup](#local-development-setup)
8. [External Service Setup](#external-service-setup)
9. [Firestore Data Model](#firestore-data-model)
10. [Firestore Indexes](#firestore-indexes)
11. [Admin Access](#admin-access)
12. [Deployment](#deployment)
13. [Design System](#design-system)

---

## Overview

The Claude Builder Club website is a Next.js application that gives Penn State students and faculty a single place to:

- Learn about the club and its mission
- RSVP to events pulled from Google Calendar
- Access curated AI learning resources filtered by skill level
- Browse and submit projects to the community showcase
- Read case studies from professors who have integrated AI into their syllabi
- Claim their free Claude Pro subscription (via JotForm)
- Chat with an AI assistant that knows about the club

Authentication is restricted to `@psu.edu` email addresses. The site is deployed on Vercel and uses Firebase for auth and data persistence.

---

## Mission

> The Claude Builder Club empowers students of all backgrounds to explore the frontier of AI by building with Claude in a safe, responsible, and creative environment. We believe in hands-on learning, ethical innovation, and creating a campus culture where anyone — regardless of major — can shape the future with AI.

Three pillars: **Explore** (AI concepts) · **Build** (real projects) · **Connect** (community)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16.1.6 (App Router) | `"use client"` pages with `force-dynamic` where needed |
| Language | TypeScript 5 | Strict mode throughout |
| Styling | Tailwind CSS v4 | Custom design tokens (no component library) |
| Auth | Firebase Auth 12 | Google OAuth + email/password, restricted to `@psu.edu` |
| Database | Cloud Firestore | Real-time collections for members, projects, resources, rsvps
| Icons | Lucide React 0.575 | |
| Fonts | Geist, Geist Mono, Poppins, Lora | Via `next/font/google` |
| Deployment | Vercel | Automatic builds on git push |
| Calendar | Google Calendar API v3 | Server-side proxy; 5-minute Next.js revalidation cache |
| GitHub | GitHub REST API | 12-hour server-side in-memory cache |

---

## Feature Set

### Public Landing Page (`/`)

The marketing homepage for prospective members and visitors. Contains:

- **Hero** — Full-width dark band with the club name, tagline, and a live streaming chat prompt box powered by `claude-sonnet-4-6`. The assistant answers questions about the club using a curated system prompt.
- **Mission Section** — Three-pillar layout (Explore / Build / Connect) with the club's mission statement.
- **Features Section** — Card grid highlighting what the club offers (workshops, resources, projects, faculty partnerships).
- **Stats Section** — Community growth numbers.
- **Newsletter Section** — Beehiiv embed for the monthly AI newsletter.

### Authentication (`/auth`)

Split-panel sign-in/sign-up page:

- **Google OAuth** — Restricted to `@psu.edu` domain via `hd: "psu.edu"` custom parameter.
- **Email/Password** — Sign-up enforces `@psu.edu` suffix validation client-side; sign-in is unrestricted (for users who registered before the domain check was added).
- **Smart redirect** — After auth, checks Firestore for an existing member profile. Redirects new users to `/settings` (profile setup) and returning users to `/dashboard`.

### Member Dashboard (`/dashboard`)

The logged-in home base. Requires a completed member profile (redirects to `/settings` if none exists). Sections:

| Section | Description |
|---|---|
| Header | Personalized greeting, member-since chip, project count chip |
| Claude Pro CTA | Dark card with "Get Claude Pro — Free" CTA linking to the JotForm claim form |
| Event Countdown | Live countdown to the next event the user has RSVP'd to; updates every 60 seconds |
| Quick Actions | 4 cards: Events, Resources, Projects, Visit GroupMe |
| Community Pulse | 3-stat strip: total members, approved projects, events this semester |
| Upcoming Events | Up to 5 next events with date badge and one-click RSVP toggle |
| Recommended Resources | Up to 3 resources filtered to the user's tech level |
| My Project Submissions | Status-tracked list of the user's own project submissions |
| Community Spotlight | Full-width card for the featured approved project (or top-starred fallback) |

### Events (`/events`)

Public-facing event browser (RSVP requires auth):

- Events are fetched from `/api/events` which proxies the Google Calendar API.
- Events are grouped into: **Today**, **This Week**, **This Month**, **This Semester**, **Later**.
- Groups with ≤3 events render as a responsive grid; groups with 4+ events render as a horizontal scroll row.
- Each event card shows: date badge, title, time, location, description, attendee count with name chips, and an RSVP button.
- **RSVP system** — Optimistic UI: state updates immediately, then persists to `rsvps/{eventId}/attendees/{userId}` in Firestore. Failure reverts to server state.
- Bottom CTA with GroupMe and Instagram links.

### Resources (`/resources`)

Member-only curated resource hub:

- **Personalization** — Resources are filtered and sorted based on the user's `techLevel` from their member profile. A "Picked for You" section surfaces featured resources matching the user's level.
- **Sections** — Getting Started, Prompt Engineering, Workshop Materials, For Faculty, From Our GitHub, Reference & Docs, Further Reading.
- **Sticky filter bar** — Chips to jump to any category. Persists on scroll.
- **GitHub org integration** — Live repos from the `Claude-PSU` GitHub org are fetched via `/api/github-repos` with a 12-hour cache and displayed as cards with language, stars, and last-updated metadata.
- Resource types: `drive` (Google Drive), `link` (external URL), `video`.

### Projects Gallery (`/projects`)

Community-driven showcase of member AI projects:

- Filterable card grid by tag, tech level, language, and course.
- Each card shows: title, description, submitter, language badge, GitHub star count, last updated.
- Only `approved` projects are publicly visible.
- Members can submit their own projects via a submission form.
- On submission, the GitHub API auto-pulls: primary language, star count, last commit date, README excerpt.
- Projects enter a **pending** state and await admin approval.

### Project Detail (`/projects/[id]`)

Full project page:

- Full README rendered via `react-markdown`.
- Collaborators list.
- Associated course link (if any).
- **View on GitHub** CTA.
- Admin-only status controls (approve/reject/request changes) rendered inline if the logged-in user is an admin.

### Case Studies (`/case-studies`)

Showcases of professors who have integrated AI projects into their syllabi in coordination with the club. Two types:

- **Academic** — Course name, professor, department, semester, outcomes, tools used, student count.
- **Club** — Organization name and type instead of course info.

Case studies are stored in Firestore and managed via the admin dashboard.

### Profile & Settings (`/settings`)

Member profile setup and management:

- **Required fields** — Display name, major, year, college, tech level (Beginner / Some / Intermediate / Advanced).
- **Optional** — Interests (multi-select), referral source.
- **Notification preferences** — Email reminders, newsletter opt-in.
- Profile is stored in `members/{uid}` in Firestore.
- Completing a profile is required before accessing `/dashboard` (new users are redirected here from `/auth`).

### Admin Dashboard (`/admin`)

Restricted to users with `isAdmin: true` in their Firestore member document. Six tabs:

| Tab | Purpose |
|---|---|
| Overview | Club metrics: member count, project stats, event counts by semester, recent signups |
| Resources | Create, edit, publish/unpublish, and reorder learning resources |
| Case Studies | Create and manage academic/club case studies |
| Users | View all members, promote to admin, search and filter, delete accounts |
| Events | Sync events from Google Calendar into Firestore; view all synced events |
| Projects | Moderation queue — approve, reject, or request changes on pending project submissions; toggle `featured` flag |

### AI Chat Assistant

Available in the hero on the public landing page. Implemented as a streaming SSE endpoint at `/api/chat`:

- Uses `claude-sonnet-4-6` with a 512-token cap.
- Hardcoded system prompt with club facts, mission, membership info, and response guidelines.
- Streams token-by-token via `ReadableStream` + `text/event-stream`.
- Context window capped at the last 10 messages.

---

## Project Structure

```
web/
├── app/
│   ├── (app)/                          # Authenticated + public app routes
│   │   ├── layout.tsx                  # Root layout: Navbar, Footer, AuthProvider
│   │   ├── page.tsx                    # Public landing page
│   │   ├── dashboard/page.tsx          # Member dashboard
│   │   ├── events/page.tsx             # Events browser + RSVP
│   │   ├── resources/page.tsx          # Resource hub
│   │   ├── projects/
│   │   │   ├── page.tsx                # Projects gallery
│   │   │   └── [id]/page.tsx           # Project detail
│   │   ├── case-studies/page.tsx       # Case studies showcase
│   │   ├── profile/page.tsx            # Public profile view
│   │   ├── settings/page.tsx           # Member profile setup
│   │   ├── admin/
│   │   │   ├── page.tsx                # Admin shell + tab router
│   │   │   └── _tabs/
│   │   │       ├── OverviewTab.tsx
│   │   │       ├── ResourcesTab.tsx
│   │   │       ├── CaseStudiesTab.tsx
│   │   │       ├── UsersTab.tsx
│   │   │       ├── EventsTab.tsx
│   │   │       └── ProjectsTab.tsx
│   │   └── api/
│   │       ├── chat/route.ts           # Streaming AI chat (SSE)
│   │       ├── events/route.ts         # Google Calendar proxy (5-min cache)
│   │       ├── github-repos/
│   │       │   ├── route.ts            # GitHub org repos (12-hour cache)
│   │       │   └── validate/route.ts   # Validate a GitHub repo URL
│   │       └── admin/
│   │           ├── delete-user/route.ts
│   │           └── sync-events/route.ts
│   ├── (auth)/
│   │   └── auth/page.tsx               # Sign in / sign up
│   └── globals.css
├── components/
│   ├── AuthCTA.tsx                     # Sign-in / dashboard CTA button
│   ├── ClubLogo.tsx                    # Club logo component (light/dark variants)
│   ├── FeaturesSection.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx                        # Landing page hero with Claude chat
│   ├── MissionSection.tsx
│   ├── Modal.tsx
│   ├── Navbar.tsx
│   ├── NewsletterSection.tsx
│   ├── PageHero.tsx                    # Reusable dark page header band
│   ├── PromptBox.tsx                   # Streaming chat UI component
│   └── StatsSection.tsx
├── lib/
│   ├── auth-context.tsx                # React context: user + loading state
│   ├── firebase.ts                     # Firebase client SDK init
│   ├── firebase-admin.ts               # Firebase Admin SDK (server-side only)
│   ├── server-cache.ts                 # In-memory TTL cache for API routes
│   └── types.ts                        # Shared TypeScript interfaces
├── public/
│   └── branding/                       # Anthropic + club logo assets
├── .env.local                          # Local environment variables (not committed)
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Environment Variables

Create a `.env.local` file in the `web/` directory:

```env
# ─── Firebase (Client SDK) ────────────────────────────────────────────────────
# Get these from Firebase Console → Project Settings → General → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ─── Firebase (Admin SDK) ─────────────────────────────────────────────────────
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Paste the entire JSON as a single-line string (or use a secrets manager)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# ─── Google Calendar ──────────────────────────────────────────────────────────
# Google Cloud Console → APIs → Calendar API → Credentials → API Key
GOOGLE_CALENDAR_API_KEY=
# The calendar ID — found in Google Calendar settings for the specific calendar
# Format: letters/numbers followed by @group.calendar.google.com, or an email address
GOOGLE_CALENDAR_ID=

# ─── GitHub (optional) ────────────────────────────────────────────────────────
# Increases the GitHub API rate limit from 60 to 5,000 requests/hour
# github.com → Settings → Developer settings → Personal access tokens → Fine-grained
# Requires: public_repo read access
GITHUB_TOKEN=
```

> **Never commit `.env.local`.** It is listed in `.gitignore` by default.

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm (or pnpm/bun)
- A Firebase project (free Spark plan works)

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/Claude-PSU/website.git
   cd website/web
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env.local`** — copy the template above and fill in your keys (see [External Service Setup](#external-service-setup) for how to obtain each key).

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

6. **Create your first admin account**
   - Sign up at `/auth` with your `@psu.edu` email
   - Complete your profile at `/settings`
   - In Firebase Console → Firestore → `members` collection, open your document and set `isAdmin: true`
   - Refresh the site — you now have access to `/admin`

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |

---

## External Service Setup

### Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.

2. **Enable Authentication**
   - Authentication → Sign-in method → Enable **Google** and **Email/Password**
   - For Google: add your Vercel deployment URL and `localhost` to the authorized domains list

3. **Enable Firestore**
   - Firestore Database → Create database → Start in **production mode**
   - Set security rules (see [Firestore Data Model](#firestore-data-model) for the recommended rule structure)

4. **Get client credentials**
   - Project Settings → General → scroll to "Your apps" → add a Web app
   - Copy the `firebaseConfig` values into your `.env.local` as the `NEXT_PUBLIC_*` variables

5. **Get Admin SDK credentials**
   - Project Settings → Service Accounts → Generate new private key
   - A JSON file downloads — paste its entire contents as a single-line string into `FIREBASE_SERVICE_ACCOUNT_KEY`

### Google Calendar API

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create (or select) a project.

2. Enable the **Google Calendar API**:
   - APIs & Services → Library → search "Google Calendar API" → Enable

3. Create an API key:
   - APIs & Services → Credentials → Create Credentials → API Key
   - Restrict the key to the **Google Calendar API** only
   - Add your domain(s) to the HTTP referrer restrictions if desired (optional for server-side keys)

4. Get your Calendar ID:
   - Open Google Calendar → Settings → select your club calendar → scroll to "Integrate calendar"
   - Copy the Calendar ID (looks like `abc123@group.calendar.google.com`)

5. Make sure the calendar is **public** (or that the API key has access to it):
   - Calendar Settings → Access permissions → "Make available to public"

### GitHub API

The `/api/github-repos` route fetches the 6 most recently-updated public repos from the `Claude-PSU` GitHub organization.

**Without a token:** Works at 60 unauthenticated requests/hour per IP. Fine for development; may rate-limit on production under heavy traffic.

**With a token (recommended for production):**
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create a token with **read access to public repositories**
3. Add it to `.env.local` as `GITHUB_TOKEN`

### Vercel (Deployment)

See the [Deployment](#deployment) section.

---

## Firestore Data Model

### `members/{uid}`

Stores the member profile created after sign-up.

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `email` | string | PSU email address |
| `displayName` | string | |
| `major` | string | |
| `year` | string | e.g., "Junior" |
| `college` | string | |
| `techLevel` | enum | `"beginner"` \| `"some"` \| `"intermediate"` \| `"advanced"` \| `""` |
| `interests` | string[] | Multi-select tags |
| `emailReminders` | boolean | |
| `newsletter` | boolean | |
| `referralSource` | string? | Optional |
| `isAdmin` | boolean? | Set manually; gates `/admin` access |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |

### `projects/{id}`

User-submitted AI projects.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `ownerId` | string | Firebase UID of submitter |
| `ownerName` | string | |
| `ownerEmail` | string | |
| `collaborators` | string[] | PSU email addresses |
| `repoUrl` | string | Validated public GitHub URL |
| `title` | string | |
| `description` | string | ≤280 characters |
| `tags` | string[] | From curated list: chatbot, data analysis, education, automation, research, agent, RAG |
| `techLevel` | enum | `"beginner"` \| `"intermediate"` \| `"advanced"` |
| `courseId` | string? | Optional course reference |
| `demoUrl` | string? | Optional live demo URL |
| `bannerUrl` | string? | Optional banner image URL |
| `githubMeta` | map | `{ owner, repo, language, stars, lastCommit, readmeExcerpt }` |
| `status` | enum | `"pending"` \| `"approved"` \| `"rejected"` \| `"changes_requested"` |
| `featured` | boolean | Admin-pinned; surfaces in dashboard Spotlight |
| `submittedAt` | string | ISO timestamp |
| `approvedAt` | string? | ISO timestamp |
| `adminNote` | string? | Rejection reason or change request |

### `resources/{id}`

Curated learning resources managed via the admin dashboard.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `title` | string | |
| `description` | string | |
| `type` | enum | `"drive"` \| `"link"` \| `"video"` |
| `href` | string | |
| `category` | enum | `"getting-started"` \| `"prompt-engineering"` \| `"workshops"` \| `"reference"` \| `"external"` \| `"faculty"` |
| `audience` | enum | `"student"` \| `"faculty"` \| `"all"` |
| `techLevels` | string[] | Which tech levels this resource is appropriate for |
| `tags` | string[] | |
| `featured` | boolean | Surfaces in "Picked for You" on the dashboard |
| `order` | number | Manual sort order |
| `published` | boolean | Only published resources are shown to members |

### `case-studies/{id}`

Faculty/club AI integration case studies.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `type` | enum | `"academic"` \| `"club"` |
| `course` | string? | Academic only |
| `courseTitle` | string? | Academic only |
| `professor` | string? | Academic only |
| `department` | string? | Academic only |
| `orgName` | string? | Club type only |
| `orgType` | string? | Club type only |
| `title` | string | |
| `semester` | string | e.g., "Spring 2025" |
| `description` | string | |
| `outcomes` | string[] | Bullet-point outcomes |
| `tools` | string[] | Tools/technologies used |
| `studentCount` | number? | |
| `image` | string? | |
| `featured` | boolean | |
| `order` | number | Sort order |
| `published` | boolean | |

### `rsvps/{eventId}/attendees/{uid}`

Subcollection tracking per-event RSVPs.

| Field | Type | Notes |
|---|---|---|
| `displayName` | string | |
| `email` | string | |
| `rsvpedAt` | string | ISO timestamp |

### `events/{id}` (optional — admin-synced)

Events synced from Google Calendar into Firestore via the admin Events tab. Used for historical tracking and admin overview stats. The live events page reads directly from the Calendar API, not this collection.

---

## Firestore Indexes

Some queries require composite indexes that Firestore does not create automatically. Firebase will log a direct console link to create any missing index on first query execution. The following indexes are needed:

| Collection | Fields | Purpose |
|---|---|---|
| `projects` | `status ASC`, `featured ASC` | Dashboard Community Spotlight widget |
| `projects` | `status ASC`, `ownerId ASC` | Dashboard "My Submissions" panel |
| `resources` | `published ASC`, `order ASC` | Resources page sorted by order |

To create indexes manually:
1. Firebase Console → Firestore → Indexes → Add index
2. Or click the link logged in the browser/server console when a query fails

---

## Admin Access

Admin status is stored as `isAdmin: true` on a user's Firestore `members` document. There is no Firebase custom claim — the check is done client-side and relies on Firestore security rules to prevent non-admins from writing to restricted collections.

**To grant admin access:**

1. Sign up normally at `/auth`
2. Complete the profile at `/settings`
3. Open Firebase Console → Firestore → `members` collection → find the document by UID
4. Add field: `isAdmin` = `true` (boolean)
5. The user can now access `/admin`

**Admin capabilities:**
- View club growth metrics and member demographics
- Create, edit, publish/unpublish, and reorder resources
- Create and manage case studies
- View all members; promote to admin; delete accounts
- Sync Google Calendar events into Firestore
- Approve, reject, or request changes on project submissions
- Toggle `featured` flag on approved projects

---

## Deployment

### Vercel (Recommended)

1. Push the repo to GitHub.

2. Go to [vercel.com](https://vercel.com), import the repository.

3. Set the **Root Directory** to `web` (since the Next.js project lives in the `web/` subfolder).

4. Add all environment variables from your `.env.local` in the Vercel project settings under **Settings → Environment Variables**.

5. Deploy. Vercel will automatically build and deploy on every push to the main branch.

6. **Add your Vercel domain to Firebase:**
   - Firebase Console → Authentication → Settings → Authorized domains → Add domain
   - Add both `your-project.vercel.app` and any custom domain

### Custom Domain

1. In Vercel: Settings → Domains → Add your domain.
2. Update your DNS records as instructed by Vercel.
3. Add the custom domain to Firebase authorized domains.

---

## Design System

The site uses a custom Tailwind v4 design token system with no third-party component library. All tokens are used as raw hex values throughout the codebase.

### Colors

| Token | Hex | Usage |
|---|---|---|
| Primary dark | `#141413` | Header backgrounds, primary text |
| Warm white | `#faf9f5` | Page background |
| Claude orange | `#d97757` | Accent color, CTAs, active states |
| Orange hover | `#c86843` | CTA hover states |
| Blue | `#6a9bcc` | Info badges, links |
| Green | `#788c5d` | Success, "beginner" level badges |
| Muted | `#b0aea5` | Secondary text, placeholder text |
| Border | `#e8e6dc` | Card borders, dividers |
| Mid text | `#555555` | Body text |
| Caption | `#6b6860` | Captions, meta text |

### Typography

- **Headings:** Poppins via `font-poppins` (applied with `.heading` utility class)
- **Body/editorial:** Lora via `font-lora` (applied with `.body-editorial`)
- **UI/mono:** Geist Sans / Geist Mono (default)

### Component Patterns

- **Cards** — `bg-white rounded-2xl border border-[#e8e6dc]` with `hover:shadow-md hover:border-[#d97757]/30`
- **Section labels** — `w-1 h-5 bg-[#d97757] rounded-full` vertical bar before heading text
- **Dark bands** — `bg-[#141413]` with glow orbs (`bg-[#d97757]/10 rounded-full blur-3xl`)
- **Badges/chips** — `text-xs font-medium px-2.5 py-0.5 rounded-full`
- **Page hero** — Reusable `<PageHero>` component with eyebrow, heading, description, optional action row and stats bar

---

## Contributing

This project is maintained by the Claude Builder Club leadership at Penn State. Club members are welcome to submit issues and pull requests via the `Claude-PSU` GitHub organization.

For questions, join our [GroupMe](https://groupme.com/join_group/108706896/m6t7b7Vs) or follow us on [Instagram @claude.psu](https://www.instagram.com/claude.psu).
