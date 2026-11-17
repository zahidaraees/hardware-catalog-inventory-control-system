import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type { InventoryLedgerSummary, Order } from '../types/store.ts';

interface TrackInventoryModalProps {
  isOpen: boolean;
  initialTab: 'orders' | 'inventory';
  initialOrderNumber?: string;
  recentOrderNumbers: string[];
  onClose: () => void;
  onInventoryChanged: () => void;
}

export function TrackInventoryModal({
  isOpen,
  initialTab,
  initialOrderNumber,
  recentOrderNumbers,
  onClose,
  onInventoryChanged,
}: TrackInventoryModalProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>(initialTab);

  // Order lookup state
  const [orderQuery, setOrderQuery] = useState(initialOrderNumber || 'KH-2026-1042');
  const [orderResult, setOrderResult] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Live inventory state
  const [ledger, setLedger] = useState<InventoryLedgerSummary | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [restockingKey, setRestockingKey] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialOrderNumber) {
      setOrderQuery(initialOrderNumber);
      setActiveTab('orders');
    }
  }, [initialOrderNumber]);

  const fetchOrder = async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) return;
    setOrderLoading(true);
    setOrderError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order not found.');
      setOrderResult(data.order);
    } catch (err: unknown) {
      setOrderResult(null);
      setOrderError(err instanceof Error ? err.message : 'Unable to locate order.');
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchInventory = async () => {
    setLedgerLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = (await res.json()) as InventoryLedgerSummary;
      setLedger(data);
    } catch {
      // handled quietly
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'orders') {
      fetchOrder(orderQuery);
    } else {
      fetchInventory();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleRestock = async (productId: string, variantId: string) => {
    const key = `${productId}:${variantId}`;
    setRestockingKey(key);
    try {
      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, amount: 5 }),
      });
      if (res.ok) {
        await fetchInventory();
        onInventoryChanged();
      }
    } finally {
      setRestockingKey(null);
    }
  };

  if (!isOpen) return null;

  const quickOrderOptions = Array.from(new Set([...recentOrderNumbers, 'KH-2026-1042']));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-0 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Order Lookup and Live Inventory Ledger"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white sm:rounded-2xl shadow-2xl border border-zinc-200 max-h-full sm:max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Segmented Tabs */}
        <div className="px-5 sm:px-8 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Order Lookup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Live Inventory Ledger
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          {activeTab === 'orders' ? (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-900 mb-1">
                  Verify Order Status &amp; Receipt
                </h2>
                <p className="text-sm text-zinc-600">
                  Enter an order number to inspect warehouse fulfillment status and itemized SKUs.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchOrder(orderQuery);
                }}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="e.g. KH-2026-1042"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={orderLoading}
                  className="px-5 py-2.5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {orderLoading ? 'Looking up...' : 'Look Up Order'}
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>Recent orders:</span>
                {quickOrderOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setOrderQuery(num);
                      fetchOrder(num);
                    }}
                    className="font-mono text-zinc-800 underline underline-offset-4 hover:text-blue-700 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {orderError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                  {orderError}
                </div>
              )}

              {orderResult && (
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-bold text-zinc-900">
                        Order #{orderResult.orderNumber}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Placed{' '}
                        {new Date(orderResult.createdAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <Package className="w-4 h-4" />
                      <span>{orderResult.status}</span>
                    </span>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                    <div className="space-y-1.5 text-xs text-zinc-600">
                      <div className="font-semibold text-zinc-900 text-sm mb-2">
                        Delivery Destination
                      </div>
                      <div className="font-medium text-zinc-900">
                        {orderResult.customer.fullName}
                      </div>
                      <div>{orderResult.customer.address}</div>
                      <div>
                        {orderResult.customer.city}, {orderResult.customer.postalCode} ·{' '}
                        {orderResult.customer.country}
                      </div>
                      <div>{orderResult.customer.email}</div>
                      <div>{orderResult.customer.phone}</div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-zinc-900 text-sm mb-2">
                        Itemized Hardware ({orderResult.items.length})
                      </div>
                      {orderResult.items.map((line) => (
                        <div
                          key={`${line.productId}-${line.variantId}`}
                          className="flex justify-between gap-2 pb-2 border-b border-zinc-100"
                        >
                          <div>
                            <div className="font-medium text-zinc-900">
                              {line.quantity}x {line.name}
                            </div>
                            <div className="text-zinc-500 font-mono">
                              {line.variantLabel} · {line.sku}
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                            ${(line.unitPrice * line.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 text-sm font-bold text-zinc-900">
                        <span>Total</span>
                        <span className="font-mono tabular-nums">
                          ${orderResult.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-900 mb-1">
                  Live Warehouse Inventory Ledger
                </h2>
                <p className="text-sm text-zinc-600">
                  Real-time SKU stock levels across main systems and certified spare parts.
                  Checkout orders decrement these figures atomically.
                </p>
              </div>

              {ledgerLoading && !ledger ? (
                <div className="py-12 text-center text-sm text-zinc-500">
                  Loading warehouse inventory...
                </div>
              ) : ledger ? (
                <>
                  {/* KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="text-xs text-zinc-500 mb-1">Active SKUs</div>
                      <div className="font-mono text-2xl font-bold text-zinc-900 tabular-nums">
                        {ledger.totalSkus}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="text-xs text-zinc-500 mb-1">Units On Hand</div>
                      <div className="font-mono text-2xl font-bold text-zinc-900 tabular-nums">
                        {ledger.totalUnits}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="text-xs text-zinc-500 mb-1">Low / Out Alerts</div>
                      <div className="font-mono text-2xl font-bold text-amber-700 tabular-nums">
                        {ledger.lowStockCount + ledger.outOfStockCount}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="text-xs text-zinc-500 mb-1">Stock Valuation</div>
                      <div className="font-mono text-2xl font-bold text-zinc-900 tabular-nums">
                        ${ledger.totalInventoryValue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Inventory Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
                          <th className="py-3 px-4 font-semibold">SKU</th>
                          <th className="py-3 px-4 font-semibold">Hardware &amp; Edition</th>
                          <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                          <th className="py-3 px-4 font-semibold text-right">On Hand</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Replenish</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {ledger.items.map((row) => (
                          <tr key={row.sku} className="hover:bg-zinc-50/70">
                            <td className="py-3 px-4 font-mono text-zinc-700 whitespace-nowrap">
                              {row.sku}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-zinc-900">{row.productName}</div>
                              <div className="text-zinc-500">
                                {row.variantLabel} · {row.subcategory}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-zinc-900 tabular-nums">
                              ${row.unitPrice.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-900 tabular-nums">
                              {row.stockCount}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {row.status === 'Out of Stock' ? (
                                <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Out of Stock</span>
                                </span>
                              ) : row.status === 'Low Stock' ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Low Stock</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>In Stock</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                disabled={restockingKey === `${row.productId}:${row.variantId}`}
                                onClick={() => handleRestock(row.productId, row.variantId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 rounded-md cursor-pointer disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Restock 5</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
