# K-Drama Journal

A colorful, journal-style web application inspired by K-Drama aesthetics, featuring the "Red String of Fate" visual motif. The application enables users to read beautifully formatted journal entries organized into chapters and sections, with reading progress tracking and analytics.

## Features

- 📖 **Beautiful Reading Experience**: Elegantly designed journal entries with K-Drama inspired aesthetics
- 🎨 **Custom Theming**: Unique color palette featuring sakura pink, lavender, and traditional Korean design elements
- 📊 **Progress Tracking**: Track your reading progress across chapters and sections
- 🔐 **Authentication System**: Secure login with role-based access (Admin, Reader)
- 🖼️ **Embedded Media**: Support for embedded images and Instagram content within journal pages
- 📱 **Responsive Design**: Works beautifully on desktop and mobile devices
- 👨‍💼 **Admin Tools**: Content management with inline editing capabilities for admin users

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Wouter** for lightweight routing
- **TanStack Query** for server state management
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for styling
- **Shadcn/ui** component library

### Backend
- **Node.js** with TypeScript
- **Express.js** for API server
- **PostgreSQL** database (Neon serverless)
- **Drizzle ORM** for type-safe database queries
- **Passport.js** for authentication

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 20 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** database (or access to a Neon database)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd kdrama-journal
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages for both the frontend and backend.

### 3. Set Up Environment Variables

Copy the provided `.env.example` to `.env` and fill in the values for your environment:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (required for all environments). |
| `SESSION_SECRET` | Long, random string used to sign session cookies. **Must be set in production** or the server will refuse to start. |
| `PORT` | Port the Express server listens on (defaults to `5000`). |
| `NODE_ENV` | Set to `production` when building/running the production bundle. |
| `SEED_ADMIN_USERNAME` | Username used when running the seed script to create the initial admin account. |
| `SEED_ADMIN_PASSWORD` | Strong password (min 12 chars, mixed case + numbers) used for the admin account during seeding. |
| `SEED_READER_USERNAME` | Username for the initial reader account created by the seed script. |
| `SEED_READER_PASSWORD` | Strong password (min 12 chars, mixed case + numbers) for the reader account during seeding. |
**For Replit Users:** the `DATABASE_URL` is automatically provisioned, but local `.env` setup is still recommended for clarity.
> ⚠️ Keep `.env`, `cookies.txt`, and other secret material out of version control. They are git-ignored by default—store secrets only in your deployment environment or a secrets manager.

### 4. Initialize the Database

Push the database schema to your PostgreSQL database:

```bash
npm run db:push
```

This command uses Drizzle Kit to create all necessary tables in your database.

### 5. Seed Sample Data

Populate the database with sample K-Drama journal entries. Define the `SEED_*` environment variables shown above before you run the script so the bootstrap accounts use unique, non-default credentials.

```bash
npx tsx server/seed.ts
```

This will:
- Create 2 user accounts (admin + reader) using the values you provided in `SEED_*`
- Add 5 chapters covering different seasons
- Seed 7 sections with various moods and themes
- Populate multiple pages with embedded images and soundtrack links
- Preload analytics + reading progress data so the dashboards have meaningful stats

### 6. Start the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5000` (or your Replit URL if using Replit).

## Seeded Accounts & Security

- The seeding script **never** ships with hard-coded credentials. Instead, it reads the usernames and passwords you provide in `SEED_*` variables and refuses to run unless the passwords are long and complex.
- Treat the seeded accounts as development helpers. For production, either skip the seeding step or rotate the seeded passwords immediately after provisioning.
- If the repo ever contained a `.env` or cookie jar in git history, rotate any secrets they may have held before deploying.
- Runtime user management enforces the same policy: minimum 12 characters with upper-, lower-case, numeric, and special characters, rejection of common/breached passwords, and a check to ensure the new password differs from the previous one.

## Project Structure

