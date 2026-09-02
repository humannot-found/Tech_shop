<script setup>
import { ref } from 'vue'

const contactChannels = [
  {
    title: 'WhatsApp',
    detail: '0140 428 465',
    sub: 'Fastest response, usually under 10 minutes',
    icon: 'whatsapp',
    href: 'https://wa.me/254140428465',
    external: true,
  },
  {
    title: 'Call Us',
    detail: '0140 428 465',
    sub: 'Mon-Sat, 9am - 7pm',
    icon: 'phone',
    href: 'tel:+254140428465',
    external: false,
  },
  {
    title: 'Email',
    detail: 'hello@crystaltechshop.co.ke',
    sub: 'Replies within 24 hours',
    icon: 'mail',
    href: 'mailto:hello@crystaltechshop.co.ke',
    external: false,
  },
]

const faqs = ref([
  {
    q: 'How long does delivery take?',
    a: 'Same-day delivery within Nairobi for orders placed before 2pm. Other counties typically take 1-3 business days depending on location.',
    open: true,
  },
  {
    q: 'Is delivery really free?',
    a: 'Yes, free delivery applies automatically to orders over KES 5,000. Orders below that have a flat KES 300 delivery fee.',
    open: false,
  },
  {
    q: 'What payment methods do you accept?',
    a: 'M-Pesa STK Push, card payments via Flutterwave, and Cash on Delivery in select areas.',
    open: false,
  },
  {
    q: 'Are your products genuine?',
    a: 'Yes, every product is sourced from authorized distributors and comes with full manufacturer warranty.',
    open: false,
  },
  {
    q: 'Can I return or exchange an item?',
    a: "Yes, unopened items can be returned within 7 days of delivery. Faulty items are covered under warranty; contact us and we'll sort it out.",
    open: false,
  },
  {
    q: 'Do you offer in-store pickup?',
    a: 'Yes, you can collect your order from Highway Mall along Mirema, Roysambu.',
    open: false,
  },
])

const form = ref({
  name: '',
  email: '',
  orderNumber: '',
  message: '',
})

const submitting = ref(false)
const submitted = ref(false)

function toggleFaq(index) {
  faqs.value[index].open = !faqs.value[index].open
}

async function submitForm() {
  submitting.value = true
  await new Promise((resolve) => setTimeout(resolve, 1000))
  submitting.value = false
  submitted.value = true
  form.value = { name: '', email: '', orderNumber: '', message: '' }
}
</script>

