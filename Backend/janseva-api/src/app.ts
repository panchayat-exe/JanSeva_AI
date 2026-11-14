// ─── Bootstrap must be first — validates env before anything else ─
import './config/environment';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { swaggerSpec } from './config/swagger';
import { logger } from './logger/winston';
import { globalRateLimiter } from './middleware/rateLimiter';
import { httpRequestLogger, requestId } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ─── Route Imports ─────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import complaintRoutes from './modules/complaint/complaint.routes';
import aiRoutes from './modules/ai/ai.routes';
import notificationRoutes from './modules/notification/notification.routes';
import fileRoutes from './modules/file/file.routes';
import searchRoutes from './modules/search/search.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import adminRoutes from './modules/admin/admin.routes';

// ─── App ───────────────────────────────────────────────────
const app = express();
const API_PREFIX = `/api/${env.API_VERSION}`;

// ─── Security Headers ──────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow file serving
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'"],
      },
    },
  }),
);

// ─── CORS ──────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  }),
);

// ─── Core Middleware ───────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestId);
app.use(httpRequestLogger);
app.use(globalRateLimiter);

// ─── Static Files (uploaded media) ─────────────────────────
app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: env.APP_NAME,
    version: env.API_VERSION,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Documentation ─────────────────────────────────────
app.use(
  `${API_PREFIX}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'JanSeva AI — API Docs',
    customCss: `.swagger-ui .topbar { background: linear-gradient(135deg, #FF8C00, #138808); }`,
  }),
);

// ─── API Routes ────────────────────────────────────────────
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/complaints`, complaintRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/files`, fileRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ─── Overpass Proxy (server-side — no browser CORS) ───────────────────────
// POST /api/v1/geo/overpass  { query: "<Overpass QL>" }
// Returns raw Overpass JSON
app.post(`${API_PREFIX}/geo/overpass`, async (req, res) => {
  try {
    const { query } = req.body as { query?: string };
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, message: 'query is required' });
      return;
    }
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'JanSevaAI/1.0 (government-grievance-platform)'
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) {
      res.status(response.status).json({ success: false, message: `Overpass error ${response.status}` });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message ?? 'Overpass proxy failed' });
  }
});

// ─── Nominatim Proxy (server-side — no browser CORS) ──────────────────────
// GET /api/v1/geo/reverse?lat=..&lon=..
app.get(`${API_PREFIX}/geo/reverse`, async (req, res) => {
  try {
    const { lat, lon } = req.query as { lat?: string; lon?: string };
    if (!lat || !lon) {
      res.status(400).json({ success: false, message: 'lat and lon are required' });
      return;
    }
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'JanSevaAI/1.0 (government-grievance-platform)' },
    });
    if (!response.ok) {
      res.status(response.status).json({ success: false, message: `Nominatim error ${response.status}` });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message ?? 'Nominatim proxy failed' });
  }
});

// ─── Error Handling (MUST be last) ─────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Bootstrap ──────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected');

    // Connect to Redis (non-blocking — Redis is optional for core features)
    try {
      await connectRedis();
    } catch (redisErr) {
      logger.warn('⚠️  Redis connection failed — rate limiting will use memory store', { error: redisErr });
    }

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 JanSeva AI Server running on port ${env.PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${env.PORT}${API_PREFIX}/docs`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    });

    // ─── Graceful Shutdown ──────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('✅ Server closed. Goodbye!');
        process.exit(0);
      });

      // Force shutdown if not done in 30s
      setTimeout(() => {
        logger.error('❌ Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
