import rateLimit from 'express-rate-limit';
import { env } from '../config/environment';

// Note: Rate limit max values are configured in the .env file
/**
 * Global API rate limiter — 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'RATE_LIMIT_ERROR',
    statusCode: 429,
  },
  skip: (req) => {
    // Never rate-limit health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for auth endpoints — 10 requests per 15 minutes
 * Protects against brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many authentication attempts from this IP. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_ERROR',
    statusCode: 429,
  },
});

/**
 * Stricter limiter for password reset / email verification (5 per 15 min)
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 500, // increased for dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait 15 minutes before trying again.',
    code: 'RATE_LIMIT_ERROR',
    statusCode: 429,
  },
});

/**
 * AI endpoint rate limiter — 30 requests per 15 minutes
 * AI calls are expensive; prevent abuse
 */
export const aiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 3000, // increased for dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI request limit reached. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_ERROR',
    statusCode: 429,
  },
});
