# E-Commerce MCP Server

A complete Model Context Protocol (MCP) server for e-commerce operations, enabling AI assistants to interact with your online store through a well-defined API.

## Features

This MCP server provides comprehensive e-commerce functionality:

### Product Management
- 📋 List all products or filter by category
- 🔍 Search products by name or description
- 📦 Get detailed product information

### Shopping Cart
- 🛒 Create and manage shopping carts
- ➕ Add items to cart with quantity control
- ➖ Remove items from cart
- ✏️ Update item quantities
- 👁️ View cart contents and totals

### Order Management
- 💳 Complete checkout with shipping and payment details
- 📝 Create orders from carts
- 📊 View order details and history
- 📋 List all orders

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Build the server**:
```bash
npm run build
```

3. **Run the server**:
```bash
# For HTTP server (default, accessible via URL)
npm start

# Or explicitly set transport
TRANSPORT=http npm start

# For stdio (local use)
TRANSPORT=stdio npm start
```

## Usage

### Running as HTTP Server (Recommended)

The server runs on HTTP by default, making it accessible via URL at `http://localhost:3000/mcp`.

```bash
npm start
```

**This allows others to connect to your MCP server using the URL:**
- Claude Desktop can add it via MCP settings
- Other tools can connect using the endpoint URL

### Testing the Server

Check if server is running:
```bash
curl http://localhost:3000/health
```

### Configure in Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ecommerce": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Or if running remotely:
```json
{
  "mcpServers": {
    "ecommerce": {
      "url": "https://your-server.com/mcp"
    }
  }
}
```

## Available Tools

### 1. `ecommerce_list_products`
List all products in the store, optionally filtered by category.

**Parameters:**
- `category` (optional): Filter by category name
- `response_format`: 'markdown' or 'json'

### 2. `ecommerce_search_products`
Search for products by name or description.

**Parameters:**
- `query`: Search term
- `category` (optional): Filter by category
- `response_format`: 'markdown' or 'json'

### 3. `ecommerce_get_product`
Get detailed information about a specific product.

**Parameters:**
- `product_id`: Unique product identifier
- `response_format`: 'markdown' or 'json'

### 4. `ecommerce_create_cart`
Create a new shopping cart.

**Parameters:**
- `response_format`: 'markdown' or 'json'

**Returns:** Cart ID for future operations

### 5. `ecommerce_get_cart`
View the contents of a shopping cart.

**Parameters:**
- `cart_id`: Unique cart identifier
- `response_format`: 'markdown' or 'json'

### 6. `ecommerce_add_to_cart`
Add a product to the shopping cart.

**Parameters:**
- `cart_id`: Cart identifier
- `product_id`: Product to add
- `quantity`: Number of items (default: 1)
- `response_format`: 'markdown' or 'json'

### 7. `ecommerce_remove_from_cart`
Remove a product from the cart.

**Parameters:**
- `cart_id`: Cart identifier
- `product_id`: Product to remove
- `response_format`: 'markdown' or 'json'

### 8. `ecommerce_update_cart_item`
Update the quantity of an item in the cart.

**Parameters:**
- `cart_id`: Cart identifier
- `product_id`: Product to update
- `quantity`: New quantity
- `response_format`: 'markdown' or 'json'

### 9. `ecommerce_create_order`
Complete checkout and create an order.

**Parameters:**
- `cart_id`: Cart to checkout
- `shipping_address`: Object with delivery details
  - `full_name`: Customer name
  - `address_line1`: Street address
  - `address_line2`: Apartment, suite, etc. (optional)
  - `city`: City name
  - `state`: State/Province
  - `postal_code`: ZIP/Postal code
  - `country`: Country code
  - `phone`: Contact number
- `payment_details`: Object with payment info
  - `method`: 'credit_card', 'debit_card', 'paypal', or 'bank_transfer'
  - `card_last4`: Last 4 digits (optional)
  - `card_brand`: Card brand (optional)
  - `transaction_id`: Payment transaction ID (optional)
- `response_format`: 'markdown' or 'json'

### 10. `ecommerce_get_order`
Get details of a specific order.

**Parameters:**
- `order_id`: Unique order identifier
- `response_format`: 'markdown' or 'json'

### 11. `ecommerce_list_orders`
List all orders in the system.

**Parameters:**
- `response_format`: 'markdown' or 'json'

## Example Workflow

Here's a typical customer journey:

```javascript
// 1. Browse products
ecommerce_list_products({ category: "Electronics" })

// 2. View product details
ecommerce_get_product({ product_id: "prod_001" })

// 3. Create a cart
ecommerce_create_cart({})
// Returns: { id: "cart_xxx", ... }

// 4. Add items to cart
ecommerce_add_to_cart({ 
  cart_id: "cart_xxx", 
  product_id: "prod_001", 
  quantity: 2 
})

// 5. View cart
ecommerce_get_cart({ cart_id: "cart_xxx" })

// 6. Complete checkout
ecommerce_create_order({
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
    card_brand: "Visa"
  }
})

// 7. Check order status
ecommerce_get_order({ order_id: "order_xxx" })
```

## Sample Products

The server comes pre-loaded with sample products:

1. **Wireless Headphones** (prod_001) - $299.99
2. **Smart Watch** (prod_002) - $399.99
3. **Laptop Backpack** (prod_003) - $79.99
4. **Bluetooth Speaker** (prod_004) - $149.99
5. **Ergonomic Mouse** (prod_005) - $59.99

## Customization

### Adding Real Database Support

Replace the mock database in `src/database.ts` with your actual database:

```typescript
// Example with PostgreSQL
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function getAllProducts(): Promise<Product[]> {
  const result = await pool.query('SELECT * FROM products');
  return result.rows;
}
```

### Adding Authentication

Add authentication middleware to your HTTP server:

```typescript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Deploying to Production

1. **Environment Variables**: Set `PORT` for the HTTP server
2. **HTTPS**: Use a reverse proxy (nginx, Caddy) for SSL
3. **Database**: Connect to your production database
4. **Monitoring**: Add logging and error tracking

Example deployment with environment variables:

```bash
PORT=8080 DATABASE_URL=postgres://... npm start
```

## Architecture

```
ecommerce-mcp-server/
├── src/
│   ├── index.ts          # Main MCP server with tool registrations
│   ├── types.ts          # TypeScript interfaces
│   └── database.ts       # Data layer (mock or real DB)
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Development

**Build and run in dev mode:**
```bash
npm run dev
```

**Just build:**
```bash
npm run build
```

## MCP Protocol

This server implements the Model Context Protocol (MCP), which allows AI assistants to:
- Discover available tools through the protocol
- Call tools with validated parameters
- Receive structured responses
- Handle errors gracefully

All tools include:
- ✅ Input validation with Zod schemas
- 📝 Comprehensive descriptions
- 🏷️ Proper annotations (readOnly, destructive, idempotent)
- 🔄 Structured responses in both JSON and Markdown formats

## License

MIT

## Support

For issues or questions about this MCP server:
1. Check the MCP documentation: https://modelcontextprotocol.io
2. Review the tool descriptions in the code
3. Test with the health endpoint: `/health`

## Contributing

To add new features:
1. Define types in `src/types.ts`
2. Implement data layer in `src/database.ts`
3. Register new tools in `src/index.ts` following existing patterns
4. Update this README with the new functionality