<template>
  <main class="support-page">
    <section class="support-hero">
      <p class="eyebrow">SUPPORT</p>
      <h1>How can we help?</h1>
      <p class="lead">Real people, fast answers. Reach us in the easiest way for you, or check the FAQs below.</p>
    </section>

    <section class="channels-row" aria-label="Contact channels">
      <a
        v-for="channel in contactChannels"
        :key="channel.title"
        :href="channel.href"
        :target="channel.external ? '_blank' : undefined"
        :rel="channel.external ? 'noopener' : undefined"
        class="channel-card"
      >
        <span class="channel-icon" aria-hidden="true">
          <svg
            v-if="channel.icon === 'whatsapp'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
          <svg
            v-else-if="channel.icon === 'phone'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.5 2.9.6a2 2 0 0 1 1.7 2z"
            />
          </svg>
          <svg
            v-else
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M4 4h16v16H4z" />
            <path d="m22 6-10 7L2 6" />
          </svg>
        </span>

        <span>
          <strong>{{ channel.title }}</strong>
          <span class="channel-detail">{{ channel.detail }}</span>
          <span class="channel-sub">{{ channel.sub }}</span>
        </span>
      </a>
    </section>

    <div class="support-layout">
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>

        <div class="faq-list">
          <article v-for="(faq, index) in faqs" :key="faq.q" class="faq-item">
            <button class="faq-question" :aria-expanded="faq.open" @click="toggleFaq(index)">
              <span>{{ faq.q }}</span>
              <svg
                class="chevron"
                :class="{ open: faq.open }"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div v-show="faq.open" class="faq-answer">
              <p>{{ faq.a }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="form-section">
        <h2>Still need help?</h2>

        <div v-if="submitted" class="submitted-notice">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12 11 15 16 9" />
          </svg>
          <p>Message sent. We'll get back to you within 24 hours.</p>
        </div>

        <form v-else class="contact-form" @submit.prevent="submitForm">
          <div class="field">
            <label for="s-name">Name</label>
            <input id="s-name" v-model="form.name" type="text" required />
          </div>

          <div class="field">
            <label for="s-email">Email</label>
            <input id="s-email" v-model="form.email" type="email" required />
          </div>

          <div class="field">
            <label for="s-order">Order Number (optional)</label>
            <input id="s-order" v-model="form.orderNumber" type="text" placeholder="e.g. CTS-10234" />
          </div>

          <div class="field">
            <label for="s-message">Message</label>
            <textarea id="s-message" v-model="form.message" rows="4" required></textarea>
          </div>

          <button type="submit" class="submit-btn" :disabled="submitting">
            {{ submitting ? 'Sending...' : 'Send Message' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.support-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 72px;
  background: #f7f5f2;
}

.eyebrow {
  margin: 0 0 12px;
  color: #ee6c1f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.support-hero {
  max-width: 620px;
  padding: 56px 0 40px;
}

.support-hero h1 {
  margin: 0 0 12px;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 40px;
  font-weight: 400;
  letter-spacing: 0;
}

.lead {
  margin: 0;
  color: #6b6b6f;
  font-size: 14.5px;
  line-height: 1.6;
}

.channels-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 64px;
}

.channel-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 22px;
  background: #fff;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.channel-card:hover {
  border-color: #ee6c1f;
  transform: translateY(-2px);
}

.channel-icon {
  display: flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fdf1e7;
  color: #ee6c1f;
}

.channel-card strong,
.channel-detail,
.channel-sub {
  display: block;
}

.channel-card strong {
  margin-bottom: 4px;
  color: #17181c;
  font-size: 14.5px;
  font-weight: 800;
}

.channel-detail {
  margin-bottom: 2px;
  color: #2c2d31;
  font-size: 13px;
}

.channel-sub {
  color: #6b6b6f;
  font-size: 12px;
}

.support-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 1fr);
  gap: 56px;
  align-items: start;
}

.faq-section h2,
.form-section h2 {
  margin: 0 0 24px;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 0;
}

.faq-list {
  display: flex;
  flex-direction: column;
}

.faq-item {
  border-bottom: 1px solid #e1dfdc;
}

.faq-question {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: none;
  padding: 18px 0;
  background: none;
  color: #17181c;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.chevron {
  flex: 0 0 auto;
  color: #ee6c1f;
  transition: transform 0.2s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 0 18px;
}

.faq-answer p {
  margin: 0;
  color: #6b6b6f;
  font-size: 13.5px;
  line-height: 1.65;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

label {
  color: #17181c;
  font-size: 12.5px;
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  border: 1px solid #e1dfdc;
  border-radius: 6px;
  padding: 11px 13px;
  background: #fff;
  color: #17181c;
  font-size: 13.5px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #ee6c1f;
  outline: none;
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 6px;
  padding: 14px 0;
  background: #17181c;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.submit-btn:hover:not(:disabled) {
  background: #ee6c1f;
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.submitted-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid #b8ecc9;
  border-radius: 8px;
  padding: 32px 20px;
  background: #ecfaf1;
  color: #1a7d3d;
  text-align: center;
}

.submitted-notice p {
  margin: 0;
  font-size: 13.5px;
}

@media (max-width: 900px) {
  .channels-row {
    grid-template-columns: 1fr;
  }

  .support-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

@media (max-width: 640px) {
  .support-page {
    padding-right: 18px;
    padding-left: 18px;
  }

  .support-hero {
    padding-top: 40px;
  }

  .support-hero h1 {
    font-size: 30px;
  }
}
</style>
