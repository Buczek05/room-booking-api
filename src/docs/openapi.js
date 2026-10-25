// Dokumentacja OpenAPI 3.0 dla Swagger UI (/api/docs)
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ content: { "application/json": { schema } } });
const err = (description) => ({ description, ...json(ref("Error")) });
const ok = (description, schema) => ({ description, ...(schema ? json(schema) : {}) });
const idParam = (name = "id") => ({ name, in: "path", required: true, schema: { type: "integer", minimum: 1 } });
const secured = [{ bearerAuth: [] }];

const E400 = err("Błąd walidacji (VALIDATION_ERROR) albo niepoprawny JSON (INVALID_JSON)");
const E401 = err("Brak tokenu, zły format nagłówka, zły podpis albo token wygasły (UNAUTHORIZED)");
const E403 = err("Brak uprawnień – wymagana rola ADMIN (FORBIDDEN)");

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Room Booking API",
    version: "4.0.0",
    description: "Rezerwacje sal. Zaloguj się przez POST /api/auth/login, skopiuj accessToken i kliknij Authorize.",
  },
  tags: [{ name: "Auth" }, { name: "Buildings" }, { name: "Rooms" }, { name: "Reservations" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Validation failed" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    location: { type: "string", enum: ["params", "query", "body"] },
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
              requestId: { type: "string", format: "uuid" },
            },
          },
        },
      },
      RegisterRequest: {
        type: "object", required: ["email", "password"], additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", example: "jan.kowalski@example.com" },
          password: { type: "string", minLength: 10, maxLength: 72, example: "bardzo-dlugie-haslo" },
        },
      },
      LoginRequest: {
        type: "object", required: ["email", "password"], additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", example: "admin@roombooking.local" },
          password: { type: "string", example: "admin-demo-password" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { type: "string", example: "15m" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" }, email: { type: "string" },
          role: { type: "string", enum: ["USER", "ADMIN"] }, createdAt: { type: "string", format: "date-time" },
        },
      },
      BuildingRef: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" } } },
      Building: {
        type: "object",
        properties: {
          id: { type: "integer" }, name: { type: "string" }, address: { type: "string" }, roomsCount: { type: "integer" },
        },
      },
      BuildingInput: {
        type: "object", required: ["name", "address"], additionalProperties: false,
        properties: { name: { type: "string", maxLength: 100 }, address: { type: "string", maxLength: 200 } },
      },
      BuildingUpdate: {
        type: "object", minProperties: 1, additionalProperties: false,
        properties: { name: { type: "string", maxLength: 100 }, address: { type: "string", maxLength: 200 } },
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "integer" }, name: { type: "string" }, capacity: { type: "integer" }, building: ref("BuildingRef"),
        },
      },
      RoomInput: {
        type: "object", required: ["buildingId", "name", "capacity"], additionalProperties: false,
        properties: { buildingId: { type: "integer" }, name: { type: "string", maxLength: 50 }, capacity: { type: "integer", minimum: 1 } },
      },
      RoomUpdate: {
        type: "object", minProperties: 1, additionalProperties: false,
        properties: { name: { type: "string", maxLength: 50 }, capacity: { type: "integer", minimum: 1 } },
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "integer" },
          room: {
            type: "object",
            properties: { id: { type: "integer" }, name: { type: "string" }, building: ref("BuildingRef") },
          },
          user: { type: "object", properties: { id: { type: "integer" }, email: { type: "string" } } },
          participants: { type: "integer" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          createdAt: { type: "string", format: "date-time" },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ReservationInput: {
        type: "object", required: ["roomId", "participants", "startTime", "endTime"], additionalProperties: false,
        description: "Użytkownik pochodzi z tokenu – pola userId / reservedBy są odrzucane (400).",
        properties: {
          roomId: { type: "integer", example: 1 },
          participants: { type: "integer", minimum: 1, example: 10 },
          startTime: { type: "string", format: "date-time", example: "2026-12-01T10:00:00Z" },
          endTime: { type: "string", format: "date-time", example: "2026-12-01T11:00:00Z" },
        },
      },
      ReservationPage: {
        type: "object",
        properties: {
          data: { type: "array", items: ref("Reservation") },
          meta: {
            type: "object",
            properties: { page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, totalPages: { type: "integer" } },
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"], summary: "Rejestracja (zawsze rola USER)",
        requestBody: { required: true, ...json(ref("RegisterRequest")) },
        responses: {
          201: ok("Utworzony użytkownik (bez hasha)", ref("User")),
          400: err("Błędny email, hasło spoza 10–72 znaków albo nieznane pole (np. role)"),
          409: err("Email zajęty (EMAIL_TAKEN)"),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"], summary: "Logowanie – zwraca JWT",
        requestBody: { required: true, ...json(ref("LoginRequest")) },
        responses: {
          200: ok("Token dostępu", ref("LoginResponse")),
          400: E400,
          401: err("Zły email lub hasło – ta sama odpowiedź w obu przypadkach"),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"], summary: "Zalogowany użytkownik", security: secured,
        responses: { 200: ok("Dane użytkownika", ref("User")), 401: E401 },
      },
    },
    "/api/buildings": {
      get: {
        tags: ["Buildings"], summary: "Lista budynków z liczbą sal", security: secured,
        responses: { 200: ok("Budynki", { type: "array", items: ref("Building") }), 401: E401 },
      },
      post: {
        tags: ["Buildings"], summary: "Dodanie budynku (ADMIN)", security: secured,
        requestBody: { required: true, ...json(ref("BuildingInput")) },
        responses: {
          201: ok("Utworzony budynek", ref("Building")), 400: E400, 401: E401, 403: E403,
          409: err("Nazwa budynku zajęta (BUILDING_NAME_TAKEN)"),
        },
      },
    },
    "/api/buildings/{id}": {
      parameters: [idParam()],
      get: {
        tags: ["Buildings"], summary: "Budynek", security: secured,
        responses: { 200: ok("Budynek", ref("Building")), 400: E400, 401: E401, 404: err("Budynek nie istnieje") },
      },
      patch: {
        tags: ["Buildings"], summary: "Edycja budynku (ADMIN)", security: secured,
        requestBody: { required: true, ...json(ref("BuildingUpdate")) },
        responses: {
          200: ok("Zmieniony budynek", ref("Building")), 400: E400, 401: E401, 403: E403,
          404: err("Budynek nie istnieje"), 409: err("Nazwa budynku zajęta (BUILDING_NAME_TAKEN)"),
        },
      },
      delete: {
        tags: ["Buildings"], summary: "Usunięcie budynku (ADMIN)", security: secured,
        responses: {
          204: ok("Usunięto"), 400: E400, 401: E401, 403: E403, 404: err("Budynek nie istnieje"),
          409: err("Budynek ma sale (BUILDING_HAS_ROOMS)"),
        },
      },
    },
    "/api/buildings/{id}/rooms": {
      parameters: [idParam()],
      get: {
        tags: ["Buildings"], summary: "Sale w budynku", security: secured,
        responses: {
          200: ok("Sale (pusta tablica, gdy budynek nie ma sal)", { type: "array", items: ref("Room") }),
          400: E400, 401: E401, 404: err("Budynek nie istnieje"),
        },
      },
    },
    "/api/rooms": {
      get: {
        tags: ["Rooms"], summary: "Lista sal", security: secured,
        responses: { 200: ok("Sale", { type: "array", items: ref("Room") }), 401: E401 },
      },
      post: {
        tags: ["Rooms"], summary: "Dodanie sali (ADMIN)", security: secured,
        requestBody: { required: true, ...json(ref("RoomInput")) },
        responses: {
          201: ok("Utworzona sala", ref("Room")), 400: E400, 401: E401, 403: E403,
          404: err("Budynek nie istnieje"), 409: err("Nazwa sali zajęta w budynku (ROOM_NAME_TAKEN)"),
        },
      },
    },
    "/api/rooms/{id}": {
      parameters: [idParam()],
      get: {
        tags: ["Rooms"], summary: "Sala z budynkiem", security: secured,
        responses: { 200: ok("Sala", ref("Room")), 400: E400, 401: E401, 404: err("Sala nie istnieje") },
      },
      patch: {
        tags: ["Rooms"], summary: "Edycja sali (ADMIN)", security: secured,
        requestBody: { required: true, ...json(ref("RoomUpdate")) },
        responses: {
          200: ok("Zmieniona sala", ref("Room")), 400: E400, 401: E401, 403: E403,
          404: err("Sala nie istnieje"), 409: err("Nazwa sali zajęta w budynku (ROOM_NAME_TAKEN)"),
        },
      },
      delete: {
        tags: ["Rooms"], summary: "Usunięcie sali (ADMIN)", security: secured,
        responses: {
          204: ok("Usunięto"), 400: E400, 401: E401, 403: E403, 404: err("Sala nie istnieje"),
          409: err("Sala ma rezerwacje (ROOM_HAS_RESERVATIONS)"),
        },
      },
    },
    "/api/reservations": {
      get: {
        tags: ["Reservations"], summary: "Lista rezerwacji (USER – tylko własne)", security: secured,
        parameters: [
          { name: "roomId", in: "query", schema: { type: "integer" } },
          { name: "buildingId", in: "query", schema: { type: "integer" } },
          { name: "userId", in: "query", schema: { type: "integer" }, description: "Tylko ADMIN; dla USER → 403" },
          { name: "status", in: "query", schema: { type: "string", enum: ["CONFIRMED", "CANCELLED"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" }, description: "Rezerwacje nakładające się na [from, to)" },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "sort", in: "query", schema: { type: "string", default: "startTime",
            enum: ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"] } },
        ],
        responses: {
          200: ok("Strona rezerwacji", ref("ReservationPage")), 400: E400, 401: E401,
          403: err("USER użył filtra userId (FORBIDDEN)"),
        },
      },
      post: {
        tags: ["Reservations"], summary: "Nowa rezerwacja (dla zalogowanego użytkownika)", security: secured,
        requestBody: { required: true, ...json(ref("ReservationInput")) },
        responses: {
          201: ok("Utworzona rezerwacja (nagłówek Location)", ref("Reservation")),
          400: err("Walidacja, endTime <= startTime, czas 15 min–8 h, start w przeszłości, pole userId/reservedBy"),
          401: E401, 404: err("Sala nie istnieje"),
          409: err("ROOM_ALREADY_BOOKED albo ROOM_CAPACITY_EXCEEDED"),
        },
      },
    },
    "/api/reservations/{id}": {
      parameters: [idParam()],
      get: {
        tags: ["Reservations"], summary: "Rezerwacja (właściciel albo ADMIN)", security: secured,
        responses: {
          200: ok("Rezerwacja", ref("Reservation")), 400: E400, 401: E401,
          404: err("Nie istnieje albo należy do innego użytkownika"),
        },
      },
    },
    "/api/reservations/{id}/cancel": {
      parameters: [idParam()],
      patch: {
        tags: ["Reservations"], summary: "Anulowanie (właściciel albo ADMIN)", security: secured,
        responses: {
          200: ok("Anulowana rezerwacja (ponowne anulowanie – bez zmian)", ref("Reservation")), 400: E400, 401: E401,
          404: err("Nie istnieje albo należy do innego użytkownika"),
          409: err("Rezerwacja już się rozpoczęła (RESERVATION_ALREADY_STARTED)"),
        },
      },
    },
  },
};
