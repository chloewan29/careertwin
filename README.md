# CareerTwin

AI-powered career companion — upload your resume, extract structured career data, match against job descriptions, and get actionable gap analysis.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (database + storage)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Configure Environment

Copy the placeholder env file and add your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Canonical Verification Loop

Run the founder-safe verification entrypoint:

```bash
npm run verify
```

This command runs compile + machine-verifiable checks and writes artifacts to `artifacts/`, including `artifacts/verify-summary.json`.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/upload` | Resume upload (PDF/DOCX) |
| `/dashboard` | Career profile dashboard |
| `/match` | Job description match & gap analysis |

## Project Structure

```
careertwin/
├── app/
│   ├── layout.tsx          # Root layout + navbar
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Design system
│   ├── upload/page.tsx     # Resume upload
│   ├── dashboard/page.tsx  # Career dashboard
│   └── match/page.tsx      # Job matching
├── components/
│   ├── ui/                 # Button, Card, Navbar
│   └── landing/            # Hero, Features, Footer
├── lib/
│   ├── supabase/           # Supabase clients
│   └── types.ts            # TypeScript interfaces
└── public/                 # Static assets
```

## License

MIT
