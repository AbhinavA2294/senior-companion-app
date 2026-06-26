/* eslint-disable no-console */
import type { ErrorMonitoringAdapter, ErrorContext, ErrorSeverity } from "./types";

/**
 * Default implementation — logs to the console.
 * Replace with SentryAdapter (or similar) before going to production.
 *
 * To integrate Sentry:
 *   1. `npm install @sentry/nextjs`
 *   2. Run `npx @sentry/wizard@latest -i nextjs`
 *   3. Implement SentryAdapter satisfying ErrorMonitoringAdapter
 *   4. Export it from lib/monitoring/index.ts instead of this class
 */
export class ConsoleMonitoringAdapter implements ErrorMonitoringAdapter {
  captureException(error: unknown, context?: ErrorContext): void {
    console.error("[monitoring] exception", error, context ?? {});
  }

  captureMessage(message: string, severity: ErrorSeverity = "low", context?: ErrorContext): void {
    const log = severity === "critical" || severity === "high" ? console.error : console.warn;
    log(`[monitoring] ${severity}: ${message}`, context ?? {});
  }

  setUserContext(userId: string, email?: string): void {
    console.debug("[monitoring] user context set", { userId, email });
  }

  clearUserContext(): void {
    console.debug("[monitoring] user context cleared");
  }
}
