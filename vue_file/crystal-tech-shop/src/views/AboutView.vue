<script setup>
import storeImage from '@/assets/hero/laptops.jpg'

const stats = [
  { value: '5,000+', label: 'Orders Delivered' },
  { value: '15+', label: 'Trusted Brands' },
  { value: '47', label: 'Counties Reached' },
  { value: '4.8/5', label: 'Average Rating' },
]

const values = [
  {
    title: '100% Genuine Products',
    body: 'Every item we sell is sourced from authorized distributors and comes with full manufacturer warranty. No counterfeits, ever.',
    icon: 'shield',
  },
  {
    title: 'Fast, Reliable Delivery',
    body: 'Same-day delivery within Nairobi, plus nationwide shipping to every county with tracking from checkout to your door.',
    icon: 'truck',
  },
  {
    title: 'Real Human Support',
    body: 'Reach us on WhatsApp, call, or visit us in person at Highway Mall along Mirema, Roysambu for help from people who know the products.',
    icon: 'headset',
  },
]
</script>

<template>
  <main class="about-page">
    <section class="about-hero">
      <div class="about-copy">
        <p class="eyebrow">OUR STORY</p>
        <h1>Genuine electronics, built for how Kenya shops.</h1>
        <p class="lead">
          Crystal Tech Shop started with a simple idea: buying electronics in Kenya
          should not mean gambling on fakes, waiting weeks for delivery, or chasing
          support that never replies. We stock what people actually need, price it
          fairly, and stand behind every sale.
        </p>
      </div>

      <div class="hero-media">
        <img :src="storeImage" alt="Laptop keyboard with warm neon lighting" />
        <div class="hero-note">
          <span>Highway Mall</span>
          <strong>Nairobi tech pickup hub</strong>
        </div>
      </div>
    </section>

    <section class="stats-row" aria-label="Crystal Tech Shop statistics">
      <div v-for="stat in stats" :key="stat.label" class="stat">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </section>

    <section class="values-section">
      <div class="section-head">
        <p class="eyebrow">WHY SHOP WITH US</p>
        <h2>What we stand for</h2>
      </div>

      <div class="values-grid">
        <article v-for="value in values" :key="value.title" class="value-card">
          <span class="value-icon" aria-hidden="true">
            <svg
              v-if="value.icon === 'shield'"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" />
            </svg>
            <svg
              v-else-if="value.icon === 'truck'"
              width="22"
              height="22"
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
              v-else
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
              <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </span>

          <h3>{{ value.title }}</h3>
          <p>{{ value.body }}</p>
        </article>
      </div>
    </section>

    <section class="visit-section">
      <div class="visit-inner">
        <div class="visit-text">
          <p class="eyebrow">VISIT US</p>
          <h2>Come see us in person.</h2>
          <p>
            Browse in-store, test before you buy, and talk to someone who actually
            knows the products.
          </p>
        </div>

        <div class="visit-details">
          <span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Highway Mall along Mirema, Roysambu
          </span>

          <span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Mon-Sat, 9am - 7pm
          </span>

          <span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path
                d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.5 2.9.6a2 2 0 0 1 1.7 2z"
              />
            </svg>
            0140 428 465
          </span>
        </div>

        <RouterLink to="/shop" class="cta-btn">
          Shop Now
          <svg
            width="14"
            height="14"
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
    </section>
  </main>
</template>

<style scoped>
.about-page {
  width: 100%;
  background: #f7f5f2;
  color: #17181c;
}

.about-hero,
.stats-row,
.values-section,
.visit-inner {
  max-width: 1216px;
  margin: 0 auto;
  padding-right: 32px;
  padding-left: 32px;
}

.about-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
  gap: 48px;
  align-items: center;
  padding-top: 20px;
  padding-bottom: 20px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #ee6c1f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.about-hero .eyebrow {
  margin-bottom: 8px;
}

.about-copy h1 {
  margin: 0 0 18px;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 42px;
  font-weight: 400;
  line-height: 1.14;
  letter-spacing: 0;
}

.lead {
  max-width: 680px;
  margin: 0;
  color: #4a4a4d;
  font-size: 15px;
  line-height: 1.7;
}

.hero-media {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border-radius: 8px;
  background: #17181c;
}

.hero-media img {
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
}

.hero-note {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 260px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 13px 15px;
  background: rgba(23, 24, 28, 0.78);
  color: #fff;
}

.hero-note span {
  color: #ffb26b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.hero-note strong {
  font-size: 14px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 64px;
  padding-top: 32px;
  padding-bottom: 32px;
  border-top: 1px solid #e1dfdc;
  border-bottom: 1px solid #e1dfdc;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  color: #ee6c1f;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 30px;
  font-weight: 700;
}

.stat-label {
  color: #6b6b6f;
  font-size: 12.5px;
}

.values-section {
  margin-bottom: 72px;
}

.section-head {
  margin-bottom: 32px;
}

.section-head h2,
.visit-text h2 {
  margin: 0;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 0;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.value-card {
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 26px;
  background: #fff;
}

.value-icon {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fdf1e7;
  color: #ee6c1f;
}

.value-card h3 {
  margin: 0 0 8px;
  color: #17181c;
  font-size: 15px;
  font-weight: 800;
}

.value-card p {
  margin: 0;
  color: #6b6b6f;
  font-size: 13.5px;
  line-height: 1.65;
}

.visit-section {
  background: #f7f5f2;
  padding: 0 32px 72px;
}

.visit-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr) auto;
  gap: 32px;
  align-items: center;
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 38px 32px;
  background: #fff;
  color: #17181c;
  box-shadow: 0 18px 45px rgba(23, 24, 28, 0.06);
}

.visit-text h2 {
  color: #17181c;
  font-size: 27px;
}

.visit-text > p {
  max-width: 520px;
  margin: 14px 0 0;
  color: #4a4a4d;
  font-size: 13.5px;
  line-height: 1.7;
}

.visit-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.visit-details span {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #2b2d33;
  font-size: 13px;
}

.visit-details svg {
  flex: 0 0 auto;
  color: #ee6c1f;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 132px;
  border-radius: 6px;
  padding: 13px 24px;
  background: #ee6c1f;
  color: #fff;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0;
  text-decoration: none;
  text-transform: uppercase;
}

.cta-btn:hover {
  background: #d65a12;
}

@media (max-width: 980px) {
  .about-hero {
    grid-template-columns: 1fr;
  }

  .values-grid {
    grid-template-columns: 1fr;
  }

  .visit-inner {
    grid-template-columns: 1fr;
    align-items: start;
  }
}

@media (max-width: 680px) {
  .visit-section {
    padding-right: 18px;
    padding-bottom: 48px;
    padding-left: 18px;
  }

  .visit-inner {
    padding: 26px 20px;
  }

  .about-hero,
  .stats-row,
  .values-section {
    padding-right: 18px;
    padding-left: 18px;
  }

  .about-hero {
    padding-top: 24px;
    gap: 28px;
  }

  .about-copy h1 {
    font-size: 30px;
  }

  .hero-media,
  .hero-media img {
    min-height: 300px;
  }

  .hero-note {
    right: 12px;
    bottom: 12px;
    left: 12px;
    max-width: none;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 22px;
    margin-bottom: 48px;
  }
}
</style>
