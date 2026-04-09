# Nutri — Self-Hosted Calorie & Fitness Tracker

A modern, mobile-first calorie tracking web app with meal logging, barcode scanning, weight tracking, and workout tracking. Built for self-hosting with Docker.

![Dark Theme](https://img.shields.io/badge/theme-dark-0f1119) ![Light Theme](https://img.shields.io/badge/theme-light-f5f7fa) ![PWA](https://img.shields.io/badge/PWA-ready-10b981)

## Features

- **Meal Tracking** — Log meals by searching foods, scanning barcodes, or creating custom entries
- **Food Search** — Queries Open Food Facts + USDA FoodData Central APIs; caches results locally
- **Barcode Scanning** — Scan product barcodes using your device camera (via html5-qrcode)
- **Calorie Goals** — Configurable daily calorie, protein, carb, and fat targets
- **Weight Tracking** — Log daily weight with trend chart
- **Workout Tracking** — Log workouts with presets; calories burned offset daily intake
- **Multi-User** — Local auth with JWT; optional OpenID Connect
- **Dark/Light Theme** — Toggle between themes; dark by default
- **PWA** — Installable on mobile devices with manifest.json
- **Responsive** — Mobile-first design (480px max content width)

## Tech Stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Backend  | Python FastAPI, aiosqlite (SQLite), Uvicorn  |
| Frontend | React 18, Vite, Recharts, lucide-react       |
| Scanner  | html5-qrcode                                 |
| Deploy   | Docker Compose (nginx + uvicorn)             |

## Quick Start

```bash
# 1. Clone
git clone <repo-url> && cd nutri

# 2. Configure
cp .env.example .env
# Edit .env — at minimum change JWT_SECRET

# 3. Launch
docker compose up -d --build

# 4. Open
# Frontend: http://localhost:3000
# API:      http://localhost:8000/docs
```

## Configuration (.env)

| Variable           | Default                          | Description                          |
|--------------------|----------------------------------|--------------------------------------|
| `JWT_SECRET`       | (change me)                      | Secret key for JWT tokens            |
| `USDA_API_KEY`     | `DEMO_KEY`                       | USDA FoodData Central API key        |
| `OIDC_ENABLED`     | `false`                          | Enable OpenID Connect auth           |
| `OIDC_DISCOVERY_URL` | —                              | OIDC provider discovery URL          |
| `OIDC_CLIENT_ID`   | —                                | OIDC client ID                       |
| `OIDC_CLIENT_SECRET` | —                              | OIDC client secret                   |
| `BACKEND_PORT`     | `8000`                           | Host port for API                    |
| `FRONTEND_PORT`    | `3000`                           | Host port for web UI                 |
| `VITE_API_URL`     | `http://localhost:8000`          | API URL as seen by the browser       |
| `CORS_ORIGINS`     | `http://localhost:5173,...`       | Allowed CORS origins                 |

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the backend at `localhost:8000`.

## Food Data Sources

1. **Open Food Facts** — Free, open product database with barcode lookup
2. **USDA FoodData Central** — US government food composition database (get a free API key at https://fdc.nal.usda.gov/api-key-signup.html)
3. **Custom Foods** — User-created food entries stored in SQLite

All external API results are cached in the local SQLite database to minimize repeat queries.

## Architecture

```
nutri/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app + CORS + lifespan
│       ├── config.py           # Pydantic settings
│       ├── database.py         # SQLite schema + connection
│       ├── auth.py             # JWT + password hashing
│       ├── schemas.py          # Pydantic models
│       ├── routers/
│       │   ├── auth.py         # Register/login/OIDC
│       │   ├── foods.py        # Search + barcode + custom foods
│       │   ├── meals.py        # Meal logging + daily summary
│       │   ├── weight.py       # Weight tracking
│       │   └── workouts.py     # Workout tracking
│       └── services/
│           └── food_search.py  # OFF + USDA API clients
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── vite.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── manifest.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── context/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── hooks/
        │   └── useDate.js
        ├── components/
        │   ├── BottomNav.jsx
        │   ├── MacroDisplay.jsx
        │   ├── DateNav.jsx
        │   ├── Modal.jsx
        │   └── BarcodeScanner.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── Dashboard.jsx
        │   ├── AddFoodPage.jsx
        │   ├── WeightPage.jsx
        │   ├── WorkoutsPage.jsx
        │   └── SettingsPage.jsx
        └── styles/
            └── global.css
```

## License

MIT