```
kdrama-journal/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # React components
│       │   ├── ui/       # Reusable UI components
│       │   └── ...       # Feature-specific components
│       ├── contexts/      # React context providers
│       ├── hooks/         # Custom React hooks
│       ├── lib/          # Utility functions and clients
│       ├── pages/        # Page components (routes)
│       └── App.tsx       # Main application component
├── server/                # Backend Express application
│   ├── db.ts            # Database connection
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── seed.ts          # Database seeding script
│   ├── storage.ts       # Data access layer
│   └── vite.ts          # Vite development middleware
├── shared/               # Shared code between client and server
│   └── schema.ts        # Database schema and types
├── package.json         # Dependencies and scripts
├── drizzle.config.ts   # Drizzle ORM configuration
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Available Scripts

### Development
- `npm run dev` - Start the development server with hot reload
- `npm run check` - Run TypeScript type checking

### Database
- `npm run db:push` - Push database schema changes to the database
- `npx tsx server/seed.ts` - Seed the database with sample data

### Production
- `npm run build` - Build the application for production
- `npm start` - Start the production server

## Production Deployment

1. **Configure environment** – set `NODE_ENV=production`, point `DATABASE_URL` at your production database, and generate a strong `SESSION_SECRET` (recommend at least 32 random bytes). The server enforces this requirement when `NODE_ENV` is `production`.
2. **Build assets** – run `npm run build` to compile the client (Vite) and bundle the server with esbuild. Start the server with `npm start`.
3. **Run behind HTTPS** – terminate TLS at your load balancer or reverse proxy so that the session cookie’s `secure` flag can keep it on encrypted channels only. If you’re behind a proxy (e.g., Nginx, Heroku), the server already enables `app.set("trust proxy", 1)` so cookies and rate limiters use the correct client IP.
4. **Tune rate limits** – the defaults in `server/security.ts` are intentionally conservative (600 requests/minute overall, 20 login attempts per 15 minutes). Monitor real traffic and adjust these numbers as needed for your audience.
5. **Monitor CSRF tokens** – authenticated clients receive a CSRF token from `/api/auth/login` and `/api/auth/validate`. If you need to refresh one mid-session (for example after a tab wakes from sleep), call `GET /api/auth/csrf` to retrieve a fresh token and store it client-side.

## Database Schema

The application uses five main tables:

### Users
- Stores user accounts with role-based access control
- Roles: `admin`, `reader`, `guest`

### Chapters
- Top-level content organization
- Each chapter has a title, description, and order

### Sections
- Sub-divisions within chapters
- Contains mood, tags, thumbnail, and order

### Pages
- Individual content pages within sections
- Supports embedded content via `[embed:URL]` syntax

### Reading Progress
- Tracks user reading behavior
- Records completion status and last read timestamp

## Embedded Content

The application supports embedded content in journal pages using the following syntax:

### Images
```
[embed:https://example.com/image.jpg]
```

### Instagram Reels/Posts
```
[embed:https://www.instagram.com/p/POST_ID]
```

The content renderer will automatically detect and display these embeds appropriately.

## Customization

### Changing Colors
The color theme is defined in `tailwind.config.ts`. You can customize the K-Drama color palette:

```typescript
colors: {
  kdrama: {
    thread: "#DC143C",
    sakura: "#FFB7C5",
    lavender: "#E6E6FA",
    // ... more colors
  }
}
```

### Adding New Fonts
Fonts are loaded from Google Fonts in `client/index.html`. The application uses:
- **Nanum Myeongjo** for headings
- **Noto Sans KR** for body text

## Troubleshooting

### Database Connection Issues
- Ensure your `DATABASE_URL` is correctly set in the environment variables
- Check that your PostgreSQL database is running and accessible
- Run `npm run db:push` to ensure the schema is up to date

### Port Already in Use
The dev server will always respect an explicit `PORT` environment variable (required on hosts like Replit).  
When `PORT` is **not** set, it now starts at `5000` and automatically searches for the next open port (up to 10 tries), so you rarely have to do anything manually.

To force a specific port, set it in your `.env` file or inline when running the command:

```bash
PORT=5050 npm run dev   # macOS/Linux
```

```powershell
$env:PORT=5050; npm run dev   # Windows PowerShell
```

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear the build cache: `rm -rf dist`

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Inspired by K-Drama aesthetics and the Red String of Fate legend
- Built with love using modern web technologies
- Korean typography powered by Google Fonts

---

**Enjoy your K-Drama Journal experience! 🎭❤️**
