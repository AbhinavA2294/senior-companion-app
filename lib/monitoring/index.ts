export type { ErrorMonitoringAdapter, ErrorContext, ErrorSeverity } from "./types";
export { ConsoleMonitoringAdapter } from "./console-adapter";

import { ConsoleMonitoringAdapter } from "./console-adapter";
import type { ErrorMonitoringAdapter } from "./types";

/**
 * Singleton monitoring instance.
 * Swap for a production adapter (e.g. SentryAdapter) before going live.
 *
 * IMPORTANT: The external-provider implementation is disabled by default.
 * Do not enable a third-party error monitoring service that receives request
 * bodies or user context without completing a data-processing agreement review.
 */
export const monitoring: ErrorMonitoringAdapter = new ConsoleMonitoringAdapter();
