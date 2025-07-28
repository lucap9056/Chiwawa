import { goify, GoifyResult } from "resultant.js/goify";
import { buildResult } from "resultant.js/rustify";

export class Mutex {
    private locked: boolean = false;
    private readonly queue: (() => void)[] = [];

    private async acquire(): Promise<() => void> {
        if (this.locked) {
            return new Promise<() => void>(resolve => {
                this.queue.push(() => resolve(this.release.bind(this)));
            });
        } else {
            this.locked = true;
            return this.release.bind(this);
        }
    }
    public async runExclusive<T>(operation: () => T): Promise<GoifyResult<T>>
    public async runExclusive<T>(operation: () => Promise<T>): Promise<GoifyResult<T>>
    public async runExclusive<T>(operation: () => Promise<T> | T): Promise<GoifyResult<T>> {
        const release = await this.acquire();
        const result = await goify(async () => operation());
        release();
        return result;
    }

    private release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else {
            this.locked = false;
        }
    }
}