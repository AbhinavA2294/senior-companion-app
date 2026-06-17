export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'cancelled'

export type RefundStatus = 'succeeded' | 'pending' | 'failed'

export interface BookingCost {
  durationHours: number
  hourlyRateCents: number
  serviceAmountCents: number
  bookingFeeCents: number
  totalAmountCents: number
  platformFeeCents: number
  companionPayoutCents: number
  currency: string
}

// Returned by the payment gateway (Stripe PaymentIntent, or mock equivalent)
export interface GatewayPaymentIntent {
  id: string
  status: PaymentStatus
  amountCents: number
  currency: string
}

// Returned by the payment gateway after a refund
export interface GatewayRefund {
  id: string
  paymentIntentId: string
  amountCents: number
  reason: string
  status: RefundStatus
}

export interface CreatePaymentIntentParams {
  bookingId: string
  amountCents: number
  serviceAmountCents: number
  bookingFeeCents: number
  platformFeeCents: number
  companionPayoutCents: number
  currency?: string
}

export interface CreateRefundParams {
  paymentIntentId: string
  amountCents: number
  reason: string
}

// The PaymentProvider interface — implement MockPaymentProvider now, StripePaymentProvider later
export interface PaymentProvider {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<GatewayPaymentIntent>
  authorizePayment(providerPaymentId: string): Promise<GatewayPaymentIntent>
  capturePayment(providerPaymentId: string): Promise<GatewayPaymentIntent>
  cancelPayment(providerPaymentId: string): Promise<GatewayPaymentIntent>
  createRefund(params: CreateRefundParams): Promise<GatewayRefund>
  calculatePlatformFee(serviceAmountCents: number): number
  calculateCompanionPayout(serviceAmountCents: number): number
}
