import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Plus, Star, XCircle } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => boolean;
}

export function ProductCard({ product, onSelectProduct, onQuickAdd }: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const isOutOfStock = product.stockCount <= 0;
  const isLowStock = product.stockCount > 0 && product.stockCount <= product.lowStockThreshold;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const added = onQuickAdd(product);
    if (added) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1400);
    }
  };

  return (
    <article
      onClick={() => onSelectProduct(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectProduct(product);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${product.name}`}
      className="group flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer text-left"
    >
      {/* 4:3 Studio Product Backdrop */}
      <div className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden border-b border-zinc-100">
        <SafeImage
          src={product.image}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Unboxed metadata line */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 truncate">
          <span className="font-medium text-zinc-700">{product.brand}</span>
          <span aria-hidden="true">·</span>
          <span>{product.subcategory}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[11px]">{product.sku}</span>
        </div>

        {/* Title */}
        <h3 className="font-display text-base font-semibold text-zinc-900 leading-snug mb-1.5 group-hover:text-blue-700 transition-colors">
          {product.name}
        </h3>

        {/* Concise Spec */}
        <p className="text-xs text-zinc-600 line-clamp-2 mb-4 leading-relaxed">
          {product.shortSpec}
        </p>

        {/* Rating + Explicit Stock Status */}
        <div className="mt-auto pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs mb-4">
          <div className="flex items-center gap-1 text-zinc-700 font-medium tabular-nums">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-zinc-400">({product.reviewCount})</span>
          </div>

          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 font-medium text-red-700 tabular-nums">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Out of stock</span>
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 tabular-nums">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Low stock: {product.stockCount} left</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{product.stockCount} in stock</span>
            </span>
          )}
        </div>

        {/* Aligned Price & Action Baseline */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-mono text-lg font-semibold text-zinc-900 tabular-nums">
              ${product.price.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              isOutOfStock
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : justAdded
                  ? 'bg-emerald-700 text-white'
                  : 'bg-zinc-900 text-white hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {isOutOfStock ? (
              <span>Unavailable</span>
            ) : justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
