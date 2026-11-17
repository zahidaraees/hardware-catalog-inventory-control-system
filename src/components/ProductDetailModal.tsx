import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import type { Product, ProductVariant, Review } from '../types/store.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => boolean;
  onProductUpdated: () => void;
}

export function ProductDetailModal({
  productId,
  onClose,
  onAddToCart,
  onProductUpdated,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Write a Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setReviews([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuantity(1);
    setAddedFeedback(false);
    setShowReviewForm(false);
    setReviewSuccess(false);

    fetch(`/api/products/${encodeURIComponent(productId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load product specifications.');
        return res.json() as Promise<{ product: Product; reviews: Review[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setProduct(data.product);
        setReviews(data.reviews);
        const firstAvailable =
          data.product.variants.find((v) => v.stockCount > 0) ?? data.product.variants[0];
        setSelectedVariantId(firstAvailable?.id ?? '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load product.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [productId, onClose]);

  if (!productId) return null;

  const selectedVariant =
    product?.variants.find((v) => v.id === selectedVariantId) ?? product?.variants[0];
  const unitPrice = product ? product.price + (selectedVariant?.priceDelta ?? 0) : 0;
  const variantStock = selectedVariant?.stockCount ?? 0;
  const isOutOfStock = variantStock <= 0;
  const isLowStock = product ? variantStock > 0 && variantStock <= product.lowStockThreshold : false;

  const handleAdd = () => {
    if (!product || !selectedVariant || isOutOfStock) return;
    const ok = onAddToCart(product, selectedVariant, quantity);
    if (ok) {
      setAddedFeedback(true);
      window.setTimeout(() => setAddedFeedback(false), 1600);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setReviewSubmitting(true);
    setReviewError(null);
    setReviewSuccess(false);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          authorName,
          authorRole,
          rating,
          title,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not publish review.');
      }

      setProduct(data.product);
      setReviews(data.reviews);
      setAuthorName('');
      setAuthorRole('');
      setRating(5);
      setTitle('');
      setComment('');
      setShowReviewForm(false);
      setReviewSuccess(true);
      onProductUpdated();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, pct };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-0 sm:p-4 lg:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white sm:rounded-2xl shadow-2xl border border-zinc-200 max-h-full sm:max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-zinc-200 bg-white shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500 truncate">
            <span>{product?.category === 'main_systems' ? 'Main Systems' : 'Spare Parts'}</span>
            <span aria-hidden="true">/</span>
            <span>{product?.subcategory ?? 'Hardware'}</span>
            {selectedVariant && (
              <>
                <span aria-hidden="true">/</span>
                <span className="font-mono text-zinc-700">{selectedVariant.sku}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 pb-24 lg:pb-8">
          {loading ? (
            <div className="py-20 text-center text-sm text-zinc-500">
              Loading technical specifications and live inventory...
            </div>
          ) : error || !product ? (
            <div className="py-20 text-center">
              <p className="text-sm text-red-700 mb-4">{error || 'Product unavailable.'}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg"
              >
                Return to Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Contiguous 2-Column Purchase Module */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Image + Specs */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="aspect-[4/3] w-full bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200">
                    <SafeImage
                      src={product.image}
                      alt={product.name}
                      fallbackLabel={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Technical Specifications Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200">
                      <h3 className="font-display text-sm font-semibold text-zinc-900">
                        Technical Specifications
                      </h3>
                    </div>
                    <dl className="divide-y divide-zinc-100 text-sm">
                      {Object.entries(product.specs).map(([key, value]) => (
                        <div
                          key={key}
                          className="grid grid-cols-3 gap-3 px-4 py-2.5 bg-white"
                        >
                          <dt className="text-zinc-500 font-medium">{key}</dt>
                          <dd className="col-span-2 text-zinc-900 font-mono text-xs sm:text-[13px] self-center">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                {/* Right Column: Contiguous Purchase Module */}
                <div className="lg:col-span-6 lg:sticky lg:top-0 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                      <span className="font-semibold text-zinc-800">{product.brand}</span>
                      <span aria-hidden="true">·</span>
                      <span>{product.subcategory}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-zinc-800 font-medium tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                      </span>
                    </div>

                    <h2
                      id="pdp-title"
                      className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight leading-tight mb-3"
                    >
                      {product.name}
                    </h2>

                    <div className="flex items-baseline gap-4 mb-4">
                      <span className="font-mono text-2xl font-bold text-zinc-900 tabular-nums">
                        ${unitPrice.toLocaleString()}
                      </span>
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Out of stock for this configuration</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 tabular-nums">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Low inventory: {variantStock} unit(s) remaining</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 tabular-nums">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{variantStock} unit(s) in stock · Ships within 24h</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
                  </div>

                  {/* Variant Selector */}
                  <div className="space-y-2.5 pt-4 border-t border-zinc-200">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Configuration / Edition
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {product.variants.map((variant) => {
                        const active = variant.id === selectedVariant?.id;
                        const variantPrice = product.price + variant.priceDelta;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariantId(variant.id);
                              setQuantity(1);
                            }}
                            className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-blue-700 bg-blue-50/50 ring-1 ring-blue-700'
                                : 'border-zinc-200 bg-white hover:border-zinc-300'
                            }`}
                          >
                            <span className="text-sm font-semibold text-zinc-900">
                              {variant.label}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono tabular-nums mt-0.5">
                              ${variantPrice.toLocaleString()} ·{' '}
                              {variant.stockCount > 0
                                ? `${variant.stockCount} available`
                                : 'Out of stock'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity & Primary Add to Bag */}
                  <div className="hidden lg:flex items-center gap-3 pt-2">
                    <div className="inline-flex items-center border border-zinc-300 rounded-lg bg-white h-11">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={isOutOfStock || quantity <= 1}
                        aria-label="Decrease quantity"
                        className="w-10 h-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(variantStock, q + 1))}
                        disabled={isOutOfStock || quantity >= variantStock}
                        aria-label="Increase quantity"
                        className="w-10 h-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={isOutOfStock}
                      className={`flex-1 h-11 px-6 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        isOutOfStock
                          ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                          : addedFeedback
                            ? 'bg-emerald-700 text-white'
                            : 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                      }`}
                    >
                      {isOutOfStock
                        ? 'Currently Out of Stock'
                        : addedFeedback
                          ? 'Added to Bag'
                          : `Add to Bag — $${(unitPrice * quantity).toLocaleString()}`}
                    </button>
                  </div>

                  {/* Compatibility & Warranty */}
                  <div className="pt-4 border-t border-zinc-200 space-y-3 text-xs text-zinc-600">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-900">Warranty: </span>
                        {product.warranty}
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Truck className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-900">Fulfillment: </span>
                        Free insured courier shipping on orders $250+. Anti-static ESD packaging.
                      </div>
                    </div>
                    {product.compatibility.length > 0 && (
                      <div className="pt-2">
                        <div className="font-semibold text-zinc-900 mb-1.5">
                          Compatibility Notes
                        </div>
                        <ul className="space-y-1 list-disc list-inside text-zinc-600">
                          {product.compatibility.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Verified Customer Reviews Section */}
              <div className="pt-8 border-t border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-display text-lg font-bold text-zinc-900">
                      Customer Reviews
                    </h3>
                    <p className="text-sm text-zinc-600 mt-0.5 tabular-nums">
                      Average rating {product.rating.toFixed(1)} out of 5 across {reviews.length}{' '}
                      verified review{reviews.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm((v) => !v)}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
                  >
                    {showReviewForm ? 'Cancel Review' : 'Write a Customer Review'}
                  </button>
                </div>

                {reviewSuccess && (
                  <div className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Your review has been published and product ratings updated.</span>
                  </div>
                )}

                {/* Write Review Form */}
                {showReviewForm && (
                  <form
                    onSubmit={handleSubmitReview}
                    className="mb-8 p-5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-4"
                  >
                    <h4 className="font-display text-sm font-semibold text-zinc-900">
                      Submit Verified Hardware Feedback
                    </h4>
                    {reviewError && (
                      <p className="text-xs text-red-700 font-medium">{reviewError}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          placeholder="e.g. Jordan Hayes"
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Role or Organization
                        </label>
                        <input
                          type="text"
                          value={authorRole}
                          onChange={(e) => setAuthorRole(e.target.value)}
                          placeholder="e.g. Systems Engineer, Apex Studio"
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Rating *
                        </label>
                        <div className="flex items-center gap-1 h-10">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => setRating(starVal)}
                              aria-label={`Rate ${starVal} out of 5 stars`}
                              className="p-1.5 rounded hover:bg-zinc-200 transition-colors cursor-pointer"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  starVal <= rating
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-zinc-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Review Headline *
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Summarize performance, thermals, or fitment"
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Detailed Review *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share workload benchmarks, installation notes, or build quality feedback..."
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="px-5 py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {reviewSubmitting ? 'Publishing...' : 'Publish Review'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Rating Breakdown */}
                  <div className="lg:col-span-4 space-y-2.5">
                    {ratingCounts.map((row) => (
                      <div key={row.stars} className="flex items-center gap-3 text-xs">
                        <span className="w-10 font-mono text-zinc-700 tabular-nums shrink-0">
                          {row.stars} ★
                        </span>
                        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-zinc-500 tabular-nums">
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Review Feed */}
                  <div className="lg:col-span-8 divide-y divide-zinc-200 border-t lg:border-t-0 border-zinc-200">
                    {reviews.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-4">
                        No reviews yet for this unit. Be the first to share a hardware report.
                      </p>
                    ) : (
                      reviews.map((rev) => (
                        <div key={rev.id} className="py-4 first:pt-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < rev.rating
                                        ? 'fill-amber-500 text-amber-500'
                                        : 'text-zinc-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <h4 className="text-sm font-semibold text-zinc-900">{rev.title}</h4>
                            </div>
                            <span className="text-xs text-zinc-400 font-mono tabular-nums">
                              {new Date(rev.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 leading-relaxed mb-2">
                            {rev.comment}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="font-medium text-zinc-800">{rev.authorName}</span>
                            <span aria-hidden="true">·</span>
                            <span>{rev.authorRole}</span>
                            {rev.verifiedPurchase && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700 font-medium">
                                  Verified Buyer
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Buy Bar */}
        {product && (
          <div className="lg:hidden sticky bottom-0 inset-x-0 bg-white border-t border-zinc-200 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-500 truncate max-w-[140px]">
                {selectedVariant?.label}
              </div>
              <div className="font-mono text-base font-bold text-zinc-900 tabular-nums">
                ${(unitPrice * quantity).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg min-h-[44px] whitespace-nowrap ${
                isOutOfStock
                  ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                  : addedFeedback
                    ? 'bg-emerald-700 text-white'
                    : 'bg-blue-700 text-white'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : addedFeedback ? 'Added to Bag' : 'Add to Bag'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
