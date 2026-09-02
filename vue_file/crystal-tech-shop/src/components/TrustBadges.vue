<script setup>
/**
 * TrustBadges.vue
 * Crystal Tech Shop homepage trust badges.
 */
const badges = [
  { label: 'SSL Secured', icon: 'shield', highlight: false },
  { label: 'Verified Business', icon: 'award', highlight: false },
  { label: 'M-PESA Verified', icon: 'check', highlight: true },
  { label: '100% Genuine', icon: 'shield', highlight: false },
]
</script>

<template>
  <section class="trust-badges" aria-label="Trust badges">
    <p class="trust-heading">Trusted by Thousands of Kenyans</p>

    <div class="badge-row">
      <span v-for="b in badges" :key="b.label" class="badge-pill" :class="{ highlight: b.highlight }">
        <svg
          v-if="b.icon === 'shield'"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" />
        </svg>

        <svg
          v-else-if="b.icon === 'award'"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="5" />
          <path d="M8.5 13 7 22l5-3 5 3-1.5-9" />
        </svg>

        <svg
          v-else
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>

        {{ b.label }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.trust-badges {
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px 32px 48px;
  text-align: center;
}

.trust-heading {
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  font-style: italic;
  margin: 0 0 22px;
}

.badge-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid #e1dfdc;
  background: #fff;
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
}

.badge-pill svg {
  color: #ee6c1f;
  flex: 0 0 auto;
}

.badge-pill.highlight {
  background: #ecfaf1;
  border-color: #b8ecc9;
  color: #1a7d3d;
}

.badge-pill.highlight svg {
  color: #22a854;
}

@media (max-width: 560px) {
  .trust-badges {
    padding: 6px 18px 42px;
  }

  .badge-row {
    flex-direction: column;
    align-items: center;
  }

  .badge-pill {
    width: 220px;
    justify-content: center;
  }
}
</style>
