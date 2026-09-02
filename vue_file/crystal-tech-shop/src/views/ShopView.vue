<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  listStorefrontBrands,
  listStorefrontCategories,
  listStorefrontProducts,
} from '@/api/storefront'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cartStore = useCartStore()

const MAX_PRICE = 500000

const categories = ref([])
const brands = ref([])
const allProducts = ref([])
const loading = ref(true)
const loadError = ref('')
const cartNotice = ref('')
let noticeTimer = null

const dealFilters = {
  speakers: {
    label: 'Speaker Deals',
    matches: (product) =>
      product.name.toLowerCase().includes('speaker') && ['JBL', 'Anker'].includes(product.brand),
  },
  clearance: {
    label: 'Clearance Deals',
    matches: (product) => Boolean(product.oldPrice),
  },
  'phone-bundle': {
    label: 'Phone Bundle',
    matches: (product) => product.category === 'Phones',
  },
  new: {
    label: 'New Arrivals',
    matches: (product) => product.badge === 'New' || product.badge === 'Few left',
  },
}

function routeValue(value) {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : null
  return value ? String(value) : null
}

function toTitle(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normaliseSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeCategoryParam(value) {
  const raw = routeValue(value)
  if (!raw) return null

  const slug = normaliseSlug(raw)
  const match = categories.value.find(
    (category) => category.slug === slug || normaliseSlug(category.name) === slug,
  )

  return match?.name || toTitle(raw)
}

const selectedCategory = ref(normalizeCategoryParam(route.params.category))
const selectedBrand = ref(routeValue(route.query.brand))
const maxPrice = ref(MAX_PRICE)
const sortBy = ref('featured')
const mobileFiltersOpen = ref(false)
const searchQuery = ref('')

const categoryDescriptions = {
  Computers: 'Laptops, desktops, printers and accessories for work, school and everything in between.',
  Laptops: 'Portable performance for school, business and creative work.',
  Phones: 'Smartphones, bundles and mobile accessories ready for daily use.',
  Accessories: 'Mice, chargers, adapters and extras that complete your setup.',
  Audio: 'Speakers, headphones and earbuds - genuine, warrantied, and picked for real listening.',
  Gaming: 'Controllers, consoles and gaming gear for every kind of player.',
  'Power & Networking':
    'Routers, power banks, generators and everything that keeps you connected and charged.',
  Repairs: 'Repair tools, parts and helpful essentials for device maintenance.',
  'Lifestyle & Home': 'Cameras, smart home devices and everyday tech for around the house.',
}

const categoryList = computed(() => {
  const names = categories.value.map((category) => category.name).filter(Boolean)
  if (names.length) return names

  return [...new Set(allProducts.value.map((product) => product.category).filter(Boolean))]
})

const brandList = computed(() => {
  const names = brands.value.map((brand) => brand.name).filter(Boolean)
  if (names.length) return names

  return [...new Set(allProducts.value.map((product) => product.brand).filter(Boolean))]
})

watch(
  () => route.params.category,
  (val) => {
    selectedCategory.value = normalizeCategoryParam(val)
  },
)

watch(
  () => route.query.brand,
  (val) => {
    selectedBrand.value = routeValue(val)
  },
)

function toggleCategory(cat) {
  selectedCategory.value = selectedCategory.value === cat ? null : cat
}

function toggleBrand(brand) {
  selectedBrand.value = selectedBrand.value === brand ? null : brand
}

function clearFilters() {
  selectedCategory.value = null
  selectedBrand.value = null
  maxPrice.value = MAX_PRICE
  searchQuery.value = ''
}

function pickDisplayVariant(product) {
  return product.variants?.find((variant) => variant.is_available) || product.variants?.[0] || null
}

function formatVariantName(variant) {
  if (!variant) return ''
  if (variant.name && variant.name !== '{}') return variant.name

  const attributes = Object.entries(variant.attributes || {})
    .map(([key, value]) => `${toTitle(key)}: ${value}`)
    .join(', ')

  return attributes || variant.sku || 'Standard'
}

function productBadge(product, variant) {
  if (!product.is_available || !variant?.is_available) return 'Out of stock'
  if (Number(variant.available_quantity || 0) > 0 && Number(variant.available_quantity || 0) <= 3) {
    return 'Few left'
  }
  return null
}

function mapStorefrontProduct(product) {
  const variant = pickDisplayVariant(product)
  const price = Number(variant?.selling_price ?? product.starting_price ?? 0)
  const availableQuantity = Number(variant?.available_quantity ?? product.available_quantity ?? 0)

  return {
    id: product.slug || product.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price,
    oldPrice: null,
    category: product.category_name || 'Uncategorised',
    categorySlug: product.category_slug || null,
    brand: product.brand_name || 'Crystal Tech',
    badge: productBadge(product, variant),
    image: product.images?.[0]?.url || null,
    variantId: variant?.id || null,
    variant: formatVariantName(variant),
    sku: variant?.sku || null,
    availableQuantity,
    inStock: Boolean(product.is_available && variant?.is_available && availableQuantity > 0),
  }
}

async function loadShopData() {
  loading.value = true
  loadError.value = ''

  try {
    const [categoryData, brandData, productPage] = await Promise.all([
      listStorefrontCategories(),
      listStorefrontBrands(),
      listStorefrontProducts({ pageSize: 100, inStockOnly: false }),
    ])

    categories.value = categoryData
    brands.value = brandData
    allProducts.value = productPage.items.map(mapStorefrontProduct)
    selectedCategory.value = normalizeCategoryParam(route.params.category)
  } catch (error) {
    loadError.value = error.message || 'Catalog products could not be loaded right now.'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  let list = allProducts.value.filter((p) => p.price <= maxPrice.value)

  if (selectedDeal.value) {
    list = list.filter(selectedDeal.value.matches)
  } else if (isDealsRoute.value) {
    list = list.filter((p) => p.oldPrice || p.badge === 'Deal' || p.badge === 'Few left')
  }

  if (selectedCategory.value) list = list.filter((p) => p.category === selectedCategory.value)
  if (selectedBrand.value) list = list.filter((p) => p.brand === selectedBrand.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((p) =>
      [p.name, p.brand, p.category, p.sku].some((value) => String(value || '').toLowerCase().includes(q)),
    )
  }

  if (sortBy.value === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))

  return list
})

