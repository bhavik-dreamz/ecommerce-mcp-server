#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { z } from "zod";
import { ResponseFormat, Product, Cart, Order } from './types.js';
import * as db from './database.js';

// Initialize MCP server
const server = new McpServer({
  name: "ecommerce-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

const ProductListInputSchema = z.object({
  category: z.string()
    .optional()
    .describe("Filter by category (e.g., 'Electronics', 'Accessories')"),
  response_format: ResponseFormatSchema
}).strict();

const ProductSearchInputSchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .describe("Search term to find products by name or description"),
  category: z.string()
    .optional()
    .describe("Filter by category"),
  response_format: ResponseFormatSchema
}).strict();

const ProductGetInputSchema = z.object({
  product_id: z.string()
    .min(1, "Product ID is required")
    .describe("Unique product identifier (e.g., 'prod_001')"),
  response_format: ResponseFormatSchema
}).strict();

const CartCreateInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

const CartGetInputSchema = z.object({
  cart_id: z.string()
    .min(1, "Cart ID is required")
    .describe("Unique cart identifier"),
  response_format: ResponseFormatSchema
}).strict();

const CartAddItemInputSchema = z.object({
  cart_id: z.string()
    .min(1, "Cart ID is required")
    .describe("Unique cart identifier"),
  product_id: z.string()
    .min(1, "Product ID is required")
    .describe("Product to add to cart"),
  quantity: z.number()
    .int()
    .min(1, "Quantity must be at least 1")
    .default(1)
    .describe("Number of items to add"),
  response_format: ResponseFormatSchema
}).strict();

const CartRemoveItemInputSchema = z.object({
  cart_id: z.string()
    .min(1, "Cart ID is required")
    .describe("Unique cart identifier"),
  product_id: z.string()
    .min(1, "Product ID is required")
    .describe("Product to remove from cart"),
  response_format: ResponseFormatSchema
}).strict();

const CartUpdateItemInputSchema = z.object({
  cart_id: z.string()
    .min(1, "Cart ID is required")
    .describe("Unique cart identifier"),
  product_id: z.string()
    .min(1, "Product ID is required")
    .describe("Product to update in cart"),
  quantity: z.number()
    .int()
    .min(1, "Quantity must be at least 1")
    .describe("New quantity for the item"),
  response_format: ResponseFormatSchema
}).strict();

const ShippingAddressSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  address_line1: z.string().min(1, "Address line 1 is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(2, "Country code is required"),
  phone: z.string().min(1, "Phone number is required")
}).strict();

const PaymentDetailsSchema = z.object({
  method: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer']),
  card_last4: z.string().optional(),
  card_brand: z.string().optional(),
  transaction_id: z.string().optional()
}).strict();

const OrderCreateInputSchema = z.object({
  cart_id: z.string()
    .min(1, "Cart ID is required")
    .describe("Cart to convert into an order"),
  shipping_address: ShippingAddressSchema
    .describe("Delivery address for the order"),
  payment_details: PaymentDetailsSchema
    .describe("Payment information"),
  response_format: ResponseFormatSchema
}).strict();

const OrderGetInputSchema = z.object({
  order_id: z.string()
    .min(1, "Order ID is required")
    .describe("Unique order identifier"),
  response_format: ResponseFormatSchema
}).strict();

const OrderListInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatProduct(product: Product, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(product, null, 2);
  }

  return `### ${product.name}
- **ID**: ${product.id}
- **Price**: $${product.price.toFixed(2)} ${product.currency}
- **Category**: ${product.category}
- **Stock**: ${product.stock} available
- **SKU**: ${product.sku || 'N/A'}
- **Description**: ${product.description}
${product.imageUrl ? `- **Image**: ${product.imageUrl}` : ''}`;
}

function formatProductList(products: Product[], format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify({ products, count: products.length }, null, 2);
  }

  if (products.length === 0) {
    return "No products found.";
  }

  let output = `## Products (${products.length} found)\n\n`;
  products.forEach((product, index) => {
    output += `${index + 1}. **${product.name}** (${product.id})\n`;
    output += `   - Price: $${product.price.toFixed(2)}\n`;
    output += `   - Category: ${product.category}\n`;
    output += `   - Stock: ${product.stock}\n`;
    output += `   - ${product.description}\n\n`;
  });
  return output;
}

