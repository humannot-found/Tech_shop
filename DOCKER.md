# Docker runbook

This project can run locally through Docker Compose with four main services:

- `postgres` — PostgreSQL database
- `backend` — FastAPI backend on port `8000`
- `admin_frontend` — React admin/POS frontend on port `5173`
- `website` — Vue public storefront on port `5174`

## 1. Prepare environment values

Copy the Docker template if you do not already have local values:

```bash
cp .env.docker.example .env
```

If you already have a `.env`, merge in only the Docker values you need. Do not commit `.env`.

For local Docker, the backend container must use the database host `postgres`, not `localhost`. The Compose file handles this automatically with:

```text
TECH_SHOP_DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/tech_shop_system
```

## 2. Start the system

```bash
docker compose up --build
```

Open:

- Backend health: <http://localhost:8000/health>
- Admin/POS frontend: <http://localhost:5173>
- Public website: <http://localhost:5174>

## 3. Seed demo data

In a second terminal:

```bash
docker compose run --rm seed_demo
```

Default seeded password:

```text
DemoPass123!
```

Useful demo users include:

```text
admin1
manager1
cashier1
inventory1
technician1
accountant1
```

## 4. Run only migrations

The backend service runs migrations on startup. You can also run them manually:

```bash
docker compose run --rm migrate
```

## 5. M-Pesa callbacks during local Docker testing

Docker does not replace ngrok. For M-Pesa STK callbacks, expose the backend:

```bash
ngrok http 8000
```

Then update `.env`:

```text
TECH_SHOP_MPESA_CALLBACK_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

Restart the backend container after changing this value:

```bash
docker compose up -d --force-recreate backend
```

## 6. Stop the system

```bash
docker compose down
```

To remove the local Docker database volume too:

```bash
docker compose down -v
```

Use `-v` carefully because it deletes the Docker PostgreSQL data.
