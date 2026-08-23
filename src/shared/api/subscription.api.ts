import { api } from './axios';

// ─── Response Types ───

export interface PricingResponse {
  planType: string;
  priceInPaise: number;
  currency: string;
  durationDays: number;
  promoActive: boolean;
  promoPriceInPaise: number | null;
}

export interface SubscriptionStatusResponse {
  plan: 'FREE' | 'BASIC';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  currentPeriodEnd: string | null;
  isExpired: boolean;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  promoApplied: boolean;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  plan: string;
  expiresAt: string;
  alreadyProcessed?: boolean;
}

// ─── API Functions ───

export async function getPricing(): Promise<PricingResponse> {
  const res = await api.get<PricingResponse>('/subscription/pricing');
  return res.data;
}

export async function getStatus(): Promise<SubscriptionStatusResponse> {
  const res = await api.get<SubscriptionStatusResponse>('/subscription/status');
  return res.data;
}

export async function createOrder(): Promise<CreateOrderResponse> {
  const res = await api.post<CreateOrderResponse>('/subscription/create-order');
  return res.data;
}

export async function verifyPayment(data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
  const res = await api.post<VerifyPaymentResponse>('/subscription/verify-payment', data);
  return res.data;
}
