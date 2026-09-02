<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()

const announcements = [
  'VISIT US AT HIGHWAY MALL ALONG MIREMA, ROYSAMBU',
  'PAY VIA M-PESA - INSTANT CONFIRMATION',
  'FREE DELIVERY ON ORDERS OVER KES 5,000',
]

const categories = [
  { label: 'Laptops', to: '/category/laptops' },
  { label: 'Phones', to: '/category/phones' },
  { label: 'Accessories', to: '/category/accessories' },
  { label: 'Repairs', to: '/category/repairs' },
  { label: 'Power & Networking', to: '/category/power-networking' },
]

const announceIndex = ref(0)
const categoriesOpen = ref(false)
const categoriesPinned = ref(false)
const mobileMenuOpen = ref(false)
let announceTimer = null

onMounted(() => {
  announceTimer = window.setInterval(() => {
    announceIndex.value = (announceIndex.value + 1) % announcements.length
  }, 3000)
})

onBeforeUnmount(() => {
  window.clearInterval(announceTimer)
})

function toggleCategories() {
  if (categoriesPinned.value) {
    categoriesPinned.value = false
    categoriesOpen.value = false
    return
  }

  categoriesPinned.value = true
  categoriesOpen.value = true
}

function openCategories() {
  categoriesOpen.value = true
}

function closeCategories() {
  if (categoriesPinned.value) return
  categoriesOpen.value = false
}

function closeCategoriesNow() {
  categoriesPinned.value = false
  categoriesOpen.value = false
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  if (!mobileMenuOpen.value) categoriesOpen.value = false
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
  closeCategoriesNow()
}
</script>

