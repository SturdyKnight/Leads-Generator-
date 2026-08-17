/**
 * Operational error types. Every one carries the HTTP status and machine code
 * the error handler will send, so controllers never decide status codes.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details: Record<string, string[]>,
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} ${id} was not found` : `${resource} was not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/** An upstream provider (Google Places) failed or is misconfigured. */
export class ExternalServiceError extends AppError {
  constructor(message: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}
