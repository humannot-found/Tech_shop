<script setup>
/**
 * TrustStrip.vue
 * Crystal Tech Shop homepage trust strip.
 */
const items = [
  {
    label: 'Free Delivery',
    sub: 'Over KES 5,000',
    icon: 'truck',
  },
  {
    label: '100% Genuine',
    sub: 'Warranty Covered',
    icon: 'shield',
  },
  {
    label: 'M-PESA Ready',
    sub: 'Secure Payments',
    icon: 'card',
  },
  {
    label: '24/7 Support',
    sub: 'WhatsApp Chat',
    icon: 'headset',
  },
]
</script>

<template>
  <section class="trust-strip" aria-label="Shop trust highlights">
    <div class="trust-inner">
      <div v-for="item in items" :key="item.label" class="trust-item">
        <svg
          v-if="item.icon === 'truck'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <rect x="1" y="6" width="14" height="11" />
          <path d="M15 9h4l3 3v5h-7z" />
          <circle cx="6" cy="19" r="2" />
          <circle cx="17.5" cy="19" r="2" />
        </svg>

        <svg
          v-else-if="item.icon === 'shield'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" />
        </svg>

        <svg
          v-else-if="item.icon === 'card'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>

        <svg
          v-else
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
          <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>

        <div class="trust-text">
          <span class="trust-label">{{ item.label }}</span>
          <span class="trust-sub">{{ item.sub }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trust-strip {
  border-top: 1px solid #e1dfdc;
  border-bottom: 1px solid #e1dfdc;
  background: #fafaf9;
}

.trust-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ee6c1f;
  min-width: 0;
}

.trust-item svg {
  flex: 0 0 auto;
}

.trust-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}

.trust-label {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  font-weight: 700;
}

.trust-sub {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
}

@media (max-width: 860px) {
  .trust-inner {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .trust-inner {
    grid-template-columns: 1fr;
    padding: 22px 18px;
  }
}
</style>