const activeFilterCount = computed(() =>
  (selectedCategory.value ? 1 : 0) + (selectedBrand.value ? 1 : 0),
)

const activeDealSlug = computed(() => {
  const queryFilter = routeValue(route.query.filter)
  if (queryFilter) return queryFilter.toLowerCase()
  if (route.name === 'deals') return routeValue(route.params.slug)?.toLowerCase() || null
  return null
})

const isDealsRoute = computed(() => route.name === 'deals')
const selectedDeal = computed(() => (activeDealSlug.value ? dealFilters[activeDealSlug.value] : null))

const pageTitle = computed(() => {
  if (selectedDeal.value) return selectedDeal.value.label
  if (isDealsRoute.value) return 'Current Deals'
  if (selectedCategory.value) return selectedCategory.value
  if (selectedBrand.value) return `${selectedBrand.value} Products`
  if (route.name === 'brands') return 'Shop by Brand'
  return 'All Products'
})

const breadcrumbTrail = computed(() => {
  if (selectedDeal.value) return `Home / Deals / ${selectedDeal.value.label}`
  if (isDealsRoute.value) return 'Home / Deals'
  if (selectedCategory.value) return `Home / Shop / ${selectedCategory.value}`
  if (selectedBrand.value) return `Home / Shop / ${selectedBrand.value}`
  if (route.name === 'brands') return 'Home / Brands'
  return 'Home / Shop'
})

function formatKES(amount) {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE')
}

function showCartNotice(message) {
  cartNotice.value = message
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    cartNotice.value = ''
  }, 2200)
}

function quickAdd(product) {
  if (!product.inStock || !product.variantId) {
    showCartNotice('That item is not available for online checkout right now.')
    return
  }

  cartStore.addItem(
    {
      productId: product.productId,
      variantId: product.variantId,
      slug: product.slug,
      name: product.name,
      price: product.price,
      variant: product.variant,
      sku: product.sku,
      image: product.image,
      availableQuantity: product.availableQuantity,
    },
    1,
  )
  showCartNotice(`${product.name} added to cart.`)
}

