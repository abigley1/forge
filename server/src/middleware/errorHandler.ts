/**
 * API Error Handler Middleware
 *
 * Catches ApiError instances and converts them to appropriate HTTP responses.
 * Unknown errors are passed to Express's default error handler.
 */

import type { Request, Response, NextFunction } from 'express'
import { ApiError } from '../errors.js'

/**
 * Express error handler middleware for API errors
 */
export function handleApiError(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    })
    return
  }

  // Pass unknown errors to Express's default handler
  next(error)
}
