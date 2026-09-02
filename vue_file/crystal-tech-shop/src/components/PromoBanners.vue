<script setup>
/**
 * PromoBanners.vue
 * Crystal Tech Shop homepage promo strip.
 */
const promos = [
  {
    tag: 'TOP DEAL',
    headline: 'Extra 10% Off',
    sub: 'On all JBL and Anker speakers this week',
    to: '/deals/speakers',
  },
  {
    tag: 'CLEARANCE',
    headline: 'Up to 40% Off',
    sub: 'Selected earphones and headphones',
    to: '/deals/clearance',
  },
  {
    tag: 'BUNDLE SAVE',
    headline: 'Free Case',
    sub: 'With every phone purchase',
    to: '/deals/phone-bundle',
  },
]
</script>

<template>
  <section class="promos" aria-label="Current promotions">
    <div class="promos-inner">
      <RouterLink v-for="p in promos" :key="p.tag" :to="p.to" class="promo-card">
        <span class="promo-icon" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9z" />
            <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>

        <div class="promo-text">
          <p class="promo-line">
            <span class="promo-tag">{{ p.tag }}</span>
            <span class="promo-headline">{{ p.headline }}</span>
          </p>
          <p class="promo-sub">{{ p.sub }}</p>
        </div>

        <svg
          class="promo-arrow"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.promos {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 8px;
}

.promos-inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.promo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, #f2a35f, #ee6c1f);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  padding: 18px 20px;
  min-width: 0;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.promo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(238, 108, 31, 0.28);
}

.promo-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}

.promo-text {
  flex: 1;
  min-width: 0;
}

.promo-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  margin: 0;
}

.promo-tag {
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.promo-headline {
  font-size: 16px;
  font-weight: 700;
}

.promo-sub {
  color: rgba(255, 255, 255, 0.85);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12.5px;
  margin: 2px 0 0;
}

.promo-arrow {
  flex: 0 0 auto;
  opacity: 0.85;
  transition: transform 0.15s ease;
}

.promo-card:hover .promo-arrow {
  transform: translateX(3px);
}

@media (max-width: 860px) {
  .promos {
    padding: 24px 18px 8px;
  }

  .promos-inner {
    grid-template-columns: 1fr;
  }
}
</style>
