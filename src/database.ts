// Mock database service for the e-commerce MCP server
// In production, replace this with actual database calls

import { Product, Cart, CartItem, Order, ShippingAddress, PaymentDetails } from './types.js';

// Sample products database
const productsDB: Map<string, Product> = new Map([
  ['prod_001', {
    id: 'prod_001',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
    price: 299.99,
    currency: 'USD',
    category: 'Electronics',
    stock: 45,
    sku: 'WH-1000XM5',
    imageUrl: 'https://example.com/images/headphones.jpg'
  }],
  ['prod_002', {
    id: 'prod_002',
    name: 'Smart Watch',
    description: 'Fitness tracking smart watch with heart rate monitor and GPS',
    price: 399.99,
    currency: 'USD',
    category: 'Electronics',
    stock: 30,
    sku: 'SW-ULTRA-2',
    imageUrl: 'https://example.com/images/smartwatch.jpg'
  }],
  ['prod_003', {
    id: 'prod_003',
    name: 'Laptop Backpack',
    description: 'Durable water-resistant backpack with laptop compartment',
    price: 79.99,
    currency: 'USD',
    category: 'Accessories',
    stock: 120,
    sku: 'BP-LAP-001',
    imageUrl: 'https://example.com/images/backpack.jpg'
  }],
  ['prod_004', {
    id: 'prod_004',
    name: 'Bluetooth Speaker',
    description: 'Portable waterproof speaker with 360-degree sound',
    price: 149.99,
    currency: 'USD',
    category: 'Electronics',
    stock: 67,
    sku: 'BT-SPK-PRO',
    imageUrl: 'https://example.com/images/speaker.jpg'
  }],
  ['prod_005', {
    id: 'prod_005',
    name: 'Ergonomic Mouse',
    description: 'Wireless ergonomic mouse with customizable buttons',
    price: 59.99,
    currency: 'USD',
    category: 'Accessories',
    stock: 200,
    sku: 'MS-ERGO-X1',
    imageUrl: 'https://example.com/images/mouse.jpg'
  }]
]);

// Active carts database
const cartsDB: Map<string, Cart> = new Map();

// Orders database
const ordersDB: Map<string, Order> = new Map();

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Product operations
export function getAllProducts(): Product[] {
  return Array.from(productsDB.values());
}

export function getProductById(productId: string): Product | null {
  return productsDB.get(productId) || null;
}

export function searchProducts(query: string, category?: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(productsDB.values()).filter(product => {
    const matchesQuery = product.name.toLowerCase().includes(lowerQuery) ||
                        product.description.toLowerCase().includes(lowerQuery);
    const matchesCategory = !category || product.category.toLowerCase() === category.toLowerCase();
    return matchesQuery && matchesCategory;
  });
}

export function getProductsByCategory(category: string): Product[] {
  return Array.from(productsDB.values()).filter(
    product => product.category.toLowerCase() === category.toLowerCase()
  );
}

// Cart operations
export function createCart(): Cart {
  const cartId = generateId('cart');
  const cart: Cart = {
    id: cartId,
    items: [],
    totalAmount: 0,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  cartsDB.set(cartId, cart);
  return cart;
}

export function getCart(cartId: string): Cart | null {
  return cartsDB.get(cartId) || null;
}

export function addToCart(cartId: string, productId: string, quantity: number): Cart | null {
  const cart = cartsDB.get(cartId);
  if (!cart) return null;

  const product = productsDB.get(productId);
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  if (product.stock < quantity) {
    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
  }

  // Check if item already in cart
  const existingItem = cart.items.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId,
      quantity,
      price: product.price
    });
  }

  // Update total
  cart.totalAmount = cart.items.reduce((total, item) => {
    const itemProduct = productsDB.get(item.productId);
    return total + (itemProduct ? itemProduct.price * item.quantity : 0);
  }, 0);

  cart.updatedAt = new Date().toISOString();
  cartsDB.set(cartId, cart);
  return cart;
}

export function removeFromCart(cartId: string, productId: string): Cart | null {
  const cart = cartsDB.get(cartId);
  if (!cart) return null;

  cart.items = cart.items.filter(item => item.productId !== productId);

  // Update total
  cart.totalAmount = cart.items.reduce((total, item) => {
    const product = productsDB.get(item.productId);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);

  cart.updatedAt = new Date().toISOString();
  cartsDB.set(cartId, cart);
  return cart;
}

export function updateCartItemQuantity(cartId: string, productId: string, quantity: number): Cart | null {
  const cart = cartsDB.get(cartId);
  if (!cart) return null;

  const product = productsDB.get(productId);
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  if (product.stock < quantity) {
    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
  }

  const item = cart.items.find(i => i.productId === productId);
  if (!item) {
    throw new Error(`Product ${productId} not in cart`);
  }

  item.quantity = quantity;

  // Update total
  cart.totalAmount = cart.items.reduce((total, item) => {
    const itemProduct = productsDB.get(item.productId);
    return total + (itemProduct ? itemProduct.price * item.quantity : 0);
  }, 0);

  cart.updatedAt = new Date().toISOString();
  cartsDB.set(cartId, cart);
  return cart;
}

// Order operations
export function createOrder(
  cartId: string,
  shippingAddress: ShippingAddress,
  paymentDetails: PaymentDetails
): Order | null {
  const cart = cartsDB.get(cartId);
  if (!cart) return null;

  if (cart.items.length === 0) {
    throw new Error('Cannot create order from empty cart');
  }

  // Verify stock availability
  for (const item of cart.items) {
    const product = productsDB.get(item.productId);
    if (!product || product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.productId}`);
    }
  }

  // Create order
  const orderId = generateId('order');
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // 5 days delivery

  const order: Order = {
    id: orderId,
    cartId,
    items: [...cart.items],
    totalAmount: cart.totalAmount,
    currency: cart.currency,
    shippingAddress,
    paymentDetails,
    status: 'processing',
    createdAt: new Date().toISOString(),
    estimatedDelivery: estimatedDelivery.toISOString()
  };

  // Update stock
  for (const item of cart.items) {
    const product = productsDB.get(item.productId);
    if (product) {
      product.stock -= item.quantity;
      productsDB.set(item.productId, product);
    }
  }

  ordersDB.set(orderId, order);

  // Clear cart
  cart.items = [];
  cart.totalAmount = 0;
  cart.updatedAt = new Date().toISOString();
  cartsDB.set(cartId, cart);

  return order;
}

export function getOrder(orderId: string): Order | null {
  return ordersDB.get(orderId) || null;
}

export function getAllOrders(): Order[] {
  return Array.from(ordersDB.values());
}