onMounted(loadShopData)
</script>

<template>
  <div class="shop-page">
    <!-- Welcome banner -->
    <section class="welcome-banner">
      <div class="welcome-inner">
        <template v-if="selectedDeal">
          <p class="welcome-eyebrow">CURRENT PROMOTION</p>
          <h2>{{ selectedDeal.label }}</h2>
          <p class="welcome-sub">Browse this selected Crystal Tech offer and add your pick to cart.</p>
        </template>
        <template v-else-if="selectedCategory && categoryDescriptions[selectedCategory]">
          <p class="welcome-eyebrow">YOU'RE BROWSING</p>
          <h2>{{ selectedCategory }}</h2>
          <p class="welcome-sub">{{ categoryDescriptions[selectedCategory] }}</p>
        </template>
        <template v-else>
          <p class="welcome-eyebrow">WELCOME TO CRYSTAL TECH SHOP</p>
          <h2>Shop with us - genuine electronics, real support, delivered fast.</h2>
          <p class="welcome-sub">Browse the full catalog below, or use the filters to find exactly what you need.</p>
        </template>

        <div class="banner-search">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Search products, brands, categories..." />
        </div>

        <!-- Quick category chips -->
        <div class="quick-chips">
          <button
            v-for="c in categoryList"
            :key="c"
            class="chip"
            :class="{ active: selectedCategory === c }"
            @click="toggleCategory(c)"
          >
            {{ c }}
          </button>
        </div>
      </div>
    </section>

    <!-- Trust mini-strip -->
    <section class="mini-trust-strip">
      <div class="mini-trust-inner">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="6" width="14" height="11"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="17.5" cy="19" r="2"/></svg> Free delivery over KES 5,000</span>
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> M-Pesa accepted</span>
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z"/></svg> 100% genuine, warranty covered</span>
      </div>
    </section>

    <!-- Featured promo callout -->
    <section class="promo-callout">
      <div class="promo-callout-inner">
        <span class="promo-callout-tag">THIS WEEK</span>
        <p>New arrivals just landed across Audio &amp; Gaming - check them out before they sell out.</p>
        <RouterLink to="/shop?filter=new" class="promo-callout-link">
          Shop New Arrivals
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17 17 7M7 7h10v10"/></svg>
        </RouterLink>
      </div>
    </section>

    <div class="shop-inner">
      <!-- Breadcrumb + heading -->
      <div class="shop-header">
        <p class="breadcrumb">{{ breadcrumbTrail }}</p>
        <h1>{{ pageTitle }}</h1>
        <p v-if="!loading" class="result-count">
          {{ filtered.length }} product{{ filtered.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div class="shop-layout">
        <!-- Sidebar filters -->
        <aside class="filters" :class="{ open: mobileFiltersOpen }">
          <div class="filters-head">
            <h3>Filters</h3>
            <button v-if="activeFilterCount" class="clear-btn" @click="clearFilters">Clear all</button>
          </div>

          <div class="filter-group">
            <h4>Category</h4>
            <button
              v-for="c in categoryList"
              :key="c"
              class="filter-option"
              :class="{ active: selectedCategory === c }"
              @click="toggleCategory(c)"
            >
              <span class="checkbox" :class="{ checked: selectedCategory === c }"></span>
              {{ c }}
            </button>
          </div>

          <div class="filter-group">
            <h4>Brand</h4>
            <button
              v-for="b in brandList"
              :key="b"
              class="filter-option"
              :class="{ active: selectedBrand === b }"
              @click="toggleBrand(b)"
            >
              <span class="checkbox" :class="{ checked: selectedBrand === b }"></span>
              {{ b }}
            </button>
          </div>

          <div class="filter-group">
            <h4>Max Price</h4>
            <input type="range" min="1000" :max="MAX_PRICE" step="1000" v-model.number="maxPrice" class="price-slider" />
            <p class="price-value">Up to {{ formatKES(maxPrice) }}</p>
          </div>
        </aside>

        <!-- Main content -->
        <div class="shop-main">
          <div class="toolbar">
            <button class="mobile-filter-btn" @click="mobileFiltersOpen = !mobileFiltersOpen">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
              Filters
              <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
            </button>

            <label class="sort-label">
              Sort by
              <select v-model="sortBy" class="sort-select">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </label>
          </div>

          <p v-if="cartNotice" class="cart-notice">{{ cartNotice }}</p>

          <div v-if="loading" class="empty-state">
            <p>Loading products from the shop system...</p>
          </div>

          <div v-else-if="loadError" class="empty-state">
            <p>{{ loadError }}</p>
            <button class="clear-btn" @click="loadShopData">Retry</button>
          </div>

          <div v-else-if="filtered.length" class="product-grid">
            <article v-for="p in filtered" :key="p.id" class="product-card">
              <RouterLink :to="`/product/${p.slug || p.id}`" class="card-image-wrap">
                <span v-if="p.badge" class="card-badge">{{ p.badge }}</span>
                <img v-if="p.image" :src="p.image" :alt="p.name" />
                <div v-else class="image-placeholder" aria-hidden="true">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <button class="wishlist-btn" aria-label="Add to wishlist" @click.prevent>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                </button>
              </RouterLink>
              <div class="card-body">
                <RouterLink :to="`/product/${p.slug || p.id}`" class="card-name">{{ p.name }}</RouterLink>
                <div class="card-price-row">
                  <span class="price">{{ formatKES(p.price) }}</span>
                  <span v-if="p.oldPrice" class="old-price">{{ formatKES(p.oldPrice) }}</span>
                </div>
                <p class="stock-mini" :class="{ out: !p.inStock }">
                  {{ p.inStock ? `${p.availableQuantity} available` : 'Unavailable online' }}
                </p>
                <button class="add-btn" :disabled="!p.inStock || !p.variantId" @click="quickAdd(p)">
                  {{ p.inStock ? 'Add to Cart' : 'Out of Stock' }}
                </button>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <p>No products match these filters.</p>
            <button class="clear-btn" @click="clearFilters">Clear filters</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-page { max-width: 100%; margin: 0; padding: 0; }

.welcome-banner {
  background: linear-gradient(135deg, #1c1d21 0%, #2a1710 55%, #17181c 100%);
  color: #fff;
  padding: 40px 32px;
  margin-bottom: 0;
}
.welcome-inner {
  max-width: 1280px;
  margin: 0 auto;
}
.welcome-eyebrow {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #ee6c1f;
  margin-bottom: 12px;
}
.welcome-banner h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 400;
  line-height: 1.3;
  margin-bottom: 10px;
  max-width: 640px;
}
.welcome-sub {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 24px;
}

.banner-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 8px;
  padding: 12px 16px;
  max-width: 480px;
  margin-bottom: 20px;
  color: rgba(255,255,255,0.6);
}
.banner-search input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
}
.banner-search input::placeholder { color: rgba(255,255,255,0.45); }

