<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStorefrontProduct } from '@/api/storefront'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cartStore = useCartStore()

const product = ref(null)
const loading = ref(true)
const loadError = ref('')
const activeImage = ref(0)
const selectedVariantId = ref(null)
const qty = ref(1)
const addedFeedback = ref(false)

const productImages = computed(() => product.value?.images?.map((image) => image.url).filter(Boolean) || [])

const selectedVariant = computed(() => {
  if (!product.value?.variants?.length) return null

  return (
    product.value.variants.find((variant) => variant.id === selectedVariantId.value) ||
    product.value.variants.find((variant) => variant.is_available) ||
    product.value.variants[0]
  )
})

const currentPrice = computed(() =>
  Number(selectedVariant.value?.selling_price ?? product.value?.starting_price ?? 0),
)

const availableQuantity = computed(() =>
  Number(selectedVariant.value?.available_quantity ?? product.value?.available_quantity ?? 0),
)

const inStock = computed(() =>
  Boolean(product.value?.is_available && selectedVariant.value?.is_available && availableQuantity.value > 0),
)

const featureList = computed(() => {
  if (!product.value) return []

  return [
    product.value.warranty_months
      ? `${product.value.warranty_months} month warranty support`
      : 'Warranty details confirmed by the shop',
    'Availability comes directly from live branch stock',
    'Online checkout supports M-Pesa payment prompts',
    'Staff can reserve, prepare and fulfil the order from the internal system',
  ]
})

function toTitle(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function variantName(variant) {
  if (!variant) return ''
  if (variant.name && variant.name !== '{}') return variant.name

  const attributes = Object.entries(variant.attributes || {})
    .map(([key, value]) => `${toTitle(key)}: ${value}`)
    .join(', ')

  return attributes || variant.sku || 'Standard'
}

function selectVariant(variant) {
  selectedVariantId.value = variant.id
  qty.value = 1
}

function incrementQty() {
  if (!inStock.value) return
  qty.value = Math.min(qty.value + 1, availableQuantity.value)
}

function decrementQty() {
  qty.value = Math.max(1, qty.value - 1)
}

function addToCart() {
  if (!product.value || !selectedVariant.value || !inStock.value) return

  cartStore.addItem(
    {
      productId: product.value.id,
      variantId: selectedVariant.value.id,
      slug: product.value.slug,
      name: product.value.name,
      price: currentPrice.value,
      variant: variantName(selectedVariant.value),
      sku: selectedVariant.value.sku,
      image: productImages.value[activeImage.value] || productImages.value[0] || null,
      availableQuantity: availableQuantity.value,
    },
    qty.value,
  )

  addedFeedback.value = true
  setTimeout(() => {
    addedFeedback.value = false
  }, 1800)
}

function formatKES(amount) {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE')
}

async function loadProduct() {
  loading.value = true
  loadError.value = ''
  activeImage.value = 0
  selectedVariantId.value = null
  qty.value = 1

  try {
    const data = await getStorefrontProduct(route.params.id)
    product.value = data
    selectedVariantId.value =
      data.variants?.find((variant) => variant.is_available)?.id || data.variants?.[0]?.id || null
  } catch (error) {
    product.value = null
    loadError.value = error.message || 'This product could not be loaded right now.'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, loadProduct, { immediate: true })
</script>

<template>
  <div class="product-page">
    <div v-if="loading" class="product-state">
      <p>Loading product from the shop system...</p>
    </div>

    <div v-else-if="loadError" class="product-state error">
      <p>{{ loadError }}</p>
      <RouterLink to="/shop" class="state-link">Back to Shop</RouterLink>
    </div>

    <div v-else-if="product" class="product-inner">
      <p class="breadcrumb">
        Home / Shop / {{ product.category_name || 'Products' }} / <span>{{ product.name }}</span>
      </p>

      <div class="product-layout">
        <div class="gallery">
          <div class="main-image">
            <span v-if="!inStock" class="badge">Out of stock</span>
            <img v-if="productImages.length" :src="productImages[activeImage]" :alt="product.name" />
            <div v-else class="image-placeholder" aria-hidden="true">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          </div>

          <div v-if="productImages.length > 1" class="thumb-row">
            <button
              v-for="(img, i) in productImages"
              :key="`${product.id}-${i}`"
              class="thumb"
              :class="{ active: activeImage === i }"
              :aria-label="`Show ${product.name} image ${i + 1}`"
              @click="activeImage = i"
            >
              <img :src="img" :alt="`${product.name} thumbnail ${i + 1}`" />
            </button>
          </div>
        </div>

        <div class="info">
          <p class="brand-line">{{ product.brand_name || 'Crystal Tech' }}</p>
          <h1>{{ product.name }}</h1>

          <div class="rating-row">
            <span v-if="product.warranty_months" class="rating-value">
              {{ product.warranty_months }} months warranty
            </span>
            <span v-if="selectedVariant?.sku" class="review-count">SKU {{ selectedVariant.sku }}</span>
          </div>

          <div class="price-row">
            <span class="price">{{ formatKES(currentPrice) }}</span>
          </div>

          <p class="stock-line" :class="{ out: !inStock }">
            <span class="stock-dot"></span>
            {{ inStock ? `${availableQuantity} available online` : 'Out of Stock' }}
          </p>

          <p class="description">
            {{ product.description || 'A genuine Crystal Tech item connected to live branch stock.' }}
          </p>

          <div v-if="product.variants?.length" class="variant-group">
            <h4>Choose option</h4>
            <div class="variant-options">
              <button
                v-for="variant in product.variants"
                :key="variant.id"
                class="variant-pill"
                :class="{ active: selectedVariant?.id === variant.id }"
                :disabled="!variant.is_available"
                @click="selectVariant(variant)"
              >
                {{ variantName(variant) }}
                <small>{{ formatKES(variant.selling_price) }}</small>
              </button>
            </div>
          </div>

          <div class="purchase-row">
            <div class="qty-control">
              <button aria-label="Decrease quantity" @click="decrementQty">-</button>
              <span>{{ qty }}</span>
              <button
                aria-label="Increase quantity"
                :disabled="!inStock || qty >= availableQuantity"
                @click="incrementQty"
              >
                +
              </button>
            </div>

            <button
              class="add-to-cart-btn"
              :class="{ added: addedFeedback }"
              :disabled="!inStock"
              @click="addToCart"
            >
              <span v-if="!addedFeedback">{{ inStock ? 'Add to Cart' : 'Unavailable' }}</span>
              <span v-else>Added</span>
            </button>

            <button class="wishlist-btn" aria-label="Add to wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
            </button>
          </div>

          <ul class="feature-list">
            <li v-for="f in featureList" :key="f">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ f }}
            </li>
          </ul>

          <div class="trust-mini-row">
            <span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <rect x="1" y="6" width="14" height="11" />
                <path d="M15 9h4l3 3v5h-7z" />
                <circle cx="6" cy="19" r="2" />
                <circle cx="17.5" cy="19" r="2" />
              </svg>
              Delivery confirmed by shop staff
            </span>
            <span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" />
              </svg>
              100% genuine, warranty covered
            </span>
            <span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Pay via M-Pesa
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 72px;
}

