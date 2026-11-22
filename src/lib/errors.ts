export class ForbiddenError extends Error {
  constructor() {
    super("Недостаточно прав");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("Запись не найдена");
    this.name = "NotFoundError";
  }
}

export type ConflictCode =
  | "overlap"
  | "status"
  | "duplicate"
  | "window"
  | "own-listing"
  | "limit"
  | "already_paid"
  | "billing_disabled"
  | "live_forbidden"
  | "no_provider"
  | "refund_unavailable"
  | "amount"
  | "booking_closed"
  | "not_paid";

export class ConflictError extends Error {
  readonly code: ConflictCode;

  constructor(code: ConflictCode) {
    super(code);
    this.name = "ConflictError";
    this.code = code;
  }
}

export class PlanLimitError extends Error {
  readonly plan: string;
  readonly limit: number;

  constructor(plan: string, limit: number) {
    super("Plan limit");
    this.name = "PlanLimitError";
    this.plan = plan;
    this.limit = limit;
  }
}

export class ImageRejectedError extends Error {
  constructor() {
    super("Image rejected");
    this.name = "ImageRejectedError";
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}
