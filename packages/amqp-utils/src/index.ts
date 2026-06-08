import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@restaurant/shared-types';

let connection: any = null;
let channel: amqp.Channel | null = null;

/**
 * Connect to RabbitMQ with retry logic
 */
export async function connectAmqp(url?: string): Promise<amqp.Channel> {
  const amqpUrl = url || process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672';
  const maxRetries = 10;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn: any = await amqp.connect(amqpUrl);
      connection = conn;
      const ch: any = await conn.createChannel();
      channel = ch;
      console.log(`[AMQP] Connected to RabbitMQ`);

      conn.on('error', (err: any) => {
        console.error('[AMQP] Connection error', err.message);
      });
      conn.on('close', () => {
        console.warn('[AMQP] Connection closed, reconnecting...');
        setTimeout(() => connectAmqp(amqpUrl), 5000);
      });

      return ch;
    } catch (err) {
      console.warn(`[AMQP] Connection attempt ${attempt}/${maxRetries} failed, retrying in ${attempt * 2}s...`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw new Error('[AMQP] Failed to connect after max retries');
}

export function getChannel(): amqp.Channel {
  if (!channel) throw new Error('[AMQP] Channel not initialized. Call connectAmqp() first.');
  return channel;
}

/**
 * Setup a topic exchange with optional DLQ
 */
export async function setupExchange(ch: amqp.Channel, exchange: string): Promise<void> {
  await ch.assertExchange(exchange, 'topic', { durable: true });
}

/**
 * Setup a queue bound to an exchange with DLQ
 */
export async function setupQueue(
  ch: amqp.Channel,
  queue: string,
  exchange: string,
  routingKey: string,
): Promise<void> {
  const dlqExchange = `${exchange}.dlx`;
  const dlqQueue = `${queue}.dlq`;

  // DLQ setup
  await ch.assertExchange(dlqExchange, 'topic', { durable: true });
  await ch.assertQueue(dlqQueue, { durable: true });
  await ch.bindQueue(dlqQueue, dlqExchange, '#');

  // Main queue with DLQ config
  await ch.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlqExchange,
      'x-dead-letter-routing-key': routingKey,
      'x-message-ttl': 30000, // 30s before DLQ on nack
    },
  });
  await ch.bindQueue(queue, exchange, routingKey);
}

/**
 * Publish a domain event to an exchange
 */
export async function publishEvent<T>(
  ch: amqp.Channel,
  exchange: string,
  routingKey: string,
  payload: T,
  correlationId?: string,
  causationId?: string,
): Promise<void> {
  const event: DomainEvent<T> = {
    messageId: uuidv4(),
    type: routingKey,
    version: '1.0',
    timestamp: new Date().toISOString(),
    correlationId: correlationId || uuidv4(),
    causationId,
    payload,
  };

  ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)), {
    persistent: true,
    contentType: 'application/json',
    messageId: event.messageId,
    headers: {
      'x-correlation-id': event.correlationId,
      'x-event-type': event.type,
      'x-event-version': event.version,
    },
  });
}

/**
 * Consume messages with idempotency check
 */
export async function consumeWithIdempotency(
  ch: amqp.Channel,
  queue: string,
  handler: (event: DomainEvent) => Promise<void>,
  isProcessed: (messageId: string) => Promise<boolean>,
  markProcessed: (messageId: string) => Promise<void>,
  maxRetries = 3,
): Promise<void> {
  await ch.prefetch(10);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;

    const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0;

    try {
      const event: DomainEvent = JSON.parse(msg.content.toString());

      // Idempotency check
      if (await isProcessed(event.messageId)) {
        console.log(`[AMQP] Duplicate message ${event.messageId}, skipping`);
        ch.ack(msg);
        return;
      }

      await handler(event);
      await markProcessed(event.messageId);
      ch.ack(msg);
    } catch (err) {
      console.error(`[AMQP] Error processing message from ${queue}:`, err);

      if (retryCount >= maxRetries) {
        console.error(`[AMQP] Max retries reached for message, sending to DLQ`);
        ch.nack(msg, false, false); // → DLQ
      } else {
        // Requeue with incremented retry count
        ch.nack(msg, false, true);
      }
    }
  });
}

export { amqp };
