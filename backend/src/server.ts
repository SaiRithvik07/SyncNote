import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorHandler } from './middlewares/errors';
import { initSocket } from './socket/socket';

// Import routes
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import collaboratorRoutes from './routes/collaborators';
import versionRoutes from './routes/versions';

const app = express();
const httpServer = createServer(app);

// Initialize WebSockets
initSocket(httpServer, env.CORS_ORIGIN);

// Global Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = env.CORS_ORIGIN;
      
      // Support wildcard
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      
      // Check for exact match or domain name match ignoring protocol
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === origin) return true;
        return origin.replace(/^https?:\/\//i, '') === allowed.replace(/^https?:\/\//i, '');
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(null, false); // Safe fallback (sends 200/cors fail instead of throwing Express crash)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(cookieParser());

// Request logging via morgan
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api/', globalLimiter);

// Auth Rate Limiting (more strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts per windowMs
  message: {
    status: 'fail',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents/:documentId/collaborators', collaboratorRoutes);
app.use('/api/documents/:documentId/versions', versionRoutes);

// Health check (used by Railway / uptime monitors)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Route handler
app.use('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global Error Handler Middleware (Must be registered last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server successfully running in ${env.NODE_ENV} mode on port ${PORT}`);
});
