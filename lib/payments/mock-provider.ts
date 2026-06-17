import type {
  PaymentProvider,
  GatewayPaymentIntent,
  GatewayRefund,
  CreatePaymentIntentParams,
  CreateRefundParams,
} from './types'
import { calculatePlatformFee, calculateCompanionPayout } from './payment-service'

function generateMockId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<GatewayPaymentIntent> {
    return {
      id: generateMockId('mock_pi'),
      status: 'pending',
      amountCents: params.amountCents,
      currency: params.currency ?? 'usd',
    }
  }

  async authorizePayment(providerPaymentId: string): Promise<GatewayPaymentIntent> {
    return { id: providerPaymentId, status: 'authorized', amountCents: 0, currency: 'usd' }
  }

  async capturePayment(providerPaymentId: string): Promise<GatewayPaymentIntent> {
    return { id: providerPaymentId, status: 'captured', amountCents: 0, currency: 'usd' }
  }

  async cancelPayment(providerPaymentId: string): Promise<GatewayPaymentIntent> {
    return { id: providerPaymentId, status: 'cancelled', amountCents: 0, currency: 'usd' }
  }

  async createRefund(params: CreateRefundParams): Promise<GatewayRefund> {
    return {
      id: generateMockId('mock_ref'),
      paymentIntentId: params.paymentIntentId,
      amountCents: params.amountCents,
      reason: params.reason,
      status: 'succeeded',
    }
  }

  calculatePlatformFee(serviceAmountCents: number): number {
    return calculatePlatformFee(serviceAmountCents)
  }

  calculateCompanionPayout(serviceAmountCents: number): number {
    return calculateCompanionPayout(serviceAmountCents)
  }
}
