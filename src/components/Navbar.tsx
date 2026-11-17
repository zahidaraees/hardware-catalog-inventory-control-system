import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import type { ProductCategory } from '../types/store.ts';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onSelectCategory: (category: ProductCategory | 'all') => void;
  onOpenTrackInventory: (tab?: 'orders' | 'inventory') => void;
}

export function Navbar({
  cartCount,
  onOpenCart,
  onSelectCategory,
  onOpenTrackInventory,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCatalogNav = (category: ProductCategory | 'all') => {
    onSelectCategory(category);
    setMobileMenuOpen(false);
    const el = document.getElementById('catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          Kestrel Hardware
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
        >
          <button
            type="button"
            onClick={() => handleCatalogNav('all')}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => handleCatalogNav('main_systems')}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          >
            Main Systems
          </button>
          <button
            type="button"
            onClick={() => handleCatalogNav('spare_parts')}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          >
            Spare Parts
          </button>
          <button
            type="button"
            onClick={() => onOpenTrackInventory('orders')}
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          >
            Track &amp; Inventory
          </button>
        </nav>

        {/* Zone 3: 1 primary action (plus mobile menu trigger on small screens) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[40px]"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="tabular-nums">Bag ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleCatalogNav('all')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md min-h-[44px]"
          >
            All Hardware Catalog
          </button>
          <button
            type="button"
            onClick={() => handleCatalogNav('main_systems')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md min-h-[44px]"
          >
            Main Systems
          </button>
          <button
            type="button"
            onClick={() => handleCatalogNav('spare_parts')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md min-h-[44px]"
          >
            Spare Parts
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTrackInventory('orders');
            }}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md min-h-[44px]"
          >
            Track Order &amp; Live Inventory
          </button>
        </div>
      )}
    </header>
  );
}
