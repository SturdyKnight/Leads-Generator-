/**
 * Server-Sent Events. One stream per open browser tab, broadcast to all.
 *
 * Writes are checked against the socket state before being attempted: a client
 * that closed without firing `close` would otherwise accumulate as a dead entry
 * that every subsequent broadcast tries to write to.
 */

import type { Response } from 'express';
import { logger } from '../utils/logger.js';

export const SSE_EVENTS = {
  CAMPAIGN_UPDATED: 'campaign:updated',
  SESSION_UPDATED: 'session:updated',
  LEAD_CREATED: 'lead:created',
  LEAD_UPDATED: 'lead:updated',
  DISCOVERY_PROGRESS: 'discovery:progress',
  DISCOVERY_COMPLETE: 'discovery:complete',
} as const;

export type SSEEvent = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];

const HEARTBEAT_MS = 25_000;

class SSEService {
  private readonly clients = new Map<string, { res: Response; heartbeat: NodeJS.Timeout }>();

  get clientCount(): number {
    return this.clients.size;
  }

  addClient(id: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Tell EventSource how long to wait before reconnecting itself.
    res.write('retry: 3000\n\n');

    const heartbeat = setInterval(() => {
      if (!this.write(id, ': ping\n\n')) this.removeClient(id);
    }, HEARTBEAT_MS);

    this.clients.set(id, { res, heartbeat });
    res.on('close', () => this.removeClient(id));

    logger.debug(`SSE client connected (${this.clients.size} open)`);
  }

  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    clearInterval(client.heartbeat);
    this.clients.delete(id);
    logger.debug(`SSE client disconnected (${this.clients.size} open)`);
  }

  broadcast(event: SSEEvent, data: unknown): void {
    if (this.clients.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const id of [...this.clients.keys()]) {
      if (!this.write(id, payload)) this.removeClient(id);
    }
  }

  closeAll(): void {
    for (const [id, client] of this.clients) {
      clearInterval(client.heartbeat);
      client.res.end();
      this.clients.delete(id);
    }
  }

  private write(id: string, chunk: string): boolean {
    const client = this.clients.get(id);
    if (!client || client.res.writableEnded || client.res.destroyed) return false;

    try {
      client.res.write(chunk);
      return true;
    } catch {
      return false;
    }
  }
}

export const sseService = new SSEService();
