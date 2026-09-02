<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getStorefrontOrder } from '@/api/storefront'
import { useCustomerProfileStore } from '@/stores/customerProfile'

const route = useRoute()
const profileStore = useCustomerProfileStore()

const form = ref({
  orderNumber: String(route.query.order || ''),
  phone: String(route.query.phone || profileStore.defaultPhone || ''),
})
const order = ref(null)
const loading = ref(false)
const error = ref('')

const timeline = computed(() => {
  const item = order.value
  const status = item?.status
  const fulfillment = item?.fulfillment_status
  const paid = ['paid', 'completed'].includes(status) || Number(item?.balance_due || 0) <= 0
  const allocated = ['allocated', 'ready', 'fulfilled'].includes(fulfillment)
  const ready = ['ready', 'fulfilled'].includes(fulfillment)
  const fulfilled = fulfillment === 'fulfilled' || status === 'completed'
  const cancelled = status === 'cancelled' || fulfillment === 'cancelled'

  return [
    {
      title: 'Order received',
      body: 'Your order was created in the shop system.',
      state: item ? 'done' : 'pending',
    },
    {
      title: 'Payment confirmed',
      body: paid ? 'Payment is complete.' : 'Payment is still pending.',
      state: paid ? 'done' : cancelled ? 'muted' : 'current',
    },
    {
      title: 'Stock allocated',
      body: allocated ? 'Items have been set aside.' : 'Staff will allocate stock after payment.',
      state: allocated ? 'done' : paid ? 'current' : 'pending',
    },
    {
      title: 'Ready',
      body: ready ? 'Order is ready for pickup or dispatch.' : 'The order is not ready yet.',
      state: ready ? 'done' : allocated ? 'current' : 'pending',
    },
    {
      title: 'Fulfilled',
      body: fulfilled ? 'Order has been collected or dispatched.' : 'Final handover is pending.',
      state: fulfilled ? 'done' : ready ? 'current' : 'pending',
    },
  ]
})

function formatKES(amount) {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE')
}

function formatDate(value) {
  if (!value) return 'Date not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date not available'

  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function label(value) {
  return String(value || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function cleanPhone() {
  return form.value.phone.trim().replace(/^\+/, '')
}

async function trackOrder() {
  const orderNumber = form.value.orderNumber.trim()
  const phone = cleanPhone()

  if (!orderNumber || !phone) {
    error.value = 'Enter the order number and the phone number used at checkout.'
    return
  }

  loading.value = true
  error.value = ''
  order.value = null

  try {
    const data = await getStorefrontOrder(orderNumber, phone)
    order.value = data
    profileStore.rememberOrder(data, phone)
    if (!profileStore.profile.phone) {
      profileStore.updateProfile({
        fullName: data.customer?.full_name || '',
        phone,
        email: data.customer?.email || '',
      })
    }
  } catch (err) {
    error.value =
      err.message ||
      'We could not find that order. Confirm the order number and phone number.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (form.value.orderNumber && form.value.phone) {
    trackOrder()
  }
})
</script>

<template>
  <main class="track-page">
    <section class="track-hero">
      <div>
        <p class="eyebrow">Order tracking</p>
        <h1>Track your Crystal Tech order</h1>
        <p>
          Enter your website order number and the phone number used at checkout.
          The status is read directly from the shop system.
        </p>
      </div>
    </section>

    <section class="track-layout">
      <form class="track-card track-form" @submit.prevent="trackOrder">
        <div class="card-heading">
          <p class="eyebrow">Lookup</p>
          <h2>Find an order</h2>
        </div>

        <div class="field">
          <label for="track-order-number">Order number</label>
          <input
            id="track-order-number"
            v-model="form.orderNumber"
            name="orderNumber"
            type="text"
            placeholder="WEB-20260902-ABC123"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="track-order-phone">Phone number</label>
          <input
            id="track-order-phone"
            v-model="form.phone"
            name="phone"
            type="tel"
            placeholder="0712345678"
            autocomplete="tel"
          />
        </div>

        <button type="submit" class="primary-btn" :disabled="loading">
          {{ loading ? 'Checking order...' : 'Track order' }}
        </button>

        <p class="lookup-note">
          For privacy, tracking requires the same phone number used when placing
          the order.
        </p>
      </form>

      <section class="track-card order-result">
        <div v-if="error" class="track-alert error">
          {{ error }}
        </div>

        <div v-if="loading" class="empty-state">
          Checking the live order status...
        </div>

        <div v-else-if="!order" class="empty-state">
          <strong>No order selected yet.</strong>
          <span>Use the form to view payment, fulfillment, and item details.</span>
        </div>

        <template v-else>
          <div class="order-head">
            <div>
              <p class="eyebrow">Order {{ order.order_number }}</p>
              <h2>{{ label(order.status) }}</h2>
              <span>Created {{ formatDate(order.created_at) }}</span>
            </div>
            <div class="status-chip">
              {{ label(order.fulfillment_status) }}
            </div>
          </div>

          <div class="order-summary-grid">
            <div>
              <span>Total</span>
              <strong>{{ formatKES(order.total_amount) }}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{{ formatKES(order.paid_amount) }}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong>{{ formatKES(order.balance_due) }}</strong>
            </div>
          </div>

          <div class="tracking-timeline">
            <article
              v-for="step in timeline"
              :key="step.title"
              class="timeline-step"
              :class="step.state"
            >
              <span class="timeline-dot"></span>
              <div>
                <strong>{{ step.title }}</strong>
                <span>{{ step.body }}</span>
              </div>
            </article>
          </div>

          <div class="customer-panel">
            <div>
              <span>Customer</span>
              <strong>{{ order.customer.full_name }}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{{ order.customer.phone }}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong>{{ label(order.delivery_method) }}</strong>
            </div>
            <div v-if="order.delivery_address">
              <span>Address</span>
              <strong>{{ order.delivery_address }}</strong>
            </div>
          </div>

          <div class="order-items">
            <h3>Items</h3>
            <article v-for="item in order.items" :key="item.variant_id" class="order-item">
              <div>
                <strong>{{ item.product_name }}</strong>
                <span>{{ item.variant_name }} · {{ item.sku }}</span>
              </div>
              <div>
                <span>x {{ item.quantity }}</span>
                <strong>{{ formatKES(item.line_total) }}</strong>
              </div>
            </article>
          </div>
        </template>
      </section>
    </section>
  </main>
</template>

<style scoped>
.track-page {
  min-height: 70vh;
  background: #f7f5f2;
  color: #17181c;
  padding: 34px 32px 72px;
}

.track-hero,
.track-layout {
  max-width: 1180px;
  margin-inline: auto;
}

.track-hero {
  margin-bottom: 20px;
}

.track-hero p:last-child {
  max-width: 680px;
  margin: 14px 0 0;
  color: #6b6b6f;
  line-height: 1.7;
}

.eyebrow {
  margin: 0 0 8px;
  color: #ee6c1f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 400;
}

h1 {
  max-width: 760px;
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1.04;
}

h2 {
  font-size: 25px;
}

h3 {
  font-size: 19px;
}

.track-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.65fr) minmax(0, 1.35fr);
  gap: 18px;
  align-items: start;
}

