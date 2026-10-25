# Room Booking API – zadanie 04 (authentication, authorization, konfiguracja)

## Uruchomienie
```bash
cp .env.example .env          # ustaw JWT_SECRET (min. 32 znaki)
docker compose up -d          # PostgreSQL 16
npm install
npm run migrate
npm run seed                  # konta demo poniżej
npm start                     # http://localhost:3000, dokumentacja: http://localhost:3000/api/docs
```

Konta demo (tylko lokalna baza deweloperska): `admin@roombooking.local` / `admin-demo-password` (ADMIN),
`jan.kowalski@example.com` / `jan-demo-password`, `anna.nowak@example.com` / `anna-demo-password` (USER).

## Role
- USER – przegląda budynki i sale, tworzy rezerwacje, widzi i anuluje tylko własne.
- ADMIN – dodatkowo zarządza budynkami i salami, widzi i anuluje wszystkie rezerwacje.
