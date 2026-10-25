#!/usr/bin/env bash
# Test wymagań zestawu 02. Uruchom świeży serwer (npm start), potem: bash test.sh
B=http://localhost:3000
J="Content-Type: application/json"
pass=0; fail=0

check() { # opis, oczekiwany kod, [oczekiwany error.code lub -], curl args...
  local desc="$1" exp="$2" expcode="$3"; shift 3
  local out code body ecode
  out=$(curl -s -w $'\n%{http_code}' "$@")
  code=${out##*$'\n'}; body=${out%$'\n'*}
  ecode=$(echo "$body" | jq -r '.error.code? // "-"' 2>/dev/null)
  if [ "$code" = "$exp" ] && { [ "$expcode" = "-" ] || [ "$ecode" = "$expcode" ]; }; then
    pass=$((pass+1)); s="OK  "; else fail=$((fail+1)); s="FAIL"; fi
  printf '%s [%s %s] %s\n' "$s" "$code" "$( [ "$ecode" != "-" ] && echo "$ecode")" "$desc"
  LAST="$body"
}
res() { # roomId, start, end, [participants]
  echo "{\"roomId\":$1,\"reservedBy\":\"Jan Kowalski\",\"participants\":${4:-20},\"startTime\":\"$2\",\"endTime\":\"$3\"}"
}
D=2026-11-10

echo "== Zadanie 1/2: rooms, walidacja"
check "GET /api/rooms"                       200 - $B/api/rooms
check "GET /api/rooms/1"                     200 - $B/api/rooms/1
check "GET /api/rooms/999"                   404 NOT_FOUND $B/api/rooms/999
check "GET /api/rooms/abc -> 400"            400 VALIDATION_ERROR $B/api/rooms/abc
check "GET /api/rooms/-1 -> 400"             400 VALIDATION_ERROR $B/api/rooms/-1
check "GET ?roomId=abc -> 400"               400 VALIDATION_ERROR "$B/api/reservations?roomId=abc"
check "POST 3+ błędy + nieznane pole"        400 VALIDATION_ERROR -X POST -H "$J" -d '{"roomId":"1","reservedBy":"Jo","participants":0,"startTime":"jutro","status":"CONFIRMED"}' $B/api/reservations
echo "     details: $(echo "$LAST" | jq -c '[.error.details[].field]')"
check "POST status/id w body -> 400"         400 VALIDATION_ERROR -X POST -H "$J" -d "$(res 1 ${D}T10:00:00Z ${D}T12:00:00Z | sed 's/}$/,"id":5}/')" $B/api/reservations
check "POST data bez strefy -> 400"          400 VALIDATION_ERROR -X POST -H "$J" -d "$(res 1 ${D}T10:00:00 ${D}T12:00:00)" $B/api/reservations
check "POST reservedBy '  ab  ' -> 400"      400 VALIDATION_ERROR -X POST -H "$J" -d '{"roomId":1,"reservedBy":"  ab  ","participants":5,"startTime":"2026-11-10T10:00:00Z","endTime":"2026-11-10T12:00:00Z"}' $B/api/reservations

echo "== Zadanie 3: error handling"
check "GET /api/nope -> 404 JSON"            404 NOT_FOUND $B/api/nope
check "zepsuty JSON -> INVALID_JSON"         400 INVALID_JSON -X POST -H "$J" -d '{"roomId": 1,' $B/api/reservations
check "GET /api/debug/crash -> 500"          500 INTERNAL_ERROR $B/api/debug/crash
echo "     stack w odpowiedzi? $(echo "$LAST" | grep -c stack) (ma być 0)"
rid=$(curl -s -D - -o /dev/null -H "X-Request-Id: test-123" $B/api/rooms | grep -i '^x-request-id' | tr -d '\r' | cut -d' ' -f2)
[ "$rid" = "test-123" ] && { pass=$((pass+1)); echo "OK   X-Request-Id przejęty z nagłówka"; } || { fail=$((fail+1)); echo "FAIL X-Request-Id: $rid"; }

echo "== Zadanie 4: nakładanie (istniejąca 10:00-12:00 w sali 1)"
check "bazowa 10:00-12:00"                   201 - -X POST -H "$J" -d "$(res 1 ${D}T10:00:00.000Z ${D}T12:00:00.000Z)" $B/api/reservations
check "12:00-13:00 OK"                       201 - -X POST -H "$J" -d "$(res 1 ${D}T12:00:00Z ${D}T13:00:00Z)" $B/api/reservations
check "08:00-10:00 OK"                       201 - -X POST -H "$J" -d "$(res 1 ${D}T08:00:00Z ${D}T10:00:00Z)" $B/api/reservations
check "11:00-13:00 409"                      409 ROOM_ALREADY_BOOKED -X POST -H "$J" -d "$(res 1 ${D}T11:00:00Z ${D}T13:00:00Z)" $B/api/reservations
check "09:00-13:00 409"                      409 ROOM_ALREADY_BOOKED -X POST -H "$J" -d "$(res 1 ${D}T09:00:00Z ${D}T13:00:00Z)" $B/api/reservations
check "10:30-11:00 409"                      409 ROOM_ALREADY_BOOKED -X POST -H "$J" -d "$(res 1 ${D}T10:30:00Z ${D}T11:00:00Z)" $B/api/reservations
check "10:00-12:00 inna sala OK"             201 - -X POST -H "$J" -d "$(res 2 ${D}T10:00:00Z ${D}T12:00:00Z 10)" $B/api/reservations
check "11:00+01:00 = 10:00Z -> 409"          409 ROOM_ALREADY_BOOKED -X POST -H "$J" -d "$(res 1 ${D}T11:00:00+01:00 ${D}T12:00:00+01:00)" $B/api/reservations
check "PATCH /1... anuluj 10:00-12:00 (id 2)" 200 - -X PATCH $B/api/reservations/2/cancel
check "10:00-12:00 po anulowaniu OK"         201 - -X POST -H "$J" -d "$(res 1 ${D}T10:00:00Z ${D}T12:00:00Z)" $B/api/reservations
check "endTime <= startTime -> 400"          400 VALIDATION_ERROR -X POST -H "$J" -d "$(res 3 ${D}T12:00:00Z ${D}T10:00:00Z)" $B/api/reservations
check "10 min -> 400"                        400 VALIDATION_ERROR -X POST -H "$J" -d "$(res 3 ${D}T10:00:00Z ${D}T10:10:00Z)" $B/api/reservations
check "15 min -> 201"                        201 - -X POST -H "$J" -d "$(res 3 ${D}T15:00:00Z ${D}T15:15:00Z)" $B/api/reservations
check "9 h -> 400"                           400 VALIDATION_ERROR -X POST -H "$J" -d "$(res 3 ${D}T08:00:00Z ${D}T17:00:00Z)" $B/api/reservations
check "przeszłość -> 400"                    400 VALIDATION_ERROR -X POST -H "$J" -d "$(res 3 2025-01-10T10:00:00Z 2025-01-10T11:00:00Z)" $B/api/reservations
check "pojemność 40 > 30 -> 409"             409 ROOM_CAPACITY_EXCEEDED -X POST -H "$J" -d "$(res 1 2026-11-11T10:00:00Z 2026-11-11T11:00:00Z 40)" $B/api/reservations
check "pojemność 30 = 30 -> 201"             201 - -X POST -H "$J" -d "$(res 1 2026-11-11T10:00:00Z 2026-11-11T11:00:00Z 30)" $B/api/reservations
check "sala 999 -> 404"                      404 NOT_FOUND -X POST -H "$J" -d "$(res 999 2026-11-11T10:00:00Z 2026-11-11T11:00:00Z)" $B/api/reservations

echo "== Zadanie 5: anulowanie + DTO"
check "anuluj przyszłą (id 3)"               200 - -X PATCH $B/api/reservations/3/cancel
c1=$(echo "$LAST" | jq -r .cancelledAt); sleep 1
check "anuluj ponownie (id 3)"               200 - -X PATCH $B/api/reservations/3/cancel
c2=$(echo "$LAST" | jq -r .cancelledAt)
[ "$c1" = "$c2" ] && [ "$c1" != "null" ] && { pass=$((pass+1)); echo "OK   cancelledAt bez zmian ($c1)"; } || { fail=$((fail+1)); echo "FAIL cancelledAt $c1 vs $c2"; }
check "anuluj rozpoczętą (seed id 1)"        409 RESERVATION_ALREADY_STARTED -X PATCH $B/api/reservations/1/cancel
check "anuluj 999"                           404 NOT_FOUND -X PATCH $B/api/reservations/999/cancel
check "anuluj abc -> 400"                    400 VALIDATION_ERROR -X PATCH $B/api/reservations/abc/cancel
loc=$(curl -s -D - -o /dev/null -X POST -H "$J" -d "$(res 4 2026-11-12T10:00:00Z 2026-11-12T11:00:00Z 5)" $B/api/reservations | grep -i '^location' | tr -d '\r')
[[ "$loc" =~ /api/reservations/[0-9]+$ ]] && { pass=$((pass+1)); echo "OK   201 + $loc"; } || { fail=$((fail+1)); echo "FAIL Location: $loc"; }
all=$(curl -s $B/api/reservations)
[ "$(echo "$all" | grep -c internalNote)" = 0 ] && { pass=$((pass+1)); echo "OK   brak internalNote w odpowiedziach"; } || { fail=$((fail+1)); echo "FAIL internalNote wycieka"; }
[ "$(echo "$all" | jq '[.[] | .startTime, .endTime, .createdAt | test("Z$")] | all')" = true ] && { pass=$((pass+1)); echo "OK   daty w UTC (…Z)"; } || { fail=$((fail+1)); echo "FAIL daty"; }
check "GET ?roomId=1"                        200 - "$B/api/reservations?roomId=1"
check "GET ?roomId=4 (1 wynik)"              200 - "$B/api/reservations?roomId=4"

echo; echo "Wynik: $pass OK, $fail FAIL"