<template>
  <div class="announce-bar">
    <transition name="fade" mode="out-in">
      <span :key="announceIndex">{{ announcements[announceIndex] }}</span>
    </transition>
  </div>

  <nav class="navbar">
    <div class="nav-inner">
      <RouterLink to="/" class="logo" @click="closeMobileMenu">
        <span class="logo-mark" aria-hidden="true"></span>
        <span class="logo-text-block">
          <span class="logo-name"><span class="crystal-word">CRYSTAL</span> TECH</span>
          <span class="logo-sub">SHOP</span>
        </span>
      </RouterLink>

      <ul class="nav-links">
        <li><RouterLink to="/" @click="closeCategoriesNow">Home</RouterLink></li>
        <li><RouterLink to="/shop" @click="closeCategoriesNow">Shop</RouterLink></li>
        <li><RouterLink to="/about" @click="closeCategoriesNow">About</RouterLink></li>
        <li><RouterLink to="/support" @click="closeCategoriesNow">Support</RouterLink></li>
        <li class="dropdown-wrap" @mouseenter="openCategories" @mouseleave="closeCategories">
          <button type="button" class="has-dropdown" :aria-expanded="categoriesOpen" @click="toggleCategories">
            Categories
            <svg
              class="chevron"
              :class="{ open: categoriesOpen }"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div v-show="categoriesOpen" class="dropdown" @click="closeCategoriesNow">
            <RouterLink v-for="category in categories" :key="category.to" :to="category.to">
              {{ category.label }}
            </RouterLink>
          </div>
        </li>
      </ul>

      <div class="nav-icons">
        <button class="icon-btn" aria-label="Search" title="Search">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <RouterLink to="/wishlist" class="icon-btn" aria-label="Wishlist" title="Wishlist">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
            />
          </svg>
        </RouterLink>

        <RouterLink to="/cart" class="icon-btn" aria-label="Cart" title="Cart">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span v-if="cartStore.itemCount > 0" class="cart-count">{{ cartStore.itemCount }}</span>
        </RouterLink>

        <RouterLink to="/account" class="icon-btn" aria-label="Account" title="Account">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </RouterLink>

        <button
          class="hamburger"
          aria-label="Menu"
          :aria-expanded="mobileMenuOpen"
          title="Menu"
          @click="toggleMobileMenu"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <div v-show="mobileMenuOpen" class="mobile-menu">
      <RouterLink to="/" @click="closeMobileMenu">Home</RouterLink>
      <RouterLink to="/shop" @click="closeMobileMenu">Shop</RouterLink>
      <RouterLink to="/about" @click="closeMobileMenu">About</RouterLink>
      <RouterLink to="/support" @click="closeMobileMenu">Support</RouterLink>
      <RouterLink to="/wishlist" @click="closeMobileMenu">Wishlist</RouterLink>
      <RouterLink to="/account" @click="closeMobileMenu">Account</RouterLink>

      <button type="button" class="mobile-cat-toggle" :aria-expanded="categoriesOpen" @click="toggleCategories">
        Categories
        <svg
          class="chevron"
          :class="{ open: categoriesOpen }"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div v-show="categoriesOpen" class="mobile-dropdown">
        <RouterLink v-for="category in categories" :key="category.to" :to="category.to" @click="closeMobileMenu">
          {{ category.label }}
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.announce-bar,
.navbar {
  --ink: #17181c;
  --nav-bg: var(--hero-nav-bg, #d8611b);
  --orange: var(--hero-nav-accent, #ee6c1f);
  --orange-dark: var(--hero-nav-accent-dark, #d65a12);
  --gray-text: #6b6b6f;
  --border: var(--hero-nav-border, #b64d13);
}

.announce-bar {
  padding: 9px 12px;
  background: var(--ink);
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.navbar {
  position: sticky;
  z-index: 100;
  top: 0;
  border-bottom: 1px solid var(--border);
  background: var(--nav-bg);
  transition:
    background-color 0.35s ease,
    border-color 0.35s ease;
}

.nav-inner {
  display: flex;
  max-width: 1280px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
  padding: 14px 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  text-decoration: none;
}

.logo-mark {
  position: relative;
  display: block;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 9px;
  background: #17181c;
}

.logo-mark::after {
  position: absolute;
  inset: 8px;
  border: 1.5px solid var(--orange);
  border-radius: 4px;
  content: '';
  transform: rotate(45deg);
}

.logo-text-block {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.05;
}

.logo-name {
  display: block;
  font-size: 20px;
  font-weight: 700;
}

.crystal-word {
  background: linear-gradient(90deg, #fff3e6, #ffb26b, #ee6c1f, #ffd7b0, #fff3e6);
  background-size: 300% 100%;
  background-clip: text;
  color: transparent;
  animation: crystal-shimmer 4s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes crystal-shimmer {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.logo-sub {
  display: block;
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.76);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 10px;
  letter-spacing: 0.22em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 34px;
  list-style: none;
}

.nav-links a,
.has-dropdown {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  padding: 4px 0;
  background: none;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
}

.nav-links a::after {
  position: absolute;
  bottom: -3px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--orange);
  content: '';
  transition: width 0.2s ease;
}

.nav-links a:hover::after,
.nav-links a.router-link-active::after {
  width: 100%;
}

.nav-links a:hover,
.has-dropdown:hover {
  color: #17181c;
}

.chevron {
  transition: transform 0.2s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.dropdown-wrap {
  position: relative;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  display: flex;
  width: 200px;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
  transform: translateX(-50%);
}

.dropdown a {
  display: block;
  border-radius: 6px;
  padding: 9px 12px;
  color: #17181c;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-decoration: none;
  text-transform: none;
}

.dropdown a::after {
  display: none;
}

.dropdown a:hover {
  background: #fff1ea;
  color: var(--orange-dark);
}

.dropdown a.router-link-active {
  color: #17181c;
}

.nav-icons {
  display: flex;
  align-items: center;
  gap: 22px;
}

.icon-btn,
.hamburger {
  display: flex;
  align-items: center;
  border: none;
  background: none;
  color: #fff;
  cursor: pointer;
  text-decoration: none;
}

.icon-btn {
  position: relative;
  padding: 4px;
  transition:
    color 0.15s ease,
    transform 0.15s ease;
}

.icon-btn:hover {
  color: #17181c;
  transform: translateY(-1px);
}

.cart-count {
  position: absolute;
  top: -5px;
  right: -6px;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--orange);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.hamburger {
  display: none;
  padding: 4px;
}

.mobile-menu {
  display: none;
  flex-direction: column;
  border-top: 1px solid var(--border);
  padding: 8px 20px 18px;
}

.mobile-menu a,
.mobile-cat-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 12px 4px;
  background: none;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: left;
  text-decoration: none;
  text-transform: uppercase;
}

.mobile-dropdown {
  display: flex;
  flex-direction: column;
  margin: 8px 0 4px;
  border-radius: 8px;
  padding: 6px;
  background: #fff;
}

.mobile-dropdown a {
  border-bottom: none;
  border-radius: 6px;
  padding: 10px 12px;
  color: #17181c;
  font-size: 13px;
  font-weight: 500;
  text-transform: none;
}

.mobile-dropdown a:hover,
.mobile-dropdown a.router-link-active {
  color: var(--orange-dark);
}

@media (prefers-reduced-motion: reduce) {
  .crystal-word {
    animation: none;
    background-position: 0% 50%;
  }
}

@media (max-width: 860px) {
  .nav-inner {
    padding-right: 18px;
    padding-left: 18px;
  }

  .nav-links {
    display: none;
  }

  .nav-icons {
    gap: 14px;
  }

  .hamburger {
    display: flex;
  }

  .mobile-menu {
    display: flex;
  }
}
</style>
