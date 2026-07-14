# Database Migrations

## Setup

Before running migrations, make sure you have a PostgreSQL database and have configured your `DATABASE_URL` environment variable.

### 1. Configure your environment

Copy the root `.env.example` to `.env` (at the workspace root or `server/.env`) and set:

```
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=public"
```

For a hosted Neon database the URL looks like:

```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 2. Run the migration

From the `server/` directory:

```bash
npm run prisma:migrate
```

This applies all pending migrations and creates the database schema.

### 3. Seed the database

After migration, seed the initial data (Plans):

```bash
npm run prisma:seed
```

This creates the `free` and `pro` Plan records required by the platform.

## Notes

- `npm run prisma:generate` — regenerates the Prisma Client after schema changes
- `npm run prisma:studio` — opens Prisma Studio to browse your database
- Never commit `.env` files containing real credentials
