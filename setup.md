# Complete E-Commerce MCP Server Setup Guide

## 📦 What You Got

A fully functional MCP (Model Context Protocol) server for e-commerce operations that can be accessed via URL. This allows anyone (including AI assistants like Claude) to interact with your store through a standardized protocol.

## 🎯 What It Does

Your MCP server provides 11 complete e-commerce tools:

### Product Management
- List all products (with category filtering)
- Search products by keyword
- Get detailed product information

### Shopping Cart
- Create new shopping carts
- View cart contents
- Add items to cart
- Remove items from cart
- Update item quantities

### Order Processing
- Complete checkout with shipping address
- Process payment details
- Create orders
- View order history
- Track order status

## 🚀 Setup Instructions

### Prerequisites

You need Node.js 18 or higher installed. Check your version:

```bash
node --version
```

If you don't have Node.js, download it from: https://nodejs.org/

### Installation

1. **Navigate to the project folder:**

```bash
cd ecommerce-mcp-server
```

2. **Install dependencies:**

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `express` - HTTP server
- `zod` - Input validation
- `typescript` - TypeScript compiler

3. **Build the TypeScript code:**

```bash
npm run build
```

This compiles TypeScript files from `src/` into JavaScript in `dist/`

4. **Start the server:**

```bash
npm start
```

You should see:
```
🛍️  E-commerce MCP Server running on http://localhost:3000/mcp
📊 Health check available at http://localhost:3000/health
```

## 🔗 Making It Accessible via URL

### Local Network Access

Your server is now running at `http://localhost:3000/mcp` - this is the URL others can use to connect to your MCP server!

To share on your local network:

1. **Find your local IP address:**

```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

2. **Share the URL:**

Instead of `localhost`, use your IP:
```
http://192.168.1.100:3000/mcp
```

Anyone on your network can now add this URL to their MCP client!

### Public Internet Access (Deployment)

To make your MCP server accessible from anywhere on the internet, deploy it to a hosting service:

#### Option 1: Railway (Easiest)

1. Sign up at https://railway.app
2. Create new project from GitHub
3. Railway auto-detects and deploys Node.js
4. Get your public URL: `https://your-app.railway.app/mcp`

#### Option 2: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-ecommerce-mcp

# Deploy
git push heroku main

# Your URL: https://your-ecommerce-mcp.herokuapp.com/mcp
```

#### Option 3: DigitalOcean/AWS/GCP

Deploy as a Node.js application and expose port 3000. Use nginx as reverse proxy for HTTPS.

## 🔧 How Others Can Use Your MCP Server

### For Claude Desktop Users

Users add your MCP server URL to their Claude Desktop config:

**Location of config file:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Add this configuration:**

```json
{
  "mcpServers": {
    "your-ecommerce-store": {
      "url": "http://YOUR_SERVER_URL:3000/mcp",
      "description": "E-commerce store with products, cart, and checkout"
    }
  }
}
```

Replace `YOUR_SERVER_URL` with:
- `localhost` (if running locally)
- Your local IP (if on same network)
- Your public domain (if deployed online)

### For Developers

Developers can use your MCP server in their applications:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/http.js';

const transport = new StreamableHTTPClientTransport({
  url: 'http://your-server.com:3000/mcp'
});

const client = new Client({
  name: 'my-app',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'ecommerce_list_products',
  arguments: { category: 'Electronics' }
});
```

## 📋 Testing Your MCP Server

### 1. Health Check

Test if server is running:

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

### 2. MCP Inspector (Official Testing Tool)

Install and run the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

This opens a web interface where you can:
- See all available tools
- Test each tool with different parameters
- View responses in real-time

### 3. Example Tool Call

Using curl to call a tool directly:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "ecommerce_list_products",
      "arguments": {}
    }
  }'
```

## 🛠️ Customization

### Adding Your Own Products

Edit `src/database.ts` and add products to the `productsDB` Map:

```typescript
['prod_006', {
  id: 'prod_006',
  name: 'Your Product Name',
  description: 'Product description',
  price: 99.99,
  currency: 'USD',
  category: 'Your Category',
  stock: 50,
  sku: 'PROD-SKU',
  imageUrl: 'https://example.com/image.jpg'
}]
```

Then rebuild:
```bash
npm run build
npm start
```

### Connecting Real Database

Replace mock database in `src/database.ts`:

#### PostgreSQL Example

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function getAllProducts(): Promise<Product[]> {
  const result = await pool.query('SELECT * FROM products');
  return result.rows;
}

export async function getProductById(id: string): Promise<Product | null> {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] || null;
}
```

#### MongoDB Example

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db('ecommerce');

