export * from './types'
export * from './config'
export * from './payment-service'
export { MockPaymentProvider } from './mock-provider'

import { MockPaymentProvider } from './mock-provider'
import type { PaymentProvider } from './types'

// Swap this singleton for StripePaymentProvider when live payments are enabled.
// All server actions import `paymentProvider` — no other code changes needed.
export const paymentProvider: PaymentProvider = new MockPaymentProvider()
