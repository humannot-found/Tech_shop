<script setup>
/**
 * HomeView.vue
 * Crystal Tech Shop homepage.
 */
import HeroCarousel from '@/components/HeroCarousel.vue'
import PromoBanners from '@/components/PromoBanners.vue'
import ShopByBrand from '@/components/ShopByBrand.vue'
import ShopByCategory from '@/components/ShopByCategory.vue'
import Testimonials from '@/components/Testimonials.vue'
import TrendingProducts from '@/components/TrendingProducts.vue'
import TrustBadges from '@/components/TrustBadges.vue'
import TrustStrip from '@/components/TrustStrip.vue'
</script>

<template>
  <div class="home">
    <HeroCarousel />
    <TrendingProducts />
    <TrustStrip />
    <PromoBanners />
    <ShopByCategory />
    <ShopByBrand />
    <TrustBadges />
    <Testimonials />
  </div>
</template>