function formatCart(cart: Cart, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    const cartWithProducts = {
      ...cart,
      items: cart.items.map(item => {
        const product = db.getProductById(item.productId);
        return {
          ...item,
          productName: product?.name || 'Unknown',
          productPrice: product?.price || item.price
        };
      })
    };
    return JSON.stringify(cartWithProducts, null, 2);
  }

  let output = `## Shopping Cart (${cart.id})\n\n`;
  
  if (cart.items.length === 0) {
    output += "Cart is empty.\n";
  } else {
    output += "### Items:\n";
    cart.items.forEach((item, index) => {
      const product = db.getProductById(item.productId);
      const productName = product?.name || 'Unknown Product';
      const itemTotal = (product?.price || item.price) * item.quantity;
      output += `${index + 1}. **${productName}** (${item.productId})\n`;
      output += `   - Quantity: ${item.quantity}\n`;
      output += `   - Price: $${(product?.price || item.price).toFixed(2)} each\n`;
      output += `   - Subtotal: $${itemTotal.toFixed(2)}\n\n`;
    });
  }

  output += `\n**Total Amount**: $${cart.totalAmount.toFixed(2)} ${cart.currency}\n`;
  output += `**Last Updated**: ${new Date(cart.updatedAt).toLocaleString()}\n`;
  return output;
}

function formatOrder(order: Order, format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    const orderWithProducts = {
      ...order,
      items: order.items.map(item => {
        const product = db.getProductById(item.productId);
        return {
          ...item,
          productName: product?.name || 'Unknown'
        };
      })
    };
    return JSON.stringify(orderWithProducts, null, 2);
  }

  let output = `## Order Details (${order.id})\n\n`;
  output += `**Status**: ${order.status.toUpperCase()}\n`;
  output += `**Order Date**: ${new Date(order.createdAt).toLocaleString()}\n`;
  if (order.estimatedDelivery) {
    output += `**Estimated Delivery**: ${new Date(order.estimatedDelivery).toLocaleDateString()}\n`;
  }
  output += `\n### Items Ordered:\n`;
  
  order.items.forEach((item, index) => {
    const product = db.getProductById(item.productId);
    const productName = product?.name || 'Unknown Product';
    const itemTotal = item.price * item.quantity;
    output += `${index + 1}. **${productName}** (${item.productId})\n`;
    output += `   - Quantity: ${item.quantity}\n`;
    output += `   - Price: $${item.price.toFixed(2)} each\n`;
    output += `   - Subtotal: $${itemTotal.toFixed(2)}\n\n`;
  });

  output += `\n**Total Amount**: $${order.totalAmount.toFixed(2)} ${order.currency}\n\n`;
  
  output += `### Shipping Address:\n`;
  output += `${order.shippingAddress.fullName}\n`;
  output += `${order.shippingAddress.addressLine1}\n`;
  if (order.shippingAddress.addressLine2) {
    output += `${order.shippingAddress.addressLine2}\n`;
  }
  output += `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}\n`;
  output += `${order.shippingAddress.country}\n`;
  output += `Phone: ${order.shippingAddress.phone}\n\n`;

  output += `### Payment Details:\n`;
  output += `Method: ${order.paymentDetails.method.replace('_', ' ').toUpperCase()}\n`;
  if (order.paymentDetails.cardBrand && order.paymentDetails.cardLast4) {
    output += `Card: ${order.paymentDetails.cardBrand} ending in ${order.paymentDetails.cardLast4}\n`;
  }
  if (order.paymentDetails.transactionId) {
    output += `Transaction ID: ${order.paymentDetails.transactionId}\n`;
  }

  return output;
}

