/**
 * Version: 1.0.0
 */

/**

type EventDefinitions = {
    "AnyChanged": { detail: any };
};
export type Event<EventName extends keyof EventDefinitions> = EventDefinitions[EventName];

*/

class EventDispatcher<EventDefinitions extends Record<string, any>> {

    private events = new Map<keyof EventDefinitions, Set<(payload: any) => void>>();

    /**
     * Registers an event handler.
     * 
     * @param event - The name of the event to listen to.
     * @param handler - The callback function to handle the event.
     */
    public on<EventName extends keyof EventDefinitions>(event: EventName, handler: (payload: EventDefinitions[EventName]) => void) {
        let handlers = this.events.get(event);
        if (!handlers) {
            handlers = new Set();
            this.events.set(event, handlers);
        }
        handlers.add(handler);
    }

    /**
     * Unregisters an event handler.
     * 
     * @param event - The name of the event to remove the handler from.
     * @param handler - The callback function to be removed.
     */
    public off<EventName extends keyof EventDefinitions>(event: EventName, handler: (payload: EventDefinitions[EventName]) => void) {
        const handlers = this.events.get(event);
        if (!handlers) return;
        handlers.delete(handler);
        if (handlers.size === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Emits an event to notify all registered handlers.
     * 
     * @param event - The name of the event to emit.
     * @param value - The payload to send with the event.
     */
    protected emit<EventName extends keyof EventDefinitions>(event: EventName, value: EventDefinitions[EventName]) {
        const handlers = this.events.get(event);
        if (!handlers) return;

        for (const handler of handlers.values()) {
            handler(value);
        }
    }

    /**
     * Registers an event handler that fires only once.
     * 
     * @param event - The name of the event.
     * @param handler - The callback function.
     */
    public once<EventName extends keyof EventDefinitions>(event: EventName, handler: (payload: EventDefinitions[EventName]) => void) {
        const onceHandler = (payload: EventDefinitions[EventName]) => {
            this.off(event, onceHandler);
            handler(payload);
        };
        this.on(event, onceHandler);
    }

    /**
     * Clears all handlers for a given event, or all events if no event name is provided.
     * 
     * @param event - The name of the event to clear. If omitted, all events will be cleared.
     */
    public clear<EventName extends keyof EventDefinitions>(event?: EventName) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

export default EventDispatcher;
