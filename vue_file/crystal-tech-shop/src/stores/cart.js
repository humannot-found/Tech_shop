import { defineStore } from 'pinia'

const CART_STORAGE_KEY = 'crystal-shop-cart'

export function cartItemKey(item) {
  return item.variantId || `${item.productId}:${item.variant || ''}`
}

function loadCart() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(items) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Local storage is only a convenience. Checkout should still work without it.
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normaliseCartItem(product) {
  const availableQuantity =
    product.availableQuantity === undefined || product.availableQuantity === null
      ? null
      : Math.max(0, toNumber(product.availableQuantity))

  return {
    productId: String(product.productId || product.id || product.slug),
    variantId: product.variantId ? String(product.variantId) : null,
    slug: product.slug || null,
    name: product.name,
    price: toNumber(product.price),
    variant: product.variant || null,
    sku: product.sku || null,
    image: product.image || null,
    availableQuantity,
  }
}

function clampQty(qty, availableQuantity = null) {
  const desiredQty = Math.max(1, Math.floor(toNumber(qty, 1)))
  if (availableQuantity === null || availableQuantity === undefined) return desiredQty
  if (availableQuantity <= 0) return 0
  return Math.min(desiredQty, availableQuantity)
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: loadCart(),
  }),

  getters: {
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.qty, 0),

    subtotal: (state) => state.items.reduce((sum, item) => sum + item.price * item.qty, 0),
  },

  actions: {
    addItem(product, qty = 1) {
      const item = normaliseCartItem(product)
      const safeQty = clampQty(qty, item.availableQuantity)
      if (!safeQty) return

      const existing = this.items.find((i) => cartItemKey(i) === cartItemKey(item))
      if (existing) {
        existing.availableQuantity = item.availableQuantity
        existing.price = item.price
        existing.image = item.image
        existing.qty = clampQty(existing.qty + safeQty, existing.availableQuantity)
      } else {
        this.items.push({ ...item, qty: safeQty })
      }

      saveCart(this.items)
    },

    removeItem(productId, variant = null, variantId = null) {
      const targetKey = cartItemKey({ productId: String(productId), variant, variantId })
      this.items = this.items.filter((i) => cartItemKey(i) !== targetKey)
      saveCart(this.items)
    },

    updateQty(productId, qty, variant = null, variantId = null) {
      const targetKey = cartItemKey({ productId: String(productId), variant, variantId })
      const item = this.items.find((i) => cartItemKey(i) === targetKey)

      if (!item) return

      item.qty = clampQty(qty, item.availableQuantity)
      if (!item.qty) this.removeItem(productId, variant, variantId)
      else saveCart(this.items)
    },

    clearCart() {
      this.items = []
      saveCart(this.items)
    },
  },
})
