
class Loading {
    public readonly id: string;
    private manager: LoadingManager;
    constructor(manager: LoadingManager) {
        this.manager = manager;
        this.id = Loading.CreateId();
    }

    private static CreateId(): string {
        const buf = new Uint16Array(8);
        crypto.getRandomValues(buf);
        return Array.from(buf).map((num) => (num < 0x10000 ? '0' : '') + num.toString(16)).join('-');
    }

    public Remove(): boolean {
        return this.manager.Remove(this.id);
    }
}

type Loadings = { [key: string]: Loading };

namespace Events {
    export type ChangeEvent = { detail: boolean };
}

namespace Handlers {
    export type ChangeEventHandler = (event: Events.ChangeEvent) => void
}

type EventPayloads = {
    "change": Events.ChangeEvent
};

type EventHandlers = {
    "change": Handlers.ChangeEventHandler
};


class LoadingManager {
    private loadings: Loadings = {};
    private state: boolean = false;

    public get State(): boolean {
        return this.state;
    }

    public Append(): Loading {
        const loading = new Loading(this);

        this.loadings[loading.id] = loading;

        this.Update();
        return loading;
    }

    public Remove(id: string): boolean {
        if (this.loadings[id]) {
            delete this.loadings[id];
            this.Update();
            return true;
        }

        this.Update();
        return false;
    }

    private Update(): void {
        const state = Object.keys(this.loadings).length > 0;

        if (this.state !== state) {
            this.state = state;
            this.emit("change", { detail: state });
        }
    }

    private events: { [K in keyof EventHandlers]?: Array<any> } = {};

    public on<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event]!.push(listener);
    }

    public off<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event]!.filter(l => l !== listener);
    }

    private emit<K extends keyof EventPayloads>(event: K, detail: EventPayloads[K]) {
        if (!this.events[event]) return;

        for (const listener of this.events[event]!) {
            listener(detail);
        }
    }
}

const loadsManager = new LoadingManager();

export default loadsManager;