.quick-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.chip {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.8);
  border-radius: 999px;
  padding: 8px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.chip:hover { border-color: #ee6c1f; }
.chip.active {
  background: #ee6c1f;
  border-color: #ee6c1f;
  color: #fff;
}

/* Trust mini-strip */
.mini-trust-strip {
  background: #fafaf9;
  border-bottom: 1px solid #e1dfdc;
}
.mini-trust-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 32px;
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
}
.mini-trust-inner span {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #4a4a4d;
}
.mini-trust-inner svg { color: #ee6c1f; flex-shrink: 0; }

/* Promo callout */
.promo-callout {
  background: linear-gradient(135deg, #f2a35f, #ee6c1f);
}
.promo-callout-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.promo-callout-tag {
  background: rgba(255,255,255,0.25);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 4px 10px;
  border-radius: 5px;
  flex-shrink: 0;
}
.promo-callout-inner p {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #fff;
  flex: 1;
  min-width: 200px;
}
.promo-callout-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  text-decoration: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255,255,255,0.6);
  padding-bottom: 2px;
}
.promo-callout-link:hover { border-color: #fff; }

.shop-inner { max-width: 1280px; margin: 0 auto; padding: 28px 32px 64px; }


.shop-header { margin-bottom: 20px; }
.breadcrumb {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  color: #6b6b6f;
  margin-bottom: 10px;
}
h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 400;
  color: #17181c;
  margin-bottom: 6px;
}
.result-count {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #6b6b6f;
}

