import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  Search,
  ShieldCheck,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { SafeImage } from './components/SafeImage.tsx';
import { TrackInventoryModal } from './components/TrackInventoryModal.tsx';
import type {
  CartItem,
  FeaturedReview,
  Order,
  Product,
  ProductCategory,
  ProductVariant,
  Subcategory,
} from './types/store.ts';

const HERO_IMAGE = '/src/assets/images/hero_workstation_studio_1794934590021.jpg';

const SUBCATEGORIES: Array<{ label: string; value: Subcategory | 'all'; scope?: ProductCategory }> = [
  { label: 'All Categories', value: 'all' },
  { label: 'Workstations', value: 'Workstations', scope: 'main_systems' },
  { label: 'Pro Laptops', value: 'Pro Laptops', scope: 'main_systems' },
  { label: 'Processors', value: 'Processors', scope: 'spare_parts' },
  { label: 'Graphics Cards', value: 'Graphics Cards', scope: 'spare_parts' },
  { label: 'Motherboards', value: 'Motherboards', scope: 'spare_parts' },
  { label: 'Memory & Storage', value: 'Memory & Storage', scope: 'spare_parts' },
  { label: 'Power & Cooling', value: 'Power & Cooling', scope: 'spare_parts' },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredReviews, setFeaturedReviews] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Catalog Filters
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [subcategory, setSubcategory] = useState<Subcategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  // Modals & Drawers
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackModalTab, setTrackModalTab] = useState<'orders' | 'inventory'>('orders');
  const [trackOrderNumber, setTrackOrderNumber] = useState<string | undefined>(undefined);

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kestrel_cart_v1');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [recentOrderNumbers, setRecentOrderNumbers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kestrel_orders_v1');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_orders_v1', JSON.stringify(recentOrderNumbers));
    } catch {
      // ignore storage errors
    }
  }, [recentOrderNumbers]);

  const loadCatalogAndReviews = useCallback(async () => {
    try {
      const [prodRes, revRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/reviews/featured'),
      ]);
      if (!prodRes.ok) throw new Error('Unable to load hardware catalog.');
      const prodData = (await prodRes.json()) as { products: Product[] };
      setProducts(prodData.products);

      if (revRes.ok) {
        const revData = (await revRes.json()) as { reviews: FeaturedReview[] };
        setFeaturedReviews(revData.reviews);
      }
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to fetch catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogAndReviews();
  }, [loadCatalogAndReviews]);

  const showToast = (msg: string) => {
    setBannerMessage(msg);
    window.setTimeout(() => {
      setBannerMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  // Keep cart maxStock synced with latest server inventory
  useEffect(() => {
    if (products.length === 0) return;
    setCart((prev) =>
      prev
        .map((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const variant = prod?.variants.find((v) => v.id === item.variantId);
          if (!prod || !variant || variant.stockCount <= 0) return null;
          return {
            ...item,
            maxStock: variant.stockCount,
            quantity: Math.min(item.quantity, variant.stockCount),
            unitPrice: prod.price + variant.priceDelta,
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, [products]);

  const handleSelectCategory = (nextCat: ProductCategory | 'all') => {
    setCategory(nextCat);
    if (nextCat !== 'all') {
      const activeSub = SUBCATEGORIES.find((s) => s.value === subcategory);
      if (activeSub?.scope && activeSub.scope !== nextCat) {
        setSubcategory('all');
      }
    }
  };

  const handleAddToCart = (
    product: Product,
    variant: ProductVariant,
    quantity: number
  ): boolean => {
    if (variant.stockCount <= 0) return false;

    let added = false;
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.variantId === variant.id
      );
      if (existing) {
        const nextQty = Math.min(variant.stockCount, existing.quantity + quantity);
        if (nextQty === existing.quantity) {
          showToast(`Maximum available stock (${variant.stockCount}) already in bag.`);
          return prev;
        }
        added = true;
        return prev.map((i) =>
          i.productId === product.id && i.variantId === variant.id
            ? { ...i, quantity: nextQty, maxStock: variant.stockCount }
            : i
        );
      }

      added = true;
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant.id,
          variantLabel: variant.label,
          sku: variant.sku,
          name: product.name,
          image: product.image,
          unitPrice: product.price + variant.priceDelta,
          quantity: Math.min(quantity, variant.stockCount),
          maxStock: variant.stockCount,
        },
      ];
    });

    if (added) {
      showToast(`Added ${product.name} to your bag.`);
    }
    return added;
  };

  const handleQuickAdd = (product: Product): boolean => {
    const firstAvailable =
      product.variants.find((v) => v.stockCount > 0) ?? product.variants[0];
    if (!firstAvailable) return false;
    return handleAddToCart(product, firstAvailable, 1);
  };

  const handleUpdateQuantity = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity: Math.min(item.maxStock, quantity) }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
    );
  };

  const handleOrderCompleted = (order: Order) => {
    setCart([]);
    setRecentOrderNumbers((prev) => [order.orderNumber, ...prev.filter((n) => n !== order.orderNumber)]);
    loadCatalogAndReviews();
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (subcategory !== 'all' && p.subcategory !== subcategory) return false;
      if (inStockOnly && p.stockCount <= 0) return false;
      if (query) {
        const haystack = [
          p.name,
          p.brand,
          p.sku,
          p.subcategory,
          p.shortSpec,
          ...Object.values(p.specs),
          ...p.variants.map((v) => `${v.label} ${v.sku}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price_desc') return [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'rating_desc')
      return [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    if (sortBy === 'stock_desc') return [...list].sort((a, b) => b.stockCount - a.stockCount);
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [products, category, subcategory, inStockOnly, searchQuery, sortBy]);

  const visibleSubcategories = SUBCATEGORIES.filter(
    (s) => s.value === 'all' || category === 'all' || s.scope === category
  );

  const totalUnitsAvailable = useMemo(
    () => products.reduce((sum, p) => sum + p.stockCount, 0),
    [products]
  );

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-neutral-50 text-zinc-900">
      <Navbar
        cartCount={totalCartItems}
        onOpenCart={() => setCartOpen(true)}
        onSelectCategory={handleSelectCategory}
        onOpenTrackInventory={(tab = 'orders') => {
          setTrackModalTab(tab);
          setTrackModalOpen(true);
        }}
      />

      {/* Quiet Toast Feedback */}
      {bannerMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 max-w-sm bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-lg border border-zinc-800 flex items-center justify-between gap-3 text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            aria-label="Dismiss notification"
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1">
        {/* SECTION 1: Storefront Hero */}
        <section className="bg-white border-b border-zinc-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              {/* Hero Copy */}
              <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                <div className="text-xs font-medium text-zinc-500 flex items-center gap-2">
                  <span>Workstations</span>
                  <span aria-hidden="true">·</span>
                  <span>Certified Spare Parts</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-zinc-700 tabular-nums">
                    {totalUnitsAvailable} units ready
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-zinc-900 leading-[1.1] [text-wrap:balance]">
                  Engineered computers and serial-verified spare parts.
                </h1>

                <p className="text-base text-zinc-600 leading-relaxed max-w-xl">
                  Configure ready-to-deploy workstations and mobile systems, or order factory-tested
                  processors, graphics cards, motherboards, and NVMe storage with real-time
                  warehouse inventory tracking.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="#catalog"
                    onClick={() => handleSelectCategory('main_systems')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <span>Shop Main Systems</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#catalog"
                    onClick={() => handleSelectCategory('spare_parts')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <span>Browse Spare Parts</span>
                  </a>
                </div>
              </div>

              {/* Hero Studio Visual */}
              <div className="lg:col-span-7">
                <div className="aspect-[16/9] lg:aspect-auto lg:h-full min-h-[260px] rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100">
                  <SafeImage
                    src={HERO_IMAGE}
                    alt="Kestrel anodized aluminum workstation tower alongside modular computer graphics card, copper cooler, processor, and NVMe storage"
                    fallbackLabel="Kestrel Workstation & Component Studio"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Hardware Assurance Strip below Hero Split */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-10 pt-8 border-t border-zinc-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>24-Hour Dispatch</span>
                </div>
                <p className="text-xs text-zinc-600">
                  Free insured courier shipping on hardware orders $250+.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Cpu className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Serial-Verified Parts</span>
                </div>
                <p className="text-xs text-zinc-600">
                  Direct-from-OEM components packed in ESD-safe shielding.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Layers className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Live Stock Ledger</span>
                </div>
                <p className="text-xs text-zinc-600">
                  Atomic inventory counts update on every verified checkout.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Encrypted Checkout</span>
                </div>
                <p className="text-xs text-zinc-600">
                  Supports Card, Cash on Delivery, and Corporate POs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Categorized Hardware Catalog & Live Inventory Grid */}
        <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                Hardware Catalog
              </h2>
              <p className="text-sm text-zinc-600 mt-1">
                Filter across complete computer systems and individual replacement spare parts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTrackModalTab('inventory');
                setTrackModalOpen(true);
              }}
              className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>View Warehouse Inventory Ledger</span>
            </button>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 mb-8 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Primary Category Switcher */}
              <div
                role="tablist"
                aria-label="Hardware scope"
                className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-lg self-start"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === 'all'}
                  onClick={() => handleSelectCategory('all')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    category === 'all'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  All Hardware
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === 'main_systems'}
                  onClick={() => handleSelectCategory('main_systems')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    category === 'main_systems'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Main Systems
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === 'spare_parts'}
                  onClick={() => handleSelectCategory('spare_parts')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    category === 'spare_parts'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Spare Parts
                </button>
              </div>

              {/* Search, In-Stock Filter & Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-2xl justify-end">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SKU, CPU socket, GPU, or model..."
                    aria-label="Search hardware catalog"
                    className="w-full pl-10 pr-3 py-2 text-sm bg-neutral-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 min-h-[40px]"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer whitespace-nowrap shrink-0 px-2">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-700 focus:ring-blue-700"
                  />
                  <span>In Stock Only</span>
                </label>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort hardware"
                  className="px-3 py-2 text-xs font-medium bg-neutral-50 border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-700 min-h-[40px]"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Top Rated</option>
                  <option value="stock_desc">Highest Stock</option>
                </select>
              </div>
            </div>

            {/* Subcategory Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-zinc-100 pb-1">
              {visibleSubcategories.map((sub) => {
                const active = subcategory === sub.value;
                return (
                  <button
                    key={sub.value}
                    type="button"
                    onClick={() => setSubcategory(sub.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-zinc-200 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-zinc-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-1/2 bg-zinc-200 rounded" />
                    <div className="h-5 w-4/5 bg-zinc-200 rounded" />
                    <div className="h-3 w-full bg-zinc-100 rounded" />
                    <div className="h-8 w-full bg-zinc-100 rounded mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="p-8 rounded-xl bg-white border border-red-200 text-center space-y-3">
              <p className="text-sm text-red-700 font-medium">{loadError}</p>
              <button
                type="button"
                onClick={loadCatalogAndReviews}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg cursor-pointer"
              >
                Retry Loading Catalog
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 rounded-xl bg-white border border-zinc-200 text-center space-y-3">
              <h3 className="font-display text-base font-semibold text-zinc-900">
                No matching hardware found
              </h3>
              <p className="text-sm text-zinc-600 max-w-md mx-auto">
                No systems or spare parts matched your active search and inventory filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategory('all');
                  setSubcategory('all');
                  setSearchQuery('');
                  setInStockOnly(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={(p) => setSelectedProductId(p.id)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: Verified Customer Reviews & Proof */}
        <section
          id="reviews"
          className="bg-white border-t border-b border-zinc-200 py-12 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                  Verified Customer Reviews
                </h2>
                <p className="text-sm text-zinc-600 mt-1">
                  Field reports from engineering teams, studios, and hardware repair technicians.
                </p>
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                Select any product in the catalog to publish a review
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredReviews.map((rev) => (
                <article
                  key={rev.id}
                  className="p-6 rounded-xl bg-neutral-50 border border-zinc-200 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">{rev.productSku}</span>
                    </div>

                    <h3 className="font-display text-sm font-bold text-zinc-900 leading-snug">
                      {rev.title}
                    </h3>

                    <p className="text-sm text-zinc-600 leading-relaxed">“{rev.comment}”</p>
                  </div>

                  <div className="pt-4 border-t border-zinc-200 space-y-1.5">
                    <div className="text-xs font-semibold text-zinc-900">{rev.authorName}</div>
                    <div className="text-xs text-zinc-500">{rev.authorRole}</div>
                    <button
                      type="button"
                      onClick={() => setSelectedProductId(rev.productId)}
                      className="text-xs font-medium text-blue-700 hover:underline underline-offset-4 cursor-pointer text-left pt-1"
                    >
                      Inspect {rev.productName}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 4: Quiet Footer */}
      <footer className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-display text-base font-bold text-zinc-900">Kestrel Hardware</div>
            <p className="text-xs text-zinc-500 mt-1">
              Computer Systems &amp; Certified Spare Parts · San Francisco Warehouse Dispatch
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-600">
            <a
              href="#catalog"
              onClick={() => handleSelectCategory('main_systems')}
              className="hover:text-zinc-900"
            >
              Main Systems
            </a>
            <a
              href="#catalog"
              onClick={() => handleSelectCategory('spare_parts')}
              className="hover:text-zinc-900"
            >
              Spare Parts
            </a>
            <button
              type="button"
              onClick={() => {
                setTrackModalTab('orders');
                setTrackModalOpen(true);
              }}
              className="hover:text-zinc-900 cursor-pointer"
            >
              Order Lookup
            </button>
            <button
              type="button"
              onClick={() => {
                setTrackModalTab('inventory');
                setTrackModalOpen(true);
              }}
              className="hover:text-zinc-900 cursor-pointer"
            >
              Live Inventory Ledger
            </button>
            <span className="text-zinc-400">© {new Date().getFullYear()} Kestrel Hardware</span>
          </div>
        </div>
      </footer>

      {/* Product Detail & Review Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onAddToCart={handleAddToCart}
        onProductUpdated={loadCatalogAndReviews}
      />

      {/* Shopping Bag & Secure Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onOrderCompleted={handleOrderCompleted}
        onTrackOrder={(orderNumber) => {
          setTrackOrderNumber(orderNumber);
          setTrackModalTab('orders');
          setTrackModalOpen(true);
        }}
      />

      {/* Order Lookup & Live Inventory Ledger Modal */}
      <TrackInventoryModal
        isOpen={trackModalOpen}
        initialTab={trackModalTab}
        initialOrderNumber={trackOrderNumber}
        recentOrderNumbers={recentOrderNumbers}
        onClose={() => setTrackModalOpen(false)}
        onInventoryChanged={loadCatalogAndReviews}
      />
    </div>
  );
}