function formatOrderList(orders: Order[], format: ResponseFormat): string {
  if (format === ResponseFormat.JSON) {
    return JSON.stringify({ orders, count: orders.length }, null, 2);
  }

  if (orders.length === 0) {
    return "No orders found.";
  }

  let output = `## Orders (${orders.length} found)\n\n`;
  orders.forEach((order, index) => {
    output += `${index + 1}. **Order ${order.id}**\n`;
    output += `   - Status: ${order.status.toUpperCase()}\n`;
    output += `   - Total: $${order.totalAmount.toFixed(2)}\n`;
    output += `   - Items: ${order.items.length}\n`;
    output += `   - Date: ${new Date(order.createdAt).toLocaleDateString()}\n\n`;
  });
  return output;
}

// ============================================================================
// TOOL REGISTRATIONS
// ============================================================================

// Tool 1: List Products
server.registerTool(
  "ecommerce_list_products",
  {
    title: "List All Products",
    description: `List all available products in the store, optionally filtered by category.

This tool retrieves the complete product catalog or products from a specific category.

Args:
  - category (string, optional): Filter by category name (e.g., 'Electronics', 'Accessories')
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: { products: Product[], count: number }
  For Markdown format: Formatted list with product details

Examples:
  - List all products: {}
  - List electronics: { category: "Electronics" }`,
    inputSchema: ProductListInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const products = params.category 
        ? db.getProductsByCategory(params.category)
        : db.getAllProducts();

      const formattedOutput = formatProductList(products, params.response_format);

      return {
        content: [{ type: "text", text: formattedOutput }],
        structuredContent: params.response_format === ResponseFormat.JSON 
          ? { products, count: products.length }
          : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error listing products: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 2: Search Products
server.registerTool(
  "ecommerce_search_products",
  {
    title: "Search Products",
    description: `Search for products by name or description.

Args:
  - query (string): Search term to match against product names and descriptions
  - category (string, optional): Filter results by category
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of matching products

Examples:
  - Search for headphones: { query: "headphones" }
  - Search electronics for "smart": { query: "smart", category: "Electronics" }`,
    inputSchema: ProductSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const products = db.searchProducts(params.query, params.category);

      if (products.length === 0) {
        return {
          content: [{ type: "text", text: `No products found matching "${params.query}"` }]
        };
      }

      const formattedOutput = formatProductList(products, params.response_format);

      return {
        content: [{ type: "text", text: formattedOutput }],
        structuredContent: params.response_format === ResponseFormat.JSON 
          ? { products, count: products.length }
          : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error searching products: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 3: Get Single Product
server.registerTool(
  "ecommerce_get_product",
  {
    title: "Get Product Details",
    description: `Get detailed information about a specific product.

Args:
  - product_id (string): Unique product identifier (e.g., 'prod_001')
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete product information including price, stock, and description

Example:
  - Get product: { product_id: "prod_001" }`,
    inputSchema: ProductGetInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const product = db.getProductById(params.product_id);

      if (!product) {
        return {
          content: [{ type: "text", text: `Product not found: ${params.product_id}` }],
          isError: true
        };
      }

      const formattedOutput = formatProduct(product, params.response_format);

      return {
        content: [{ type: "text", text: formattedOutput }],
        structuredContent: params.response_format === ResponseFormat.JSON ? product : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error retrieving product: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 4: Create Cart
server.registerTool(
  "ecommerce_create_cart",
  {
    title: "Create Shopping Cart",
    description: `Create a new shopping cart for the customer.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  New cart with unique cart_id

Example:
  - Create cart: {}`,
    inputSchema: CartCreateInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const cart = db.createCart();
      const formattedOutput = formatCart(cart, params.response_format);

      return {
        content: [{ type: "text", text: `Cart created successfully!\n\n${formattedOutput}` }],
        structuredContent: params.response_format === ResponseFormat.JSON ? cart : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error creating cart: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 5: Get Cart
server.registerTool(
  "ecommerce_get_cart",
  {
    title: "View Shopping Cart",
    description: `View the contents of a shopping cart.

Args:
  - cart_id (string): Unique cart identifier
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Cart details including items and total amount

Example:
  - View cart: { cart_id: "cart_xxx" }`,
    inputSchema: CartGetInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const cart = db.getCart(params.cart_id);

      if (!cart) {
        return {
          content: [{ type: "text", text: `Cart not found: ${params.cart_id}` }],
          isError: true
        };
      }

      const formattedOutput = formatCart(cart, params.response_format);

      return {
        content: [{ type: "text", text: formattedOutput }],
        structuredContent: params.response_format === ResponseFormat.JSON ? cart : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error retrieving cart: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 6: Add to Cart
server.registerTool(
  "ecommerce_add_to_cart",
  {
    title: "Add Item to Cart",
    description: `Add a product to the shopping cart with specified quantity.

This tool adds items to the cart and verifies stock availability.

Args:
  - cart_id (string): Unique cart identifier
  - product_id (string): Product to add
  - quantity (number): Number of items to add (default: 1)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Updated cart with new item included

Example:
  - Add 2 headphones: { cart_id: "cart_xxx", product_id: "prod_001", quantity: 2 }

Errors:
  - "Cart not found" if cart_id doesn't exist
  - "Product not found" if product_id doesn't exist
  - "Insufficient stock" if requested quantity exceeds available stock`,
    inputSchema: CartAddItemInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const cart = db.addToCart(params.cart_id, params.product_id, params.quantity);

      if (!cart) {
        return {
          content: [{ type: "text", text: `Cart not found: ${params.cart_id}` }],
          isError: true
        };
      }

      const product = db.getProductById(params.product_id);
      const formattedOutput = formatCart(cart, params.response_format);

      return {
        content: [{ 
          type: "text", 
          text: `Added ${params.quantity}x ${product?.name || 'item'} to cart!\n\n${formattedOutput}` 
        }],
        structuredContent: params.response_format === ResponseFormat.JSON ? cart : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error adding to cart: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 7: Remove from Cart
server.registerTool(
  "ecommerce_remove_from_cart",
  {
    title: "Remove Item from Cart",
    description: `Remove a product from the shopping cart completely.

Args:
  - cart_id (string): Unique cart identifier
  - product_id (string): Product to remove
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Updated cart without the removed item

Example:
  - Remove item: { cart_id: "cart_xxx", product_id: "prod_001" }`,
    inputSchema: CartRemoveItemInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const cart = db.removeFromCart(params.cart_id, params.product_id);

      if (!cart) {
        return {
          content: [{ type: "text", text: `Cart not found: ${params.cart_id}` }],
          isError: true
        };
      }

      const formattedOutput = formatCart(cart, params.response_format);

      return {
        content: [{ 
          type: "text", 
          text: `Item removed from cart.\n\n${formattedOutput}` 
        }],
        structuredContent: params.response_format === ResponseFormat.JSON ? cart : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error removing from cart: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 8: Update Cart Item Quantity
server.registerTool(
  "ecommerce_update_cart_item",
  {
    title: "Update Cart Item Quantity",
    description: `Update the quantity of an existing item in the cart.

Args:
  - cart_id (string): Unique cart identifier
  - product_id (string): Product to update
  - quantity (number): New quantity for the item
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Updated cart with new quantity

Example:
  - Change quantity to 5: { cart_id: "cart_xxx", product_id: "prod_001", quantity: 5 }`,
    inputSchema: CartUpdateItemInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const cart = db.updateCartItemQuantity(params.cart_id, params.product_id, params.quantity);

      if (!cart) {
        return {
          content: [{ type: "text", text: `Cart not found: ${params.cart_id}` }],
          isError: true
        };
      }

      const formattedOutput = formatCart(cart, params.response_format);

      return {
        content: [{ 
          type: "text", 
          text: `Cart updated successfully!\n\n${formattedOutput}` 
        }],
        structuredContent: params.response_format === ResponseFormat.JSON ? cart : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error updating cart: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 9: Create Order (Checkout)
server.registerTool(
  "ecommerce_create_order",
  {
    title: "Create Order (Checkout)",
    description: `Complete the checkout process by creating an order from a cart.

This tool:
1. Validates stock availability
2. Creates an order with shipping and payment details
3. Updates product stock
4. Clears the cart

Args:
  - cart_id (string): Cart to convert into an order
  - shipping_address (object): Delivery address with fields:
    - full_name (string)
    - address_line1 (string)
    - address_line2 (string, optional)
    - city (string)
    - state (string)
    - postal_code (string)
    - country (string)
    - phone (string)
  - payment_details (object): Payment information with fields:
    - method ('credit_card' | 'debit_card' | 'paypal' | 'bank_transfer')
    - card_last4 (string, optional)
    - card_brand (string, optional)
    - transaction_id (string, optional)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete order details including order_id, status, and estimated delivery

Example:
  {
    cart_id: "cart_xxx",
    shipping_address: {
      full_name: "John Doe",
      address_line1: "123 Main St",
      city: "New York",
      state: "NY",
      postal_code: "10001",
      country: "US",
      phone: "+1234567890"
    },
    payment_details: {
      method: "credit_card",
      card_last4: "4242",
      card_brand: "Visa",
      transaction_id: "txn_123456"
    }
  }

Errors:
  - "Cart not found" if cart_id doesn't exist
  - "Cannot create order from empty cart" if cart has no items
  - "Insufficient stock" if any product doesn't have enough stock`,
    inputSchema: OrderCreateInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const shippingAddress = {
        fullName: params.shipping_address.full_name,
        addressLine1: params.shipping_address.address_line1,
        addressLine2: params.shipping_address.address_line2,
        city: params.shipping_address.city,
        state: params.shipping_address.state,
        postalCode: params.shipping_address.postal_code,
        country: params.shipping_address.country,
        phone: params.shipping_address.phone
      };

      const paymentDetails = {
        method: params.payment_details.method,
        cardLast4: params.payment_details.card_last4,
        cardBrand: params.payment_details.card_brand,
        transactionId: params.payment_details.transaction_id
      };

      const order = db.createOrder(params.cart_id, shippingAddress, paymentDetails);

      if (!order) {
        return {
          content: [{ type: "text", text: `Cart not found: ${params.cart_id}` }],
          isError: true
        };
      }

      const formattedOutput = formatOrder(order, params.response_format);

      return {
        content: [{ 
          type: "text", 
          text: `Order created successfully! 🎉\n\n${formattedOutput}` 
        }],
        structuredContent: params.response_format === ResponseFormat.JSON ? order : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error creating order: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 10: Get Order Details
server.registerTool(
  "ecommerce_get_order",
  {
    title: "Get Order Details",
    description: `Retrieve complete details of a specific order.

Args:
  - order_id (string): Unique order identifier
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete order information including items, shipping, payment, and status

Example:
  - Get order: { order_id: "order_xxx" }`,
    inputSchema: OrderGetInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const order = db.getOrder(params.order_id);

      if (!order) {
        return {
          content: [{ type: "text", text: `Order not found: ${params.order_id}` }],
          isError: true
        };
      }

      const formattedOutput = formatOrder(order, params.response_format);

      return {
        content: [{ type: "text", text: formattedOutput }],
        structuredContent: params.response_format === ResponseFormat.JSON ? order : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error retrieving order: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Tool 11: List All Orders
server.registerTool(
  "ecommerce_list_orders",
  {
    title: "List All Orders",
    description: `List all orders in the system.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of all orders with basic information

Example:
  - List orders: {}`,
    inputSchema: OrderListInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    try {
      const orders = db.getAllOrders();
      const formattedOutput = formatOrderList(orders, params.response_format);

      return {
        content: [{ type: "text", text: formattedOutput }],
        structuredContent: params.response_format === ResponseFormat.JSON 
          ? { orders, count: orders.length }
          : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error listing orders: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// ============================================================================
// TRANSPORT SETUP
// ============================================================================

async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

async function runHTTP() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'ecommerce-mcp-server', version: '1.0.0' });
  });

  // MCP endpoint
  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.error(`🛍️  E-commerce MCP Server running on http://localhost:${port}/mcp`);
    console.error(`📊 Health check available at http://localhost:${port}/health`);
  });
}

// Choose transport based on environment
const transport = process.env.TRANSPORT || 'http';
if (transport === 'http') {
  runHTTP().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
}