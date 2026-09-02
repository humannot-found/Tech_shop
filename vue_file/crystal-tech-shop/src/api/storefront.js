const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1'

export const storefrontApiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, '')

export class StorefrontApiError extends Error {
  constructor(message, { status = null, detail = null } = {}) {
    super(message)
    this.name = 'StorefrontApiError'
    this.status = status
    this.detail = detail
  }
}

function buildUrl(path, query = {}) {
  const url = new URL(`${storefrontApiBaseUrl}${path}`, window.location.origin)

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  return url
}

function friendlyDetail(detail) {
  if (!detail) return null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || item?.detail)
      .filter(Boolean)
      .join(' ')
  }
  if (typeof detail === 'object') return detail.message || detail.detail || JSON.stringify(detail)
  return String(detail)
}

async function request(path, { method = 'GET', query, body, signal } = {}) {
  let response

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    throw new StorefrontApiError(
      'We could not reach the shop system. Please check that the backend is running.',
      { detail: error },
    )
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      friendlyDetail(data?.detail) ||
      data?.message ||
      `Request failed with HTTP ${response.status}`

    throw new StorefrontApiError(message, {
      status: response.status,
      detail: data?.detail || data,
    })
  }

  return data
}

export function listStorefrontCategories() {
  return request('/storefront/categories')
}

export function listStorefrontBrands() {
  return request('/storefront/brands')
}

export function listStorefrontProducts(params = {}) {
  return request('/storefront/products', {
    query: {
      page: params.page || 1,
      page_size: params.pageSize || 100,
      q: params.q,
      category: params.category,
      brand_id: params.brandId,
      branch_id: params.branchId,
      in_stock_only: params.inStockOnly,
    },
    signal: params.signal,
  })
}

export function getStorefrontProduct(slug, params = {}) {
  return request(`/storefront/products/${encodeURIComponent(slug)}`, {
    query: {
      branch_id: params.branchId,
    },
    signal: params.signal,
  })
}

export function createStorefrontOrder(payload) {
  return request('/storefront/orders', {
    method: 'POST',
    body: payload,
  })
}

export function getStorefrontOrder(orderNumber, phone) {
  return request(`/storefront/orders/${encodeURIComponent(orderNumber)}`, {
    query: { phone },
  })
}

export function sendStorefrontMpesaPrompt(orderNumber, phone, payload) {
  return request(`/storefront/orders/${encodeURIComponent(orderNumber)}/mpesa/stk-push`, {
    method: 'POST',
    query: { phone },
    body: payload,
  })
}

export function getStorefrontMpesaStatus(orderNumber, phone, checkoutRequestId) {
  return request(`/storefront/orders/${encodeURIComponent(orderNumber)}/mpesa/status`, {
    query: {
      phone,
      checkout_request_id: checkoutRequestId,
    },
  })
}
