# Room Booking API

![CI](https://github.com/Buczek05/room-booking-api/actions/workflows/ci.yml/badge.svg)

REST API do rezerwacji sal: Node.js 22, Express 5, Zod, Knex, PostgreSQL 16, JWT. Projekt z zajęć ZTPAI (zestawy 01–05).

## Uruchomienie od zera (Docker)

```bash
git clone https://github.com/Buczek05/room-booking-api.git
cd room-booking-api
cp .env.example .env          # ustaw DB_PASSWORD i JWT_SECRET (min. 32 znaki)
docker compose up --build
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/api/docs
- migracje uruchamiają się automatycznie przy starcie kontenera `api`

Konta demo (opcjonalnie, w drugim terminalu):

```bash
docker compose exec api npx knex seed:run
```

`admin@roombooking.local` / `admin-demo-password` (ADMIN), `jan.kowalski@example.com` / `jan-demo-password` (USER).
Hasła dotyczą wyłącznie lokalnych danych demo.

Zatrzymanie: `docker compose down` (dane zostają w volume `pgdata`), `docker compose down -v` (razem z danymi).

## Testy

```bash
docker compose up -d db       # baza dla testów integracyjnych (osobna baza *_test tworzy się sama)
npm ci
npm test                      # unit + integration
npm run test:unit             # bez bazy danych
npm run test:integration
```

## Uruchomienie bez Dockera (development)

```bash
docker compose up -d db
npm ci
npm run migrate
npm run seed
npm start
```

## Najważniejsze endpointy

| Metoda | Endpoint | Dostęp |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | publiczne |
| GET | `/api/auth/me` | zalogowany |
| GET | `/api/buildings`, `/api/buildings/:id`, `/api/buildings/:id/rooms`, `/api/rooms`, `/api/rooms/:id` | zalogowany |
| POST/PATCH/DELETE | `/api/buildings`, `/api/rooms` | ADMIN |
| GET/POST | `/api/reservations` (paginacja, filtry, sortowanie) | zalogowany – USER widzi swoje |
| GET, PATCH | `/api/reservations/:id`, `/api/reservations/:id/cancel` | właściciel albo ADMIN |
| GET | `/api/admin/audit-log?eventType=&page=&limit=` | ADMIN |

Pełna dokumentacja: Swagger UI.
