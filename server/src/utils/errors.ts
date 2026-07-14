/**
 * Typed error classes for the Apex.ai API.
 * All application errors extend AppError so the central error handler
 * can distinguish them from unexpected runtime errors.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (required when extending built-ins in TS/ES5 targets)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 422 Unprocessable Entity — request body/params failed validation */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR') {
    super(422, code, message);
  }
}

/** 401 Unauthorized — missing or invalid credentials */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

/** 403 Forbidden — authenticated but not allowed */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

/** 404 Not Found — resource does not exist */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

/** 409 Conflict — resource already exists or state conflict */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(409, code, message);
  }
}

/** 429 Too Many Requests — plan limit reached */
export class PlanLimitError extends AppError {
  constructor(message = 'Plan limit reached', code = 'PLAN_LIMIT_EXCEEDED') {
    super(429, code, message);
  }
}

/** 503 Service Unavailable — upstream dependency is down */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(503, code, message);
  }
}