.shop-layout { display: grid; grid-template-columns: 220px 1fr; gap: 36px; align-items: start; }

/* Sidebar */
.filters {
  position: sticky;
  top: 90px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.filters-head { display: flex; align-items: center; justify-content: space-between; }
.filters-head h3 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  font-weight: 400;
  color: #17181c;
}
.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #ee6c1f;
}

.filter-group h4 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #17181c;
  margin-bottom: 12px;
}
.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 6px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  color: #2c2d31;
}
.filter-option.active { color: #ee6c1f; font-weight: 600; }
.checkbox {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1.5px solid #d5d3cf;
  flex-shrink: 0;
}
.checkbox.checked { background: #ee6c1f; border-color: #ee6c1f; }

.price-slider { width: 100%; accent-color: #ee6c1f; margin-top: 4px; }
.price-value {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  color: #6b6b6f;
  margin-top: 8px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e1dfdc;
}
.mobile-filter-btn {
  display: none;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid #e1dfdc;
  border-radius: 6px;
  padding: 9px 14px;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #17181c;
}
.filter-count {
  background: #ee6c1f;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sort-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #6b6b6f;
  margin-left: auto;
}
.sort-select {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #17181c;
  border: 1px solid #e1dfdc;
  border-radius: 6px;
  padding: 7px 10px;
  background: #fff;
  cursor: pointer;
}

.cart-notice {
  border: 1px solid #f1c29f;
  border-radius: 8px;
  background: #fff7f0;
  color: #9d4411;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  margin: 0 0 16px;
  padding: 10px 12px;
}

/* Product grid - same card style as TrendingProducts.vue */
.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}
.product-card { display: flex; flex-direction: column; }
.card-image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #f2f1ef;
  border-radius: 10px;
  overflow: hidden;
  display: block;
  margin-bottom: 12px;
}
.card-image-wrap img { width: 100%; height: 100%; object-fit: cover; }
.image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #c9c7c3; }
.card-badge {
  position: absolute; top: 10px; left: 10px;
  background: #ee6c1f; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 4px 8px; border-radius: 4px; z-index: 2;
}
.wishlist-btn {
  position: absolute; top: 10px; right: 10px;
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.9); border: none;
  display: flex; align-items: center; justify-content: center;
  color: #17181c; cursor: pointer; z-index: 2;
}
.wishlist-btn:hover { color: #ee6c1f; }
.card-body { display: flex; flex-direction: column; gap: 6px; }
.card-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px; font-weight: 500; color: #17181c; text-decoration: none; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-name:hover { color: #ee6c1f; }
.card-price-row { display: flex; align-items: baseline; gap: 8px; }
.price { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14.5px; font-weight: 700; color: #17181c; }
.old-price { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; color: #a5a3a0; text-decoration: line-through; }
.stock-mini {
  color: #1a7d3d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  margin: 0;
}
.stock-mini.out { color: #b3392c; }
.add-btn {
  margin-top: 6px; background: #17181c; color: #fff; border: none; border-radius: 5px;
  padding: 9px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
}
.add-btn:hover { background: #ee6c1f; }
.add-btn:disabled {
  background: #c9c7c3;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}
.empty-state .clear-btn { margin-top: 12px; }

.pagination { display: flex; justify-content: center; gap: 8px; margin-top: 40px; }
.page-btn {
  width: 34px; height: 34px; border-radius: 6px;
  border: 1px solid #e1dfdc; background: #fff; color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.page-btn.active { background: #17181c; color: #fff; border-color: #17181c; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 900px) {
  .shop-layout { grid-template-columns: 1fr; }
  .filters {
    position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
    background: #fff; padding: 24px; z-index: 200;
    transform: translateX(-100%); transition: transform 0.25s ease;
    overflow-y: auto; box-shadow: 12px 0 24px rgba(0,0,0,0.08);
  }
  .filters.open { transform: translateX(0); }
  .mobile-filter-btn { display: flex; }
  .product-grid { grid-template-columns: repeat(2, 1fr); }
  .mini-trust-inner { gap: 14px; padding: 12px 20px; }
  .promo-callout-inner { padding: 12px 20px; }
  .welcome-banner { padding: 28px 20px; }
}
</style>
