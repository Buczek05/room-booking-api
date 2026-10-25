#!/usr/bin/env bash
# Przypadki z tabeli (zadanie 4). Istniejąca rezerwacja: sala 1, 2026-11-10 10:00-12:00 UTC.
B=http://localhost:3000/api/reservations
try() { # opis, roomId, start, end
  local body="{\"roomId\":$2,\"reservedBy\":\"Jan Kowalski\",\"participants\":10,\"startTime\":\"$3\",\"endTime\":\"$4\"}"
  local out; out=$(curl -s -w $'\n%{http_code}' -X POST -H "Content-Type: application/json" -d "$body" $B)
  local code=${out##*$'\n'} res=${out%$'\n'*}
  printf '%s -> %s %s\n' "$1" "$code" "$(echo "$res" | jq -r '.error.code // "id=\(.id)"')"
}
D=2026-11-10
try "12:00-13:00 sala 1"            1 ${D}T12:00:00Z ${D}T13:00:00Z
try "08:00-10:00 sala 1"            1 ${D}T08:00:00Z ${D}T10:00:00Z
try "11:00-13:00 sala 1"            1 ${D}T11:00:00Z ${D}T13:00:00Z
try "09:00-13:00 sala 1"            1 ${D}T09:00:00Z ${D}T13:00:00Z
try "10:30-11:00 sala 1"            1 ${D}T10:30:00Z ${D}T11:00:00Z
try "10:00-12:00 sala 2"            2 ${D}T10:00:00Z ${D}T12:00:00Z
try "11:00+01:00-13:00+01:00 sala 1" 1 ${D}T11:00:00+01:00 ${D}T13:00:00+01:00
