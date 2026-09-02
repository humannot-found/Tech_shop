<script setup>
/**
 * ShopByCategory.vue
 * Crystal Tech Shop homepage category tiles.
 */
import audioImage from '@/assets/products/speaker.jpg'
import computersImage from '@/assets/hero/laptops.jpg'
import gamingImage from '@/assets/hero/offers.avif'
import lifestyleImage from '@/assets/hero/phones.avif'
import networkingImage from '@/assets/products/router.jpg'

const categories = [
  {
    name: 'Computers',
    count: '238+ items',
    to: '/category/computers',
    image: computersImage,
  },
  {
    name: 'Audio',
    count: '285+ items',
    to: '/category/audio',
    image: audioImage,
  },
  {
    name: 'Gaming',
    count: '411+ items',
    to: '/category/gaming',
    image: gamingImage,
  },
  {
    name: 'Power & Networking',
    count: '184+ items',
    to: '/category/power-networking',
    image: networkingImage,
  },
  {
    name: 'Lifestyle & Home',
    count: '110+ items',
    to: '/category/lifestyle-home',
    image: lifestyleImage,
  },
]
</script>

<template>
  <section class="shop-by-category">
    <h2>Shop by Category</h2>

    <div class="category-grid">
      <RouterLink v-for="c in categories" :key="c.name" :to="c.to" class="category-tile">
        <span class="tile-circle">
          <img :src="c.image" :alt="c.name" />
        </span>
        <span class="tile-name">{{ c.name }}</span>
        <span class="tile-count">{{ c.count }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.shop-by-category {
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 32px;
  text-align: center;
}

h2 {
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 400;
  margin: 0 0 40px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
}

.category-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.tile-circle {
  width: 120px;
  height: 120px;
  border-radius: 18px;
  background: #f2f1ef;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.tile-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-tile:hover .tile-circle {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.tile-name {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14.5px;
  font-weight: 700;
}

.category-tile:hover .tile-name {
  color: #ee6c1f;
}

.tile-count {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
}

@media (max-width: 1000px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .shop-by-category {
    padding: 44px 18px;
  }

  .category-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .tile-circle {
    width: 96px;
    height: 96px;
  }
}
</style>
