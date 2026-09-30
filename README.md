# Generator Fuel Tracker

A production-ready web app to register generators and record fuel refills, with
automatic **full-to-full** fuel-consumption calculation, a dashboard, reports
and CSV import/export.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma · PostgreSQL (Render)
- **Currency:** Nigerian Naira (₦)
- **Language:** English (UI and data)
- **Auth:** email + password (bcrypt) with JWT sessions and `ADMIN` / `OPERATOR` roles

---

## Features

- **Generators:** number/code, location, photo, notes (full CRUD)
- **Fuel logs:** date, time, hour reading, liters, price per liter, fuel type
  (Petrol/Diesel/Kerosene), tank-full flag (full CRUD)
- **Consumption logic (full-to-full):** consumption per hour is only computed
  between two full-tank records. Non-full refills are never counted alone; their
  liters are added to the next full record's total.
- **Dashboard:** KPIs, monthly fuel chart, average consumption chart, per-generator
  summary, recent logs
- **Reports:** filters by generator / fuel type / date range + CSV export + print
- **CSV import:** validate & preview, per-row error report, then bulk import
- **CSV export:** any filtered list/report
- **Users:** admin-only user management

### How consumption is calculated

Logs are ordered by hour reading. For each **full-tank** log:

```
hoursWorked        = current.hourReading - previousFull.hourReading
totalFuel          = current.liters + sum(liters of non-full logs in between)
consumptionPerHour = totalFuel / hoursWorked      (only if hoursWorked > 0)
```

- A **non-full** log never has a consumption value of its own.
- The **first** full log is the series start and is not calculated.
- Example: full @1000h → non-full 20 L @1050h → full 30 L @1100h ⇒
  `hoursWorked = 100`, `totalFuel = 50`, `consumptionPerHour = 0.5 L/h`.

---

## Local setup

### 1. Requirements
- Node.js 20+ (22 recommended)
- A PostgreSQL database (this project uses Render)

### 2. Install
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and set the values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="a-long-random-secret-string"
UPLOAD_DIR="./public/uploads"
```

### 4. Apply the database schema
```bash
npm run prisma:generate
npm run prisma:migrate      # prisma migrate deploy
```

### 5. Create the first admin user
```bash
npm run seed
```
Default credentials (change after first login):

- **Email:** `admin@example.com`
- **Password:** `admin123`

You can override with `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

### 6. Run
```bash
npm run dev          # http://localhost:3000
```

### Useful commands
```bash
npm run build        # generate + migrate + production build
npm start            # run the production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (consumption logic)
npm run prisma:push  # push schema without migrations (dev only)
```

---

## Deploy on Render

`render.yaml` describes a Web Service + PostgreSQL + a persistent Disk for images.

### Option A — use the blueprint
1. Push this project to GitHub.
2. In Render: **New → Blueprint**, select the repo.
3. Set `DATABASE_URL` to your Render PostgreSQL **External** connection string.
4. Deploy. The build runs `npm run build` (includes `prisma migrate deploy`).

### Option B — manual
1. **Create the PostgreSQL** database, copy the **External** connection string.
2. **Create a Web Service** (Node):
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/login`
   - Environment variables:
     - `DATABASE_URL` = your external connection string
     - `JWT_SECRET` = a long random secret
     - `UPLOAD_DIR` = `/var/data/uploads`
     - `NODE_VERSION` = `22`
3. **Add a Disk** mounted at `/var/data` (so uploaded images survive redeploys).
4. **Create the admin user** once (Render Shell):
   ```bash
   npm run seed
   ```

### Notes
- After a redeploy, run `npm run seed` again only if you deleted the admin user
  (the seed is idempotent and skips existing users).
- Rotate the database password if it has been shared in plain text.