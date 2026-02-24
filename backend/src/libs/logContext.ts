import { AsyncLocalStorage } from "async_hooks";

export interface LogContext {
    requestId: string;
    userId?: number;
    companyId?: number;
}

const logContextStorage = new AsyncLocalStorage<LogContext>();

export { logContextStorage };
