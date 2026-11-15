const { EventEmitter } = require("node:events");

// Event bus na EventEmitterze z izolacją listenerów:
// handler działa asynchronicznie, a jego błąd (sync i async) jest tylko logowany –
// nie wpływa na kod, który opublikował event (np. na odpowiedź API).
function createEventBus({ logger = console } = {}) {
  const emitter = new EventEmitter();
  return {
    publish(eventName, payload) {
      emitter.emit(eventName, { name: eventName, occurredAt: new Date().toISOString(), payload });
    },
    subscribe(eventName, handler) {
      emitter.on(eventName, (event) => {
        Promise.resolve()
          .then(() => handler(event))
          .catch((err) => logger.error(`[event:${eventName}] handler failed:`, err));
      });
    },
  };
}

// null object – używany, gdy nikt nie przekaże event busa
const noopEventBus = { publish() {}, subscribe() {} };

module.exports = { createEventBus, noopEventBus };
