import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";

type Listener = (data: any) => Promise<void>;

interface EventData {
    id: string;
    type: string;
    payload: any;
    companyId: number;
    createdAt: Date;
}

class EventBus extends EventEmitter {
    private static instance: EventBus;

    private constructor() {
        super();
        this.setMaxListeners(100);
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public async publish(type: string, payload: any, companyId: number): Promise<string> {
        const eventId = uuidv4();
        const eventData: EventData = {
            id: eventId,
            type,
            payload,
            companyId,
            createdAt: new Date()
        };

        // Emitir de forma assíncrona para não bloquear o fluxo principal
        setImmediate(() => {
            this.emit(type, eventData);
        });

        return eventId;
    }

    public subscribe(type: string, listener: Listener): void {
        this.on(type, async (eventData: EventData) => {
            try {
                await this.executeWithRetry(listener, eventData);
            } catch (err) {
                console.error(`[EventBus] Error executing listener for ${type}:`, err);
            }
        });
    }

    private async executeWithRetry(listener: Listener, data: any, retries = 3): Promise<void> {
        let attempt = 0;
        while (attempt < retries) {
            try {
                await listener(data);
                return;
            } catch (err) {
                attempt++;
                if (attempt >= retries) throw err;
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
}

export default EventBus.getInstance();
export { EventData };
