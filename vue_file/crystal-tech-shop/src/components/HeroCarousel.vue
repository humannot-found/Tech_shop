<script setup>
/**
 * HeroCarousel.vue
 * Crystal Tech Shop homepage hero.
 */
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import laptopsHero from '@/assets/hero/laptops.jpg'
import phonesHero from '@/assets/hero/phones.avif'
import offersHero from '@/assets/hero/offers.avif'

const slides = [
  {
    tab: 'Laptops',
    heading: 'Power through your workday - no lag, no excuses.',
    sub: 'HP, Lenovo and Dell laptops picked for students, offices and creators.',
    primaryCta: { label: 'Shop Laptops', to: '/category/laptops' },
    secondaryCta: { label: 'All Computers', to: '/category/computers' },
    image: laptopsHero,
    imagePosition: 'center center',
    nav: {
      bg: '#d8611b',
      border: '#a94810',
      accent: '#ff7a21',
      accentDark: '#b64d13',
    },
  },
  {
    tab: 'Phones',
    heading: 'The phones Nairobi is actually asking for.',
    sub: 'Latest Android and budget-friendly picks, all genuine and warrantied.',
    primaryCta: { label: 'Shop Phones', to: '/category/phones' },
    secondaryCta: { label: 'All Accessories', to: '/category/accessories' },
    image: phonesHero,
    imagePosition: 'center center',
    nav: {
      bg: '#24606b',
      border: '#17434b',
      accent: '#2cb4c8',
      accentDark: '#176979',
    },
  },
  {
    tab: 'Crystal Edit',
    heading: 'Staff-picked deals, updated every week.',
    sub: 'Hand-selected bundles and clearance finds across every category.',
    primaryCta: { label: 'Shop the Edit', to: '/shop?filter=crystal-edit' },
    secondaryCta: { label: 'View All Deals', to: '/deals' },
    image: offersHero,
    imagePosition: 'center center',
    nav: {
      bg: '#9c4f55',
      border: '#743940',
      accent: '#c96f6e',
      accentDark: '#823b42',
    },
  },
]

const active = ref(0)
let timer = null

function goTo(i) {
  active.value = i
  resetTimer()
}

function next() {
  active.value = (active.value + 1) % slides.length
}

function prev() {
  active.value = (active.value - 1 + slides.length) % slides.length
}

function resetTimer() {
  clearInterval(timer)
  timer = setInterval(next, 5000)
}

function applyNavbarTheme(theme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--hero-nav-bg', theme.bg)
  root.style.setProperty('--hero-nav-border', theme.border)
  root.style.setProperty('--hero-nav-accent', theme.accent)
  root.style.setProperty('--hero-nav-accent-dark', theme.accentDark)
}

function resetNavbarTheme() {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.removeProperty('--hero-nav-bg')
  root.style.removeProperty('--hero-nav-border')
  root.style.removeProperty('--hero-nav-accent')
  root.style.removeProperty('--hero-nav-accent-dark')
}

watch(active, (index) => {
  applyNavbarTheme(slides[index].nav)
})

onMounted(() => {
  applyNavbarTheme(slides[active.value].nav)
  resetTimer()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  resetNavbarTheme()
})

const slideNumber = computed(() => String(active.value + 1).padStart(2, '0'))
const slideTotal = computed(() => String(slides.length).padStart(2, '0'))
</script>

<template>
  <section class="hero">
    <transition name="image-fade" mode="out-in">
      <img
        :key="slides[active].tab"
        class="hero-image"
        :src="slides[active].image"
        :style="{ objectPosition: slides[active].imagePosition }"
        alt=""
        aria-hidden="true"
      />
    </transition>
    <div class="hero-overlay" aria-hidden="true"></div>

    <div class="hero-inner">
      <div class="hero-count" aria-hidden="true">
        <span class="count-current">{{ slideNumber }}</span>
        <span class="count-sep">/ {{ slideTotal }}</span>
      </div>

      <transition name="hero-fade" mode="out-in">
        <div class="hero-copy" :key="active">
          <h1>{{ slides[active].heading }}</h1>
          <p>{{ slides[active].sub }}</p>
          <div class="hero-ctas">
            <RouterLink :to="slides[active].primaryCta.to" class="btn-primary">
              {{ slides[active].primaryCta.label }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </RouterLink>
            <RouterLink :to="slides[active].secondaryCta.to" class="btn-secondary">
              {{ slides[active].secondaryCta.label }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </RouterLink>
          </div>
        </div>
      </transition>

      <div class="hero-tabs">
        <button
          v-for="(s, i) in slides"
          :key="s.tab"
          class="tab"
          :class="{ active: i === active }"
          @click="goTo(i)"
        >
          {{ s.tab }}
        </button>
      </div>

      <div class="hero-arrows">
        <button class="arrow" aria-label="Previous slide" @click="prev">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button class="arrow" aria-label="Next slide" @click="next">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: block;
  position: relative;
  min-height: 480px;
  margin: 0;
  background: #17181c;
  color: #fff;
  overflow: hidden;
}

.hero-image,
.hero-overlay {
  position: absolute;
  inset: 0;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.02);
}

.hero-overlay {
  background:
    linear-gradient(90deg, rgba(14, 15, 18, 0.82) 0%, rgba(14, 15, 18, 0.55) 46%, rgba(14, 15, 18, 0.2) 100%),
    linear-gradient(0deg, rgba(14, 15, 18, 0.58) 0%, rgba(14, 15, 18, 0.18) 58%, rgba(14, 15, 18, 0.5) 100%);
}

.image-fade-enter-active,
.image-fade-leave-active {
  transition: opacity 0.45s ease;
}

.image-fade-enter-from,
.image-fade-leave-to {
  opacity: 0;
}

.hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 32px 40px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}

.hero-count {
  position: absolute;
  top: 56px;
  left: 32px;
  font-family: Georgia, 'Times New Roman', serif;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.count-current {
  font-size: 42px;
  font-weight: 700;
}

.count-sep {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.06em;
}

.hero-copy {
  max-width: 620px;
  margin-bottom: 28px;
}

.hero-copy h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.15;
  font-weight: 400;
  margin-bottom: 14px;
}

.hero-copy p {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin-bottom: 26px;
}

.hero-fade-enter-active,
.hero-fade-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.hero-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.hero-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.hero-ctas {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 15px 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 4px;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}

.btn-primary {
  background: #ee6c1f;
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  opacity: 0.92;
}

.btn-secondary {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.btn-secondary:hover {
  transform: translateY(-2px);
  border-color: #fff;
}

.hero-tabs {
  display: flex;
  gap: 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding-top: 16px;
}

.tab {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-bottom: 10px;
  border-bottom: 2px solid transparent;
  margin-top: -17px;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.tab.active {
  color: #fff;
  border-bottom-color: #ee6c1f;
}

.tab:hover {
  color: #fff;
}

.hero-arrows {
  position: absolute;
  bottom: 40px;
  right: 32px;
  display: flex;
  gap: 10px;
}

.arrow {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.arrow:hover {
  background: rgba(255, 255, 255, 0.22);
}

@media (max-width: 700px) {
  .hero-arrows {
    position: static;
    margin-top: 20px;
  }

  .hero-count {
    position: static;
    margin-bottom: 20px;
  }

  .hero-inner {
    padding: 32px 20px;
  }

  .hero-tabs {
    gap: 16px;
    flex-wrap: wrap;
  }
}
</style>
