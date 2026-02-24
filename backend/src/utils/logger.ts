import pino from 'pino';
import moment from 'moment-timezone';
import { logContextStorage } from '../libs/logContext';

// Função para obter o timestamp com fuso horário
const timezoned = () => {
  return moment().tz('America/Sao_Paulo').format('DD-MM-YYYY HH:mm:ss');
};

const baseLogger = pino({
  enabled: process.env.NODE_ENV !== 'test',
  timestamp: () => `,"time":"${timezoned()}"`,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Proxy para injetar contexto automaticamente
const logger = new Proxy(baseLogger, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);

    if (typeof value === 'function' && ['info', 'error', 'debug', 'warn', 'fatal', 'trace'].includes(property as string)) {
      return (...args: any[]) => {
        const context = logContextStorage.getStore();
        if (context) {
          // Se o primeiro argumento for um objeto, mescla com o contexto
          if (typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Error)) {
            args[0] = { ...context, ...args[0] };
          } else {
            // Caso contrário, insere o contexto como primeiro argumento
            args.unshift(context);
          }
        }
        return value.apply(target, args);
      };
    }
    return value;
  },
});

export default logger;
