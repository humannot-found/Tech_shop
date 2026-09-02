<script setup>
/**
 * Testimonials.vue
 * Crystal Tech Shop homepage testimonials.
 */
const reviews = [
  {
    quote: 'Received my JBL speaker same day. 100% genuine product!',
    name: 'Brian K.',
    city: 'Nairobi',
    rating: 5,
  },
  {
    quote: 'Best electronics shop in Kenya. Fast shipping and great support via WhatsApp.',
    name: 'Grace M.',
    city: 'Mombasa',
    rating: 5,
  },
  {
    quote: 'Ordered a power bank, arrived in 3 days. Will definitely buy again!',
    name: 'David O.',
    city: 'Kisumu',
    rating: 5,
  },
]
</script>

<template>
  <section class="testimonials" aria-label="Customer testimonials">
    <div class="testimonial-grid">
      <article v-for="r in reviews" :key="r.name" class="testimonial-card">
        <div class="stars" aria-label="5 out of 5 stars">
          <svg
            v-for="n in r.rating"
            :key="n"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="#ee6c1f"
            stroke="none"
            aria-hidden="true"
          >
            <path d="M12 2l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 16.9 6.1 20.1l1.3-6.6-4.9-4.6 6.6-.8z" />
          </svg>
        </div>
        <p class="quote">"{{ r.quote }}"</p>
        <p class="attribution"><strong>{{ r.name }}</strong> - {{ r.city }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.testimonials {
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px 32px 56px;
}

.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.testimonial-card {
  background: #fff;
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stars {
  display: flex;
  gap: 3px;
}

.quote {
  color: #2c2d31;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.attribution {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  margin: 0;
}

.attribution strong {
  color: #17181c;
}

@media (max-width: 860px) {
  .testimonials {
    padding: 8px 18px 46px;
  }

  .testimonial-grid {
    grid-template-columns: 1fr;
  }
}
</style>
