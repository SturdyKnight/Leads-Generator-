/**
 * B-Matrix backend entry point.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { generalLimiter } from './middleware/rate-limiter.js';
import { discoverySessionService } from './services/discovery-session.service.js';
import { googlePlacesService } from './services/google-places.service.js';
import { sseService } from './services/sse.service.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

// Render and similar platforms terminate TLS upstream. Without this the rate
// limiter sees one proxy IP for every visitor and pools them into one bucket.
app.set('trust proxy', 1);

app.use(
  helmet({
    // The SSE stream and the Vite dev client both trip the default CSP.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Health checks run before the limiter so platform probes never consume budget.
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    placesConfigured: googlePlacesService.isConfigured,
    sseClients: sseService.clientCount,
    timestamp: new Date().toISOString(),
  });
});

app.use(env.API_PREFIX, generalLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  await connectDatabase();

  // A previous process may have died mid-discovery, leaving sessions RUNNING
  // with no owner. Resolve them before accepting traffic.
  await discoverySessionService.recoverInterruptedSessions();

  if (!googlePlacesService.isConfigured) {
    logger.warn('GOOGLE_PLACES_API_KEY is not set — discovery will fail until it is.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`B-Matrix API ready on :${env.PORT}${env.API_PREFIX} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    sseService.closeAll();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((error) => {
  logger.error('Failed to start', { error: error instanceof Error ? error.message : error });
  process.exit(1);
});

export default app;