export async function getAllProducts(): Promise<Product[]> {
  return db.collection<Product>('products').find().toArray();
}
```

### Adding Authentication

Protect your MCP server with API keys:

```typescript
// In src/index.ts, add middleware
app.use('/mcp', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
});
```

Users then provide the API key in their config:

```json
{
  "mcpServers": {
    "ecommerce": {
      "url": "http://your-server.com:3000/mcp",
      "headers": {
        "x-api-key": "your-secret-key"
      }
    }
  }
}
```

### Changing Port

Set the PORT environment variable:

```bash
PORT=8080 npm start
```

Or create `.env` file:
```
PORT=8080
```

## 🔒 Security Considerations

### For Production Deployment:

1. **Use HTTPS**: Always use SSL/TLS in production
   - Use Let's Encrypt for free certificates
   - Use a reverse proxy (nginx, Caddy)

2. **Add Authentication**: Implement API key or OAuth

3. **Rate Limiting**: Prevent abuse
   ```bash
   npm install express-rate-limit
   ```

4. **Input Validation**: Already implemented with Zod schemas

5. **CORS**: Configure allowed origins
   ```bash
   npm install cors
   ```

6. **Environment Variables**: Never commit `.env` files

7. **Database Security**: Use connection pooling, prepared statements

8. **Logging**: Add request logging
   ```bash
   npm install morgan
   ```

## 📊 Monitoring

### View Server Logs

The server logs to console. View logs:

```bash
# If running in foreground
# Just watch the terminal

# If running in background (production)
pm2 logs ecommerce-mcp-server
```

### Health Monitoring

Set up health check monitoring:

```bash
# Simple check every 5 minutes
watch -n 300 curl http://localhost:3000/health
```

Or use monitoring services:
- Uptime Robot
- Pingdom
- DataDog

## 🐛 Troubleshooting

### Server Won't Start

**Error: "Port already in use"**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or use different port
PORT=8080 npm start
```

**Error: "Cannot find module"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Build Errors

**Error: "TypeScript compilation failed"**
```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
rm -rf dist
npm run build
```

### Connection Issues

**Can't connect from other devices:**
1. Check firewall settings
2. Verify server is running on 0.0.0.0, not 127.0.0.1
3. Confirm IP address is correct

## 📚 Additional Resources

- **MCP Protocol Documentation**: https://modelcontextprotocol.io
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Claude Desktop**: https://claude.ai/desktop
- **Express.js**: https://expressjs.com
- **Zod Validation**: https://zod.dev

## 🎓 Example Usage Scenarios

### Scenario 1: Browse and Purchase

```javascript
// 1. Customer browses products
ecommerce_list_products({ category: "Electronics" })

// 2. Customer views product details
ecommerce_get_product({ product_id: "prod_001" })

// 3. Create shopping cart
ecommerce_create_cart({})
// Returns: cart_id

// 4. Add items
ecommerce_add_to_cart({
  cart_id: "cart_xxx",
  product_id: "prod_001",
  quantity: 2
})

// 5. Complete checkout
ecommerce_create_order({
  cart_id: "cart_xxx",
  shipping_address: { /* address details */ },
  payment_details: { /* payment details */ }
})
```

### Scenario 2: Search and Compare

```javascript
// Search for specific items
ecommerce_search_products({ query: "wireless" })

// Compare products
ecommerce_get_product({ product_id: "prod_001" })
ecommerce_get_product({ product_id: "prod_004" })
```

### Scenario 3: Order Tracking

```javascript
// View all orders
ecommerce_list_orders({})

// Get specific order details
ecommerce_get_order({ order_id: "order_xxx" })
```

## 🚀 Production Checklist

Before deploying to production:

- [ ] Connect to real database
- [ ] Add authentication
- [ ] Enable HTTPS
- [ ] Configure CORS
- [ ] Add rate limiting
- [ ] Set up error logging
- [ ] Configure environment variables
- [ ] Add health monitoring
- [ ] Test all tools thoroughly
- [ ] Document API for users
- [ ] Set up backup strategy
- [ ] Configure auto-scaling (if needed)

## 💡 Tips for Success

1. **Start Simple**: Use the mock database first, then add real database later
2. **Test Locally**: Always test with MCP Inspector before sharing
3. **Document Well**: Keep your README updated with any customizations
4. **Secure Early**: Add authentication before making it public
5. **Monitor Always**: Set up logging and monitoring from day one

## 🎉 You're Ready!

Your MCP server is now:
- ✅ Built and ready to run
- ✅ Accessible via URL
- ✅ Fully documented
- ✅ Production-ready (with security additions)

Share your MCP server URL with others and they can start using your e-commerce store through AI assistants!

Need help? Check the README.md and QUICKSTART.md files for more details.

Happy building! 🛍️