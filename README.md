# Room Booking API – zadanie 03 (PostgreSQL, relacje, współbieżność)

## Uruchomienie
```bash
cp .env.example .env
docker compose up -d          # PostgreSQL 16 z nazwanym volume
npm install
npm run migrate               # knex migrate:latest
npm run seed                  # 3 budynki, 5 sal, 5 rezerwacji
npm start                     # http://localhost:3000
```
Logi zapytań SQL: `DEBUG=knex:query npm start`. Test double bookingu: `node scripts/double-booking.js`.

## Endpointy
- `GET/POST /api/buildings`, `GET /api/buildings/:id`, `GET /api/buildings/:id/rooms`
- `GET/POST /api/rooms`, `GET /api/rooms/:id`
- `GET /api/reservations?roomId&buildingId&status&from&to&page&limit&sort`, `GET /api/reservations/:id`, `POST /api/reservations`, `PATCH /api/reservations/:id/cancel`
