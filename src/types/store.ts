export type ProductCategory = 'main_systems' | 'spare_parts';

export type Subcategory =
  | 'Workstations'
  | 'Pro Laptops'
  | 'Processors'
  | 'Graphics Cards'
  | 'Motherboards'
  | 'Memory & Storage'
  | 'Power & Cooling';

export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  priceDelta: number;
  stockCount: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  subcategory: Subcategory;
  price: number;
  stockCount: number;
  lowStockThreshold: number;
  image: string;
  shortSpec: string;
  description: string;
  warranty: string;
  specs: Record<string, string>;
  compatibility: string[];
  variants: ProductVariant[];
  featured: boolean;
  rating: number;
  reviewCount: number;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  authorRole: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface FeaturedReview extends Review {
  productName: string;
  productSku: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export type PaymentMethod = 'card' | 'cod' | 'po';

export interface OrderCustomer {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderLineItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  orderNumber: string;
  createdAt: string;
  status: 'Confirmed — Preparing Shipment' | 'Quality Check Passed' | 'Dispatched';
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
  paymentLast4?: string;
  poNumber?: string;
  items: OrderLineItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface InventoryLedgerSummary {
  totalSkus: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  items: Array<{
    productId: string;
    variantId: string;
    sku: string;
    productName: string;
    variantLabel: string;
    category: ProductCategory;
    subcategory: Subcategory;
    unitPrice: number;
    stockCount: number;
    lowStockThreshold: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  }>;
}

export interface StoreDatabase {
  products: Product[];
  reviews: Review[];
  orders: Order[];
}
