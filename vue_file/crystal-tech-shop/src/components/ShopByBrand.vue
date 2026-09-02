<script setup>
/**
 * ShopByBrand.vue
 * Crystal Tech Shop homepage brand strip.
 */
const brands = [
  { name: 'JBL', logo: null },
  { name: 'Anker', logo: null },
  { name: 'Promate', logo: null },
  { name: 'HP', logo: null },
  { name: 'Lenovo', logo: null },
  { name: 'EcoFlow', logo: null },
  { name: 'TP-Link', logo: null },
  { name: 'Canon', logo: null },
  { name: 'GoPro', logo: null },
  { name: 'DJI', logo: null },
  { name: 'Philips', logo: null },
  { name: 'Xiaomi', logo: null },
]
</script>

<template>
  <section class="shop-by-brand">
    <div class="brand-head">
      <span class="eyebrow">
        <span class="eyebrow-dash" aria-hidden="true"></span>
        SHOP BY BRAND
      </span>
      <RouterLink to="/brands" class="view-all">
        VIEW ALL
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      </RouterLink>
    </div>

    <div class="brand-scroll">
      <RouterLink
        v-for="b in brands"
        :key="b.name"
        :to="`/shop?brand=${encodeURIComponent(b.name)}`"
        class="brand-tile"
      >
        <img v-if="b.logo" :src="b.logo" :alt="b.name" />
        <span v-else class="brand-fallback">{{ b.name }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.shop-by-brand {
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 32px 56px;
}

.brand-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.eyebrow-dash {
  width: 22px;
  height: 2px;
  background: #ee6c1f;
  display: inline-block;
}

.view-all {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-decoration: none;
  white-space: nowrap;
}

.view-all:hover {
  color: #ee6c1f;
}

.brand-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
}

.brand-scroll::-webkit-scrollbar {
  height: 5px;
}

.brand-scroll::-webkit-scrollbar-thumb {
  background: #e1dfdc;
  border-radius: 4px;
}

.brand-tile {
  flex: 0 0 auto;
  width: 132px;
  height: 74px;
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: #fff;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.brand-tile:hover {
  border-color: #ee6c1f;
  transform: translateY(-2px);
}

.brand-tile img {
  max-width: 72%;
  max-height: 60%;
  object-fit: contain;
}

.brand-fallback {
  color: #a5a3a0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-tile:hover .brand-fallback {
  color: #ee6c1f;
}

@media (max-width: 600px) {
  .shop-by-brand {
    padding: 34px 18px 44px;
  }

  .brand-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
