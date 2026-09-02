<script setup>
/**
 * TrendingProducts.vue
 * Crystal Tech Shop homepage "trending now" row.
 */
import { useCartStore } from '@/stores/cart'
import laptopImage from '@/assets/products/hp-laptop.jpg'
import mouseImage from '@/assets/products/mouse.jpg'
import powerBankImage from '@/assets/products/power-bank.jpg'
import routerImage from '@/assets/products/router.jpg'
import speakerImage from '@/assets/products/speaker.jpg'

const cartStore = useCartStore()

defineProps({
  products: {
    type: Array,
    default: () => [
      {
        id: 1,
        name: 'JBL Flip 6 Bluetooth Speaker',
        price: 8999,
        oldPrice: 10999,
        image: speakerImage,
        badge: 'Best Seller',
      },
      {
        id: 2,
        name: 'Anker PowerCore 20000mAh',
        price: 4499,
        oldPrice: null,
        image: powerBankImage,
        badge: null,
      },
      {
        id: 3,
        name: 'HP Pavilion 15 Laptop, i5/8GB',
        price: 68999,
        oldPrice: 74999,
        image: laptopImage,
        badge: 'Deal',
      },
      {
        id: 4,
        name: 'Lenovo Wireless Mouse M220',
        price: 1299,
        oldPrice: null,
        image: mouseImage,
        badge: null,
      },
      {
        id: 5,
        name: 'TP-Link Archer C6 Router',
        price: 3999,
        oldPrice: 4999,
        image: routerImage,
        badge: 'New',
      },
    ],
  },
})

function formatKES(amount) {
  return 'KES ' + amount.toLocaleString('en-KE')
}

function quickAdd(product) {
  cartStore.addItem(
    {
      productId: `trending-${product.id}`,
      name: product.name,
      price: product.price,
      variant: product.badge || 'Trending',
    },
    1,
  )
}
</script>

<template>
  <section class="trending">
    <div class="trending-inner">
      <div class="trending-head">
        <div>
          <span class="eyebrow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7L12 2z" />
            </svg>
            LIVE · MOST WANTED
          </span>
          <h2>What Kenya is buying right now.</h2>
        </div>
        <RouterLink to="/shop" class="view-all">
          VIEW ALL
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </RouterLink>
      </div>

      <div class="product-grid">
        <article v-for="p in products" :key="p.id" class="product-card">
          <RouterLink :to="`/product/${p.id}`" class="card-image-wrap">
            <span v-if="p.badge" class="card-badge">{{ p.badge }}</span>
            <img v-if="p.image" :src="p.image" :alt="p.name" />
            <div v-else class="image-placeholder" aria-hidden="true">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <button class="wishlist-btn" aria-label="Add to wishlist" @click.prevent>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
                />
              </svg>
            </button>
          </RouterLink>

          <div class="card-body">
            <RouterLink :to="`/product/${p.id}`" class="card-name">{{ p.name }}</RouterLink>
            <div class="card-price-row">
              <span class="price">{{ formatKES(p.price) }}</span>
              <span v-if="p.oldPrice" class="old-price">{{ formatKES(p.oldPrice) }}</span>
            </div>
            <button class="add-btn" @click="quickAdd(p)">Add to Cart</button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trending {
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 32px 32px;
}

.trending-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 12px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #ee6c1f;
  margin-bottom: 10px;
}

h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 400;
  color: #17181c;
  margin: 0;
}

.view-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #17181c;
  text-decoration: none;
  padding-bottom: 4px;
  border-bottom: 1px solid #17181c;
}

.view-all:hover {
  color: #ee6c1f;
  border-color: #ee6c1f;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

.product-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #f2f1ef;
  border-radius: 8px;
  overflow: hidden;
  display: block;
  margin-bottom: 12px;
}

.card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9c7c3;
}

.card-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #ee6c1f;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 2;
}

.wishlist-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #17181c;
  cursor: pointer;
  transition: color 0.15s ease;
  z-index: 2;
}

.wishlist-btn:hover {
  color: #ee6c1f;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  font-weight: 500;
  color: #17181c;
  text-decoration: none;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-name:hover {
  color: #ee6c1f;
}

.card-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.price {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14.5px;
  font-weight: 700;
  color: #17181c;
}

.old-price {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  color: #a5a3a0;
  text-decoration: line-through;
}

.add-btn {
  margin-top: 6px;
  background: #17181c;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 9px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s ease;
}

.add-btn:hover {
  background: #ee6c1f;
}

@media (max-width: 1100px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .trending {
    padding: 42px 18px 24px;
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
}
</style>
