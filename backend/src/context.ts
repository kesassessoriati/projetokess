
import { AsyncLocalStorage } from "async_hooks";

interface Context {
    companyId: number;
}

const context = new AsyncLocalStorage<Context>();

export const getContext = () => context.getStore();

export const runWithContext = (ctx: Context, next: () => any) => {
    return context.run(ctx, next);
};
