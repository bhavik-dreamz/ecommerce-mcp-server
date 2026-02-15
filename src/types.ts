// Type definitions for e-commerce MCP server

export interface Product {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  stock: number;
  imageUrl?: string;
  sku?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  [key: string]: unknown;
  id: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface PaymentDetails {
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  cardLast4?: string;
  cardBrand?: string;
  transactionId?: string;
}

export interface Order {
  [key: string]: unknown;
  id: string;
  cartId: string;
  items: CartItem[];
  totalAmount: number;
  currency: string;
  shippingAddress: ShippingAddress;
  paymentDetails: PaymentDetails;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  estimatedDelivery?: string;
}

export enum ResponseFormat {
  MARKDOWN = 'markdown',
  JSON = 'json'
}