.product-state {
  display: flex;
  min-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  text-align: center;
}

.product-state.error {
  color: #b3392c;
}

.state-link {
  border-radius: 6px;
  background: #17181c;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  margin-top: 14px;
  padding: 11px 18px;
  text-decoration: none;
  text-transform: uppercase;
}

.state-link:hover {
  background: #ee6c1f;
}

.breadcrumb {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  margin: 0 0 28px;
}

.breadcrumb span {
  color: #17181c;
  font-weight: 600;
}

.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
}

.main-image {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #f2f1ef;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #c9c7c3;
}

.badge,
.discount-badge {
  position: absolute;
  top: 14px;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 5px;
  z-index: 2;
}

.badge {
  left: 14px;
  background: #ee6c1f;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.discount-badge {
  right: 14px;
  background: #17181c;
}

.thumb-row {
  display: flex;
  gap: 10px;
}

.thumb {
  width: 68px;
  height: 68px;
  border-radius: 8px;
  background: #f2f1ef;
  border: 2px solid transparent;
  cursor: pointer;
  overflow: hidden;
  padding: 0;
}

.thumb.active {
  border-color: #ee6c1f;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-line {
  color: #ee6c1f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

h1 {
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 400;
  line-height: 1.25;
  margin: 0 0 14px;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.stars {
  display: flex;
  gap: 2px;
}

.rating-value {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
}

.review-count {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.price {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 26px;
  font-weight: 700;
}

.old-price {
  color: #a5a3a0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 15px;
  text-decoration: line-through;
}

.stock-line {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #1a7d3d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 20px;
}

.stock-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22a854;
}

.stock-line.out {
  color: #b3392c;
}

.stock-line.out .stock-dot {
  background: #d64536;
}

.description {
  color: #4a4a4d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 24px;
}

.variant-group {
  margin-bottom: 22px;
}

.variant-group h4 {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0 0 10px;
  text-transform: uppercase;
}

.variant-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.variant-pill {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #e1dfdc;
  background: #fff;
  color: #17181c;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
}

.variant-pill small {
  color: inherit;
  font-size: 10.5px;
  font-weight: 700;
  opacity: 0.72;
}

.variant-pill.active {
  background: #17181c;
  color: #fff;
  border-color: #17181c;
}

.variant-pill:disabled {
  color: #a5a3a0;
  cursor: not-allowed;
  opacity: 0.6;
}

.purchase-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 26px;
}

.qty-control {
  display: flex;
  align-items: center;
  border: 1px solid #e1dfdc;
  border-radius: 6px;
  overflow: hidden;
}

.qty-control button {
  width: 36px;
  height: 42px;
  background: #fff;
  border: none;
  color: #17181c;
  cursor: pointer;
  font-size: 16px;
}

.qty-control button:hover {
  background: #f2f1ef;
}

.qty-control button:disabled {
  color: #c9c7c3;
  cursor: not-allowed;
}

.qty-control span {
  width: 34px;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  font-weight: 600;
}

.add-to-cart-btn {
  flex: 1;
  height: 42px;
  background: #17181c;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: background 0.15s ease;
}

.add-to-cart-btn:hover {
  background: #ee6c1f;
}

.add-to-cart-btn:disabled {
  background: #c9c7c3;
  cursor: not-allowed;
}

.add-to-cart-btn.added {
  background: #22a854;
}

.wishlist-btn {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  border: 1px solid #e1dfdc;
  background: #fff;
  color: #17181c;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.wishlist-btn:hover {
  color: #ee6c1f;
  border-color: #ee6c1f;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #e1dfdc;
  margin: 0 0 20px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2c2d31;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
}

.feature-list li svg {
  color: #ee6c1f;
  flex: 0 0 auto;
}

.trust-mini-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid #e1dfdc;
}

.trust-mini-row span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
}

.trust-mini-row svg {
  color: #ee6c1f;
  flex: 0 0 auto;
}

@media (max-width: 860px) {
  .product-page {
    padding: 26px 18px 56px;
  }

  .product-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 560px) {
  .purchase-row {
    align-items: stretch;
    flex-direction: column;
  }

  .wishlist-btn,
  .add-to-cart-btn {
    width: 100%;
  }

  .qty-control {
    width: fit-content;
  }
}
</style>
