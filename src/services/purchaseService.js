import StoreKitBilling from '../../modules/store-kit';
import { IAP_PRODUCTS, PRODUCT_TO_PLAN } from '../config';
import { getSubscription, updateSubscription } from './storageService';

// The plans StoreKit knows about. A promo-code 'unlimited' grant is ours, not
// Apple's, so it is never touched by anything in this file.
const STORE_PLANS = ['monthly', 'yearly'];

/** Whether real billing is wired up in this build. */
export function isBillingAvailable() {
  return !!StoreKitBilling?.isAvailable?.();
}

/**
 * Paywall metadata straight from the App Store. Prices are already localised
 * and currency-formatted for the buyer's storefront, so prefer these over the
 * hardcoded numbers in PRICING whenever they load.
 *
 * Returns an empty array when billing is unavailable or no products exist yet
 * (which is the normal state on a free Apple team without a StoreKit config
 * selected), so callers should fall back rather than show an error.
 */
export async function getStoreProducts() {
  if (!isBillingAvailable()) return [];
  try {
    return await StoreKitBilling.getProducts(Object.values(IAP_PRODUCTS));
  } catch (e) {
    console.warn('Could not load App Store products', e);
    return [];
  }
}

/**
 * Buy a plan. Returns { status } where status is 'purchased', 'cancelled',
 * 'pending', or 'unavailable'. On success the local subscription is already
 * updated, so callers only need to react to the outcome.
 */
export async function purchasePlan(plan) {
  const productId = IAP_PRODUCTS[plan];
  if (!productId || !isBillingAvailable()) return { status: 'unavailable' };

  const result = await StoreKitBilling.purchase(productId);
  if (result?.status === 'purchased') {
    await syncEntitlements();
  }
  return result || { status: 'unknown' };
}

/**
 * Ask the App Store what this Apple ID owns and write it into local state.
 *
 * This is the whole reason StoreKit stands in for an account system: it works
 * on a fresh install and on the buyer's other devices, with no sign-in.
 */
export async function syncEntitlements() {
  if (!isBillingAvailable()) return getSubscription();
  try {
    const owned = await StoreKitBilling.getEntitlements();
    return applyEntitlements(owned);
  } catch (e) {
    // Offline, or the store is unreachable. Leave local state alone rather
    // than downgrading someone who has actually paid.
    console.warn('Could not read entitlements', e);
    return getSubscription();
  }
}

/**
 * Explicit "Restore purchases". Forces a fresh look at the App Store account,
 * which may prompt for their Apple ID password — so only call it from a button
 * the user actually pressed, never on launch.
 */
export async function restorePurchases() {
  if (!isBillingAvailable()) return { restored: false, subscription: await getSubscription() };
  const owned = await StoreKitBilling.restore();
  const subscription = await applyEntitlements(owned);
  return { restored: STORE_PLANS.includes(subscription.type), subscription };
}

/**
 * Map owned products onto our subscription shape. Exported so the entitlement
 * listener can reuse it.
 */
export async function applyEntitlements(owned) {
  const current = await getSubscription();

  // Newest wins, so an upgrade from monthly to yearly reads correctly.
  const active = (owned || [])
    .filter((e) => PRODUCT_TO_PLAN[e.productId] && !e.isUpgraded)
    .sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0))[0];

  if (active) {
    return updateSubscription({
      type: PRODUCT_TO_PLAN[active.productId],
      expiresAt: active.expiresAt ? new Date(active.expiresAt).toISOString() : null,
      promoCode: null,
    });
  }

  // Nothing owned. Only clear plans that came from the store — a promo-code
  // grant or a per-word balance is not Apple's to revoke.
  if (STORE_PLANS.includes(current.type)) {
    return updateSubscription({ type: 'free', expiresAt: null });
  }
  return current;
}

/**
 * Keep local state in step with changes made outside the app: a renewal, a
 * refund, a family-sharing change, or a purchase made on another device.
 * Returns an unsubscribe function.
 */
export function watchEntitlements(onChange) {
  if (!StoreKitBilling?.addListener) return () => {};
  const sub = StoreKitBilling.addListener('entitlementsChanged', async ({ entitlements }) => {
    const subscription = await applyEntitlements(entitlements);
    onChange?.(subscription);
  });
  return () => sub.remove();
}
