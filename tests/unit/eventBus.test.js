const { createEventBus } = require("../../src/events/eventBus");

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("eventBus", () => {
  test("dostarcza event z nazwą, czasem i payloadem do listenera", async () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.subscribe("reservation.created", handler);
    bus.publish("reservation.created", { reservationId: 7 });
    await flush();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ name: "reservation.created", payload: { reservationId: 7 } }));
  });

  test("błąd listenera (sync i async) nie wychodzi poza publish i nie blokuje innych listenerów", async () => {
    const logger = { error: jest.fn() };
    const bus = createEventBus({ logger });
    const ok = jest.fn();
    bus.subscribe("x", () => { throw new Error("sync boom"); });
    bus.subscribe("x", async () => { throw new Error("async boom"); });
    bus.subscribe("x", ok);
    expect(() => bus.publish("x", {})).not.toThrow();
    await flush();
    expect(ok).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });
});
