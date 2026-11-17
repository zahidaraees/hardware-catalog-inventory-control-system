import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  Minus,
  Plus,
  Printer,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type { CartItem, Order, PaymentMethod } from '../types/store.ts';
import { SafeImage } from './SafeImage.tsx';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, variantId: string, quantity: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onOrderCompleted: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
}

type DrawerStep = 'bag' | 'checkout' | 'confirmed';

export function CartCheckoutDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onOrderCompleted,
  onTrackOrder,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<DrawerStep>('bag');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Checkout Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [poNumber, setPoNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && step === 'confirmed' && items.length > 0) {
      setStep('bag');
    }
  }, [isOpen, items.length, step]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = items.length === 0 ? 0 : subtotal >= 250 ? 0 : 18;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  const freeShippingRemaining = Math.max(0, 250 - subtotal);

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (paymentMethod === 'card') {
      const digits = cardNumber.replace(/\s+/g, '');
      if (digits.length < 12) {
        setCheckoutError('Please enter a valid 12–16 digit payment card number.');
        return;
      }
      if (cardExpiry.length < 4 || cardCvc.length < 3) {
        setCheckoutError('Please enter a valid card expiration date and security code.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { fullName, email, phone, address, city, postalCode, country },
          paymentMethod,
          cardNumber: paymentMethod === 'card' ? cardNumber : undefined,
          poNumber: paymentMethod === 'po' ? poNumber : undefined,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout could not be completed.');
      }

      const order = data.order as Order;
      setCompletedOrder(order);
      setStep('confirmed');
      onOrderCompleted(order);
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep('bag');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag and Secure Checkout"
      onClick={handleResetAndClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => {
                  setCheckoutError(null);
                  setStep('bag');
                }}
                aria-label="Back to bag"
                className="p-1.5 -ml-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-base font-bold text-zinc-900">
              {step === 'bag'
                ? 'Shopping Bag'
                : step === 'checkout'
                  ? 'Secure Checkout'
                  : 'Order Confirmed'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close drawer"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'bag' && (
            <>
              {items.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 mx-auto flex items-center justify-center text-zinc-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-zinc-900">
                    Your hardware bag is empty
                  </h3>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    Browse main systems or certified spare parts to reserve live warehouse stock.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Free Shipping Notice */}
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                    {freeShippingRemaining === 0 ? (
                      <span>
                        <strong className="text-zinc-900">Qualifies for free insured shipping</strong>{' '}
                        (orders $250+).
                      </span>
                    ) : (
                      <span className="tabular-nums">
                        Add <strong>${freeShippingRemaining.toLocaleString()}</strong> more for free
                        insured shipping.
                      </span>
                    )}
                  </div>

                  {/* Itemized List */}
                  <ul className="divide-y divide-zinc-200">
                    {items.map((item) => (
                      <li key={`${item.productId}-${item.variantId}`} className="py-4 flex gap-4">
                        <div className="w-20 h-16 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                          <SafeImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-zinc-900 leading-snug">
                              {item.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.productId, item.variantId)}
                              aria-label={`Remove ${item.name}`}
                              className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {item.variantLabel} · <span className="font-mono">{item.sku}</span>
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="inline-flex items-center border border-zinc-300 rounded-md h-8">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    item.productId,
                                    item.variantId,
                                    item.quantity - 1
                                  )
                                }
                                aria-label="Decrease item quantity"
                                className="w-8 h-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono text-xs font-semibold text-zinc-900 tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    item.productId,
                                    item.variantId,
                                    Math.min(item.maxStock, item.quantity + 1)
                                  )
                                }
                                disabled={item.quantity >= item.maxStock}
                                aria-label="Increase item quantity"
                                className="w-8 h-full inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                              ${(item.unitPrice * item.quantity).toLocaleString()}
                            </span>
                          </div>
                          {item.quantity >= item.maxStock && (
                            <p className="text-[11px] text-amber-700 mt-1 tabular-nums">
                              Maximum available inventory reached ({item.maxStock} in stock)
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-6">
              {/* TLS Security Banner */}
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center gap-2.5 text-xs text-zinc-700">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  256-bit TLS encrypted checkout · Live inventory locks upon order confirmation.
                </span>
              </div>

              {checkoutError && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800">
                  {checkoutError}
                </div>
              )}

              {/* Shipping & Contact Information */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold text-zinc-900">
                  1. Shipping &amp; Contact Verification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (415) 555-0148"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="742 Brannan Street, Suite 400"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="San Francisco"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="94103"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3 pt-4 border-t border-zinc-200">
                <h3 className="font-display text-sm font-semibold text-zinc-900">
                  2. Payment Method
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-blue-700 bg-blue-50/50 text-blue-800 ring-1 ring-blue-700'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                      paymentMethod === 'cod'
                        ? 'border-blue-700 bg-blue-50/50 text-blue-800 ring-1 ring-blue-700'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Cash on Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('po')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                      paymentMethod === 'po'
                        ? 'border-blue-700 bg-blue-50/50 text-blue-800 ring-1 ring-blue-700'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Purchase Order</span>
                  </button>
                </div>

                {paymentMethod === 'card' && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Name on Card *
                      </label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4532 8910 2201 4419"
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Expiry (MM/YY) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          placeholder="09/29"
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          CVC *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                          placeholder="842"
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1.5">
                    <div className="font-semibold text-zinc-900">
                      Cash on Delivery (COD) Verification
                    </div>
                    <p>
                      Pay <strong className="font-mono">${total.toLocaleString()}</strong> to the
                      courier upon hardware inspection and signature. Ensure your phone number above
                      is reachable for delivery dispatch confirmation.
                    </p>
                  </div>
                )}

                {paymentMethod === 'po' && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                    <label className="block text-xs font-medium text-zinc-700">
                      Corporate / Institutional PO Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="PO-2026-ENG-094"
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Net-30 invoicing issued to your verified billing email.
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}

          {step === 'confirmed' && completedOrder && (
            <div className="space-y-6 py-2">
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    Order #{completedOrder.orderNumber} {completedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90">
                  Warehouse inventory has been reserved and decremented. A confirmation receipt has
                  been logged for {completedOrder.customer.email}.
                </p>
              </div>

              {/* Order Summary Receipt */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-sm">
                <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                  <span className="font-display font-semibold text-zinc-900">Official Receipt</span>
                  <span className="font-mono text-xs text-zinc-600">
                    {completedOrder.orderNumber}
                  </span>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  <div className="text-xs text-zinc-600 space-y-1">
                    <div className="font-semibold text-zinc-900">
                      Ship To: {completedOrder.customer.fullName}
                    </div>
                    <div>
                      {completedOrder.customer.address}, {completedOrder.customer.city}{' '}
                      {completedOrder.customer.postalCode}, {completedOrder.customer.country}
                    </div>
                    <div>Phone: {completedOrder.customer.phone}</div>
                    <div>
                      Payment:{' '}
                      {completedOrder.paymentMethod === 'card'
                        ? `Card ending in ${completedOrder.paymentLast4}`
                        : completedOrder.paymentMethod === 'cod'
                          ? 'Cash on Delivery'
                          : `Purchase Order (${completedOrder.poNumber})`}
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-3 space-y-2">
                    {completedOrder.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-medium text-zinc-900">
                            {item.quantity}x {item.name}
                          </div>
                          <div className="text-zinc-500">
                            {item.variantLabel} · <span className="font-mono">{item.sku}</span>
                          </div>
                        </div>
                        <span className="font-mono font-semibold text-zinc-900 tabular-nums shrink-0">
                          ${(item.unitPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-zinc-200 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">
                        ${completedOrder.subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Insured Shipping</span>
                      <span className="font-mono tabular-nums">
                        {completedOrder.shipping === 0
                          ? 'FREE'
                          : `$${completedOrder.shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Estimated Tax (8%)</span>
                      <span className="font-mono tabular-nums">
                        ${completedOrder.tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1.5 border-t border-zinc-100">
                      <span>Total Paid</span>
                      <span className="font-mono tabular-nums">
                        ${completedOrder.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold border border-zinc-300 text-zinc-800 hover:bg-zinc-50 rounded-lg cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTrackOrder(completedOrder.orderNumber);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-zinc-900 text-white hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  <span>Track Order Status</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Totals & Action */}
        {step !== 'confirmed' && items.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Insured Hardware Shipping</span>
                <span className="font-mono tabular-nums">
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Estimated Tax (8%)</span>
                <span className="font-mono tabular-nums">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-zinc-200">
                <span>Total</span>
                <span className="font-mono tabular-nums">${total.toLocaleString()}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Proceed to Secure Checkout</span>
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Verifying Stock & Processing...'
                    : `Complete Order — $${total.toLocaleString()}`}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
