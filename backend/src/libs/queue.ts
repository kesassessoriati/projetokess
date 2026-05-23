import "dotenv/config";
import BullQueue from "bull";
import {
  INTERNAL_MESSAGE_SYNC_REDIS_URI,
  REDIS_URI_MSG_CONN
} from "../config/redis";
import configLoader from "../services/ConfigLoaderService/configLoaderService";
import * as jobs from "../jobs";
import logger from "../utils/logger";

const config = configLoader();
const INTERNAL_MESSAGE_SYNC_QUEUE_KEY = "internalMessageSyncQueue";

const queueOptions = {
  defaultJobOptions: {
    attempts: config.webhook.attempts,
    backoff: {
      type: config.webhook.backoff.type,
      delay: config.webhook.backoff.delay
    },
    removeOnFail: false,
    removeOnComplete: true
  },
  limiter: {
    max: config.webhook.limiter.max,
    duration: config.webhook.limiter.duration
  }
};

const getQueueConnection = (jobKey: string): string => {
  if (jobKey === INTERNAL_MESSAGE_SYNC_QUEUE_KEY) {
    return INTERNAL_MESSAGE_SYNC_REDIS_URI;
  }

  return REDIS_URI_MSG_CONN;
};

const queues = Object.values(jobs).reduce((acc, job) => {
  const connection = getQueueConnection(job.key);

  acc.push({
    bull: new BullQueue(job.key, connection, queueOptions),
    connection,
    name: job.key,
    handle: job.handle
  });

  return acc;
}, []);

export default {
  queues,

  add(name: string, data, params = {}) {
    const queue = this.queues.find(item => item.name === name);

    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    if (!queue.connection) {
      throw new Error(`Queue ${name} Redis connection not configured`);
    }

    return queue.bull.add(data, { ...params, removeOnComplete: true });
  },

  process(queueNames?: string[]) {
    const selectedQueues = queueNames?.length
      ? this.queues.filter(queue => queueNames.includes(queue.name))
      : this.queues;

    return selectedQueues.forEach(queue => {
      if (!queue.connection) {
        logger.warn(`Queue ${queue.name} Redis connection not configured`);
        return;
      }

      queue.bull.process(queue.handle);

      queue.bull.on("failed", (job, err) => {
        logger.error(`Job failed: ${queue.name} ${JSON.stringify(job.data)}`);
        logger.error(err);
      });
    });
  }
};
