# 🚀 Quick Start Guide

Get your E-Commerce MCP server up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd ecommerce-mcp-server
npm install
```

## Step 2: Build the Server

```bash
npm run build
```

## Step 3: Start the Server

```bash
npm start
```

You should see:
```
🛍️  E-commerce MCP Server running on http://localhost:3000/mcp
📊 Health check available at http://localhost:3000/health
```

## Step 4: Test the Server

Open a new terminal and run:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "ecommerce-mcp-server",
  "version": "1.0.0"
}
```

## Step 5: Connect to Claude Desktop

1. **Find your Claude config file:**
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add the server configuration:**

```json
{
  "mcpServers": {
    "ecommerce": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

3. **Restart Claude Desktop**

## Step 6: Test in Claude

Try these commands in Claude:

```
"Show me all available products"
"Create a shopping cart for me"
"Add 2 wireless headphones to my cart"
"Complete checkout with my address"
```

## Available Tools

Your MCP server now provides these tools:

1. ✅ `ecommerce_list_products` - Browse all products
2. 🔍 `ecommerce_search_products` - Search by keyword
3. 📦 `ecommerce_get_product` - View product details
4. 🛒 `ecommerce_create_cart` - Create shopping cart
5. 👁️ `ecommerce_get_cart` - View cart contents
6. ➕ `ecommerce_add_to_cart` - Add items
7. ➖ `ecommerce_remove_from_cart` - Remove items
8. ✏️ `ecommerce_update_cart_item` - Update quantities
9. 💳 `ecommerce_create_order` - Complete checkout
10. 📝 `ecommerce_get_order` - View order details
11. 📋 `ecommerce_list_orders` - List all orders

## Common Issues

### Port Already in Use

If port 3000 is busy, use a different port:

```bash
PORT=8080 npm start
```

Then update your Claude config to use `http://localhost:8080/mcp`

### Build Errors

Make sure you have Node.js 18+ installed:

```bash
node --version
```

### Server Not Responding

Check if the server is running:

```bash
curl http://localhost:3000/health
```

## Next Steps

- **Customize Products**: Edit `src/database.ts` to add your products
- **Add Real Database**: Replace mock data with PostgreSQL, MongoDB, etc.
- **Deploy Online**: Deploy to make it accessible via public URL
- **Add Authentication**: Secure your server with API keys

## Sample Usage Flow

```javascript
// 1. List products
ecommerce_list_products({})

// 2. Create cart
ecommerce_create_cart({})
// → Returns cart_id: "cart_1234567890_abc123"

// 3. Add to cart
ecommerce_add_to_cart({
  cart_id: "cart_1234567890_abc123",
  product_id: "prod_001",
  quantity: 2
})

// 4. Checkout
ecommerce_create_order({
  cart_id: "cart_1234567890_abc123",
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
    card_brand: "Visa",
    card_last4: "4242"
  }
})
```

## Sharing Your MCP Server

To let others use your MCP server:

### Option 1: Local Network
```bash
# Find your local IP
ipconfig getifaddr en0  # macOS
hostname -I             # Linux
ipconfig               # Windows

# Share this URL
http://YOUR_IP:3000/mcp
```

### Option 2: Deploy Online

Deploy to any Node.js hosting:
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **DigitalOcean**: Deploy as app
- **AWS/GCP**: Deploy to cloud

Then share your public URL:
```
https://your-app.herokuapp.com/mcp
```

## Support

- 📖 Full documentation: See README.md
- 🐛 Issues: Check server logs in terminal
- 💬 MCP Protocol: https://modelcontextprotocol.io

Happy selling! 🛍️