.track-card {
  border: 1px solid #e1dfdc;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(23, 24, 28, 0.08);
  padding: 22px;
}

.card-heading {
  margin-bottom: 18px;
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

label {
  color: #4f5056;
  font-size: 13px;
  font-weight: 800;
}

input {
  width: 100%;
  min-height: 44px;
  border: 1px solid #d8d4ce;
  border-radius: 8px;
  background: #fff;
  color: #17181c;
  font: inherit;
  padding: 0 12px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

input:focus {
  outline: none;
  border-color: #ee6c1f;
  box-shadow: 0 0 0 3px rgba(238, 108, 31, 0.14);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  border: 1px solid #17181c;
  border-radius: 7px;
  background: #17181c;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.lookup-note {
  margin: 14px 0 0;
  color: #777273;
  font-size: 12px;
  line-height: 1.6;
}

.track-alert {
  border: 1px solid #f1c29f;
  border-radius: 8px;
  background: #fff7f0;
  color: #9d4411;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 12px 14px;
}

.track-alert.error {
  border-color: #f1b8b8;
  background: #fff0f0;
  color: #9a1f1f;
}

.empty-state {
  display: grid;
  gap: 6px;
  border: 1px dashed #d8d4ce;
  border-radius: 10px;
  color: #6b6b6f;
  min-height: 220px;
  place-content: center;
  text-align: center;
  padding: 28px;
}

.empty-state strong {
  color: #17181c;
}

.order-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e1dfdc;
  padding-bottom: 18px;
}

.order-head span {
  display: block;
  color: #6b6b6f;
  font-size: 13px;
  margin-top: 6px;
}

.status-chip {
  border: 1px solid #f1c29f;
  border-radius: 999px;
  background: #fff7f0;
  color: #9d4411;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.05em;
  padding: 8px 12px;
  text-transform: uppercase;
}

.order-summary-grid,
.customer-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.customer-panel {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.order-summary-grid div,
.customer-panel div {
  display: grid;
  gap: 5px;
  border: 1px solid #e1dfdc;
  border-radius: 10px;
  background: #fbfaf8;
  padding: 12px;
}

.order-summary-grid span,
.customer-panel span,
.order-item span,
.timeline-step span {
  color: #6b6b6f;
  font-size: 13px;
}

.tracking-timeline {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.timeline-step {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  color: #6b6b6f;
}

.timeline-dot {
  width: 14px;
  height: 14px;
  border: 2px solid #d8d4ce;
  border-radius: 50%;
  margin-top: 2px;
}

.timeline-step.done .timeline-dot {
  border-color: #26a269;
  background: #26a269;
}

.timeline-step.current .timeline-dot {
  border-color: #ee6c1f;
  box-shadow: 0 0 0 5px rgba(238, 108, 31, 0.14);
}

.timeline-step.muted {
  opacity: 0.55;
}

.timeline-step div {
  display: grid;
  gap: 3px;
}

.timeline-step strong {
  color: #17181c;
}

.order-items {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}

.order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #e1dfdc;
  padding-top: 12px;
}

.order-item div {
  display: grid;
  gap: 4px;
}

.order-item div:last-child {
  text-align: right;
}

@media (max-width: 860px) {
  .track-page {
    padding: 28px 18px 56px;
  }

  .track-layout,
  .order-summary-grid,
  .customer-panel {
    grid-template-columns: 1fr;
  }

  .order-head,
  .order-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .order-item div:last-child {
    text-align: left;
  }
}
</style>
