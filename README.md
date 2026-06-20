# GDM Send

Secure file transfer platform for Gaviso agency. Clients send files up to 5 GB without creating an account.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **File Storage**: Backblaze B2 (S3-compatible)
- **Deployment**: Kinsta Cloud (Node.js)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/gaviso/gdm-send-web.git
cd gdm-send-web
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Create an admin user in Authentication > Users

### 3. Set up Backblaze B2

1. Create a B2 bucket named `gdm-send` (private)
2. Create an application key scoped to that bucket

### 4. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your Supabase and B2 credentials.

### 5. Run Development Server

```bash
npm run dev
```

- Public upload: http://localhost:3000
- Admin panel: http://localhost:3000/admin

## Deployment (Kinsta)

```bash
npm run build
npm start
```

`output: "standalone"` is configured in `next.config.ts` for Kinsta deployment.

## License

Private - Gaviso Agency
