/**
 * Custom API Error Classes
 *
 * These error classes are used throughout the server to represent
 * different types of errors that can occur during API operations.
 * The error handler middleware maps these to appropriate HTTP responses.
 */

/**
 * Base class for all API errors
 */
export abstract class ApiError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends ApiError {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404

  constructor(
    public readonly resource: string,
    public readonly id?: string
  ) {
    super(id ? `${resource} not found: ${id}` : `${resource} not found`)
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends ApiError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
  }
}

/**
 * Error thrown when an operation conflicts with existing state
 */
export class ConflictError extends ApiError {
  readonly code = 'CONFLICT'
  readonly statusCode = 409

  constructor(message: string) {
    super(message)
  }
}

/**
 * Error thrown when a dependency operation fails due to constraints
 */
export class DependencyError extends ApiError {
  readonly code = 'DEPENDENCY_ERROR'
  readonly statusCode = 400

  constructor(message: string) {
    super(message)
  }
}
