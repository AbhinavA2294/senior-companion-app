export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorContext {
  userId?: string;
  bookingId?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * Adapter interface for error monitoring.
 * Swap the console implementation for Sentry, Datadog, etc.
 * without touching call sites.
 */
export interface ErrorMonitoringAdapter {
  captureException(error: unknown, context?: ErrorContext): void;
  captureMessage(message: string, severity?: ErrorSeverity, context?: ErrorContext): void;
  setUserContext(userId: string, email?: string): void;
  clearUserContext(): void;
}
