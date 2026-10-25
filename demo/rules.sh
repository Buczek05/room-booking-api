#!/usr/bin/env bash
# Reguły czasu i pojemności (zadanie 4). Sala 3: capacity 50, sala 1: capacity 30.
B=http://localhost:3000/api/reservations
try() { # opis, roomId, start, end, participants
  local body="{\"roomId\":$2,\"reservedBy\":\"Jan Kowalski\",\"participants\":$5,\"startTime\":\"$3\",\"endTime\":\"$4\"}"
  local out; out=$(curl -s -w $'\n%{http_code}' -X POST -H "Content-Type: application/json" -d "$body" $B)
  local code=${out##*$'\n'} res=${out%$'\n'*}
  printf '%s -> %s %s\n' "$1" "$code" "$(echo "$res" | jq -r 'if .error then "\(.error.code): \(if .error.details then .error.details[0].message else .error.message end)" else "id=\(.id)" end')"
}
D=2026-11-12
try "endTime przed startTime"   3 ${D}T12:00:00Z ${D}T10:00:00Z 10
try "10 minut"                  3 ${D}T10:00:00Z ${D}T10:10:00Z 10
try "15 minut"                  3 ${D}T10:00:00Z ${D}T10:15:00Z 10
try "9 godzin"                  3 ${D}T08:00:00Z ${D}T17:00:00Z 10
try "start w przeszłości"       3 2026-10-01T10:00:00Z 2026-10-01T11:00:00Z 10
try "40 osób, sala 1 (cap 30)"  1 ${D}T10:00:00Z ${D}T11:00:00Z 40
try "30 osób, sala 1 (cap 30)"  1 ${D}T10:00:00Z ${D}T11:00:00Z 30
