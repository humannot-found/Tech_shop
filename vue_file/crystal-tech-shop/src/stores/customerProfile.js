import { defineStore } from 'pinia'

const PROFILE_STORAGE_KEY = 'crystal-shop-customer-profile'
const ORDERS_STORAGE_KEY = 'crystal-shop-recent-orders'

function safeLocalStorageGet(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeLocalStorageSet(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Browser storage is a convenience layer; the backend remains the source of truth.
  }
}

function cleanString(value) {
  return String(value || '').trim()
}

function normaliseProfile(payload = {}) {
  return {
    fullName: cleanString(payload.fullName),
    phone: cleanString(payload.phone),
    email: cleanString(payload.email),
    county: cleanString(payload.county),
    deliveryAddress: cleanString(payload.deliveryAddress),
    deliveryMethod: payload.deliveryMethod === 'delivery' ? 'delivery' : 'pickup',
  }
}

function normaliseOrder(order, phone = '') {
  return {
    orderNumber: order.order_number,
    phone: cleanString(phone || order.customer?.phone),
    status: order.status,
    fulfillmentStatus: order.fulfillment_status,
    totalAmount: Number(order.total_amount || 0),
    balanceDue: Number(order.balance_due || 0),
    createdAt: order.created_at || new Date().toISOString(),
  }
}

export const useCustomerProfileStore = defineStore('customerProfile', {
  state: () => ({
    profile: normaliseProfile(safeLocalStorageGet(PROFILE_STORAGE_KEY, {})),
    recentOrders: safeLocalStorageGet(ORDERS_STORAGE_KEY, []),
  }),

  getters: {
    hasProfile: (state) => Boolean(state.profile.fullName || state.profile.phone || state.profile.email),
    defaultPhone: (state) => state.profile.phone || state.recentOrders[0]?.phone || '',
  },

  actions: {
    updateProfile(payload) {
      this.profile = normaliseProfile({ ...this.profile, ...payload })
      safeLocalStorageSet(PROFILE_STORAGE_KEY, this.profile)
    },

    rememberOrder(order, phone = '') {
      if (!order?.order_number) return

      const saved = normaliseOrder(order, phone)
      this.recentOrders = [
        saved,
        ...this.recentOrders.filter((item) => item.orderNumber !== saved.orderNumber),
      ].slice(0, 8)
      safeLocalStorageSet(ORDERS_STORAGE_KEY, this.recentOrders)
    },

    forgetOrder(orderNumber) {
      this.recentOrders = this.recentOrders.filter((item) => item.orderNumber !== orderNumber)
      safeLocalStorageSet(ORDERS_STORAGE_KEY, this.recentOrders)
    },

    clearProfile() {
      this.profile = normaliseProfile()
      safeLocalStorageSet(PROFILE_STORAGE_KEY, this.profile)
    },
  },
})
