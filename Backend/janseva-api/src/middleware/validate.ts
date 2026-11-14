import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../utils/appError';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod validation middleware — validates and transforms request data.
 * Replaces req.body/query/params with the parsed, type-safe output.
 */
export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      req[target] = parsed;
      next();
    } catch (err) {
      const zodError = err as ZodError;
      const errors = zodError.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      next(new ValidationError('Validation failed', errors));
    }
  };
}

/**
 * Validates multiple targets at once (body + query + params)
 */
export function validateRequest(schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const allErrors: Array<{ field: string; message: string }> = [];

    for (const [target, schema] of Object.entries(schemas) as [
      ValidationTarget,
      ZodTypeAny,
    ][]) {
      if (!schema) continue;
      try {
        const parsed = await schema.parseAsync(req[target]);
        req[target] = parsed;
      } catch (err) {
        const zodError = err as ZodError;
        zodError.errors.forEach((e) => {
          allErrors.push({
            field: `${target}.${e.path.join('.')}`,
            message: e.message,
          });
        });
      }
    }

    if (allErrors.length > 0) {
      next(new ValidationError('Validation failed', allErrors));
      return;
    }

    next();
  };
}
