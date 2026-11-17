import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createInitialDatabase } from './src/data/seedData.ts';
import type {
  FeaturedReview,
  InventoryLedgerSummary,
  Order,
  OrderCustomer,
  OrderLineItem,
  PaymentMethod,
  Product,
  Review,
  StoreDatabase,
} from './src/types/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

function ensureDatabase(): StoreDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreDatabase;
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.reviews) || !Array.isArray(parsed.orders)) {
      throw new Error('Invalid store schema');
    }
    return parsed;
  } catch {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function saveDatabase(db: StoreDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function syncProductAggregates(db: StoreDatabase): void {
  for (const product of db.products) {
    const totalVariantStock = product.variants.reduce((sum, v) => sum + Math.max(0, v.stockCount), 0);
    product.stockCount = totalVariantStock;

    const productReviews = db.reviews.filter((r) => r.productId === product.id);
    product.reviewCount = productReviews.length;
    if (productReviews.length > 0) {
      const avg = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      product.rating = Number(avg.toFixed(1));
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize DB & sync computed totals
  const initialDb = ensureDatabase();
  syncProductAggregates(initialDb);
  saveDatabase(initialDb);

  // GET /api/products
  app.get('/api/products', (req, res) => {
    const db = ensureDatabase();
    syncProductAggregates(db);

    const category = typeof req.query.category === 'string' ? req.query.category : 'all';
    const subcategory = typeof req.query.subcategory === 'string' ? req.query.subcategory : 'all';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const inStockOnly = req.query.inStockOnly === 'true';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';

    let results: Product[] = db.products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (subcategory !== 'all' && p.subcategory !== subcategory) return false;
      if (inStockOnly && p.stockCount <= 0) return false;
      if (search) {
        const haystack = [
          p.name,
          p.brand,
          p.sku,
          p.subcategory,
          p.shortSpec,
          p.description,
          ...Object.values(p.specs),
          ...p.variants.map((v) => `${v.label} ${v.sku}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    if (sort === 'price_asc') {
      results = [...results].sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      results = [...results].sort((a, b) => b.price - a.price);
    } else if (sort === 'rating_desc') {
      results = [...results].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else if (sort === 'stock_desc') {
      results = [...results].sort((a, b) => b.stockCount - a.stockCount);
    } else {
      results = [...results].sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    res.json({ products: results });
  });

  // GET /api/products/:id
  app.get('/api/products/:id', (req, res) => {
    const db = ensureDatabase();
    syncProductAggregates(db);
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const reviews = db.reviews
      .filter((r) => r.productId === product.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ product, reviews });
  });

  // GET /api/reviews/featured
  app.get('/api/reviews/featured', (_req, res) => {
    const db = ensureDatabase();
    const productMap = new Map(db.products.map((p) => [p.id, p]));
    const featuredReviews: FeaturedReview[] = [...db.reviews]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((rev) => {
        const prod = productMap.get(rev.productId);
        return {
          ...rev,
          productName: prod?.name ?? 'Hardware Component',
          productSku: prod?.sku ?? 'KH-PRT',
        };
      });
    res.json({ reviews: featuredReviews });
  });

  // POST /api/reviews
  app.post('/api/reviews', (req, res) => {
    const { productId, authorName, authorRole, rating, title, comment } = req.body ?? {};

    if (
      typeof productId !== 'string' ||
      typeof authorName !== 'string' ||
      !authorName.trim() ||
      typeof title !== 'string' ||
      !title.trim() ||
      typeof comment !== 'string' ||
      !comment.trim()
    ) {
      return res.status(400).json({ error: 'Please complete all required review fields.' });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    const db = ensureDatabase();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Target product not found.' });
    }

    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      authorName: authorName.trim(),
      authorRole: typeof authorRole === 'string' && authorRole.trim() ? authorRole.trim() : 'Verified Buyer',
      rating: parsedRating,
      title: title.trim(),
      comment: comment.trim(),
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    };

    db.reviews.unshift(newReview);
    syncProductAggregates(db);
    saveDatabase(db);

    const updatedReviews = db.reviews.filter((r) => r.productId === productId);
    res.status(201).json({
      review: newReview,
      product,
      reviews: updatedReviews,
    });
  });

  // POST /api/checkout
  app.post('/api/checkout', (req, res) => {
    const body = req.body ?? {};
    const customer = body.customer as Partial<OrderCustomer> | undefined;
    const paymentMethod = body.paymentMethod as PaymentMethod | undefined;
    const cardNumber = typeof body.cardNumber === 'string' ? body.cardNumber.replace(/\s+/g, '') : '';
    const poNumber = typeof body.poNumber === 'string' ? body.poNumber.trim() : '';
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (
      !customer ||
      !customer.fullName?.trim() ||
      !customer.email?.trim() ||
      !customer.phone?.trim() ||
      !customer.address?.trim() ||
      !customer.city?.trim() ||
      !customer.postalCode?.trim()
    ) {
      return res.status(400).json({ error: 'Please provide complete shipping and contact details.' });
    }

    if (paymentMethod !== 'card' && paymentMethod !== 'cod' && paymentMethod !== 'po') {
      return res.status(400).json({ error: 'Invalid payment method selected.' });
    }

    if (paymentMethod === 'card' && cardNumber.length < 12) {
      return res.status(400).json({ error: 'Please enter a valid payment card number.' });
    }

    if (paymentMethod === 'po' && !poNumber) {
      return res.status(400).json({ error: 'Please enter your corporate Purchase Order reference.' });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty.' });
    }

    const db = ensureDatabase();
    const verifiedItems: OrderLineItem[] = [];

    // Validate stock availability across all items before decrementing
    for (const reqItem of rawItems) {
      const productId = String(reqItem?.productId ?? '');
      const variantId = String(reqItem?.variantId ?? '');
      const quantity = Number(reqItem?.quantity ?? 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item quantity requested.' });
      }

      const product = db.products.find((p) => p.id === productId);
      if (!product) {
        return res.status(404).json({ error: `Product "${productId}" is no longer available.` });
      }

      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        return res.status(404).json({ error: `Selected configuration for ${product.name} not found.` });
      }

      if (variant.stockCount < quantity) {
        return res.status(409).json({
          error: `Insufficient inventory for ${product.name} (${variant.label}). Only ${variant.stockCount} unit(s) remaining.`,
        });
      }

      const unitPrice = product.price + variant.priceDelta;
      verifiedItems.push({
        productId: product.id,
        variantId: variant.id,
        variantLabel: variant.label,
        sku: variant.sku,
        name: product.name,
        unitPrice,
        quantity,
      });
    }

    // Atomic stock decrement
    for (const line of verifiedItems) {
      const product = db.products.find((p) => p.id === line.productId)!;
      const variant = product.variants.find((v) => v.id === line.variantId)!;
      variant.stockCount -= line.quantity;
    }

    syncProductAggregates(db);

    const subtotal = verifiedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shipping = subtotal >= 250 ? 0 : 18;
    const tax = Number((subtotal * 0.08).toFixed(2));
    const total = Number((subtotal + shipping + tax).toFixed(2));

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `KH-2026-${randomDigits}`;

    const newOrder: Order = {
      orderNumber,
      createdAt: new Date().toISOString(),
      status: 'Confirmed — Preparing Shipment',
      customer: {
        fullName: customer.fullName.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        postalCode: customer.postalCode.trim(),
        country: customer.country?.trim() || 'United States',
      },
      paymentMethod,
      paymentLast4: paymentMethod === 'card' ? cardNumber.slice(-4) : undefined,
      poNumber: paymentMethod === 'po' ? poNumber : undefined,
      items: verifiedItems,
      subtotal,
      shipping,
      tax,
      total,
    };

    db.orders.unshift(newOrder);
    saveDatabase(db);

    res.status(201).json({ order: newOrder });
  });

  // GET /api/orders/:orderNumber
  app.get('/api/orders/:orderNumber', (req, res) => {
    const db = ensureDatabase();
    const target = req.params.orderNumber.trim().toUpperCase();
    const order = db.orders.find((o) => o.orderNumber.toUpperCase() === target);
    if (!order) {
      return res.status(404).json({ error: `No order found matching "${req.params.orderNumber}".` });
    }
    res.json({ order });
  });

  // GET /api/inventory
  app.get('/api/inventory', (_req, res) => {
    const db = ensureDatabase();
    syncProductAggregates(db);

    const items: InventoryLedgerSummary['items'] = [];
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValue = 0;

    for (const product of db.products) {
      for (const variant of product.variants) {
        const unitPrice = product.price + variant.priceDelta;
        const stockCount = variant.stockCount;
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (stockCount <= 0) {
          status = 'Out of Stock';
          outOfStockCount += 1;
        } else if (stockCount <= product.lowStockThreshold) {
          status = 'Low Stock';
          lowStockCount += 1;
        }

        totalUnits += stockCount;
        totalInventoryValue += stockCount * unitPrice;

        items.push({
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          productName: product.name,
          variantLabel: variant.label,
          category: product.category,
          subcategory: product.subcategory,
          unitPrice,
          stockCount,
          lowStockThreshold: product.lowStockThreshold,
          status,
        });
      }
    }

    const summary: InventoryLedgerSummary = {
      totalSkus: items.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue,
      items,
    };

    res.json(summary);
  });

  // POST /api/inventory/restock
  app.post('/api/inventory/restock', (req, res) => {
    const { productId, variantId, amount } = req.body ?? {};
    const restockQty = Number(amount ?? 5);
    if (!Number.isInteger(restockQty) || restockQty <= 0 || restockQty > 500) {
      return res.status(400).json({ error: 'Restock quantity must be between 1 and 500.' });
    }

    const db = ensureDatabase();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found.' });
    }

    variant.stockCount += restockQty;
    syncProductAggregates(db);
    saveDatabase(db);

    res.json({ ok: true, product, variant });
  });

  // Vite middleware in dev / static dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT ?? 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kestrel Hardware server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
