<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerProfileStore } from '@/stores/customerProfile'

const router = useRouter()
const profileStore = useCustomerProfileStore()

const profileForm = ref({ ...profileStore.profile })
const lookupForm = ref({
  orderNumber: '',
  phone: profileStore.defaultPhone,
})
const notice = ref('')

const recentOrders = computed(() => profileStore.recentOrders)

function formatKES(amount) {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE')
}

function label(value) {
  return String(value || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function saveProfile() {
  profileStore.updateProfile(profileForm.value)
  lookupForm.value.phone = profileStore.defaultPhone
  notice.value = 'Profile saved on this device. Checkout forms will use these details.'
}

function clearProfile() {
  profileStore.clearProfile()
  profileForm.value = { ...profileStore.profile }
  lookupForm.value.phone = profileStore.defaultPhone
  notice.value = 'Profile details cleared from this device.'
}

function trackOrder(order) {
  router.push({
    name: 'track-order',
    query: {
      order: order.orderNumber,
      phone: order.phone || profileStore.defaultPhone,
    },
  })
}

function trackManualOrder() {
  const order = lookupForm.value.orderNumber.trim()
  const phone = lookupForm.value.phone.trim()
  if (!order || !phone) {
    notice.value = 'Enter both the order number and phone number used at checkout.'
    return
  }

  router.push({
    name: 'track-order',
    query: { order, phone },
  })
}
</script>

<template>
  <main class="account-page">
    <section class="account-hero">
      <p class="eyebrow">My account</p>
      <h1>Your Crystal Tech profile</h1>
      <p>
        Save your checkout details on this browser, keep recent website orders close,
        and jump straight into live order tracking.
      </p>
    </section>

    <section v-if="notice" class="account-notice">
      {{ notice }}
    </section>

    <section class="account-grid">
      <form class="account-card profile-card" @submit.prevent="saveProfile">
        <div class="card-heading">
          <p class="eyebrow">Checkout details</p>
          <h2>Profile</h2>
        </div>

        <div class="field">
          <label for="account-full-name">Full name</label>
          <input
            id="account-full-name"
            v-model="profileForm.fullName"
            name="fullName"
            type="text"
            placeholder="Jane Wanjiru"
            autocomplete="name"
          />
        </div>

        <div class="field-row">
          <div class="field">
            <label for="account-phone">Phone number</label>
            <input
              id="account-phone"
              v-model="profileForm.phone"
              name="phone"
              type="tel"
              placeholder="0712345678"
              autocomplete="tel"
            />
          </div>

          <div class="field">
            <label for="account-email">Email</label>
            <input
              id="account-email"
              v-model="profileForm.email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              autocomplete="email"
            />
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="account-delivery-method">Preferred delivery</label>
            <select
              id="account-delivery-method"
              v-model="profileForm.deliveryMethod"
              name="deliveryMethod"
            >
              <option value="pickup">Pickup from shop</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          <div class="field">
            <label for="account-county">County</label>
            <input
              id="account-county"
              v-model="profileForm.county"
              name="county"
              type="text"
              placeholder="Nairobi"
              autocomplete="address-level1"
            />
          </div>
        </div>

        <div class="field">
          <label for="account-address">Delivery address / pickup notes</label>
          <input
            id="account-address"
            v-model="profileForm.deliveryAddress"
            name="deliveryAddress"
            type="text"
            placeholder="Street, building, apartment, or pickup note"
            autocomplete="street-address"
          />
        </div>

        <div class="account-actions">
          <button type="submit" class="primary-btn">Save profile</button>
          <button type="button" class="ghost-btn" @click="clearProfile">Clear</button>
        </div>

        <p class="privacy-note">
          This first version is device-based. A full customer login can come later when
          we add customer authentication to the backend.
        </p>
      </form>

      <aside class="account-card account-help-card">
        <div class="card-heading">
          <p class="eyebrow">Quick lookup</p>
          <h2>Track any order</h2>
        </div>

        <div class="lookup-form">
          <div class="field">
            <label for="account-order-number">Order number</label>
            <input
              id="account-order-number"
              v-model="lookupForm.orderNumber"
              name="orderNumber"
              type="text"
              placeholder="WEB-20260902-ABC123"
            />
          </div>
          <div class="field">
            <label for="account-order-phone">Phone used at checkout</label>
            <input
              id="account-order-phone"
              v-model="lookupForm.phone"
              name="orderPhone"
              type="tel"
              placeholder="0712345678"
              autocomplete="tel"
            />
          </div>
          <button type="button" class="primary-btn wide" @click="trackManualOrder">
            Track order
          </button>
        </div>

        <div class="account-mini-guide">
          <strong>How this account works</strong>
          <span>Checkout details are saved only on this browser.</span>
          <span>Order tracking still checks live backend data.</span>
          <span>Staff can manage the same order from the internal Online Orders desk.</span>
        </div>
      </aside>
    </section>

    <section class="account-card recent-orders-card">
      <div class="card-heading horizontal">
        <div>
          <p class="eyebrow">Recent orders</p>
          <h2>Orders saved on this device</h2>
        </div>
        <RouterLink to="/shop" class="text-link">Continue shopping</RouterLink>
      </div>

      <div v-if="recentOrders.length" class="recent-order-list">
        <article v-for="order in recentOrders" :key="order.orderNumber" class="recent-order">
          <div>
            <strong>{{ order.orderNumber }}</strong>
            <span>{{ label(order.status) }} · {{ label(order.fulfillmentStatus) }}</span>
          </div>
          <div>
            <strong>{{ formatKES(order.totalAmount) }}</strong>
            <span v-if="order.balanceDue > 0">{{ formatKES(order.balanceDue) }} due</span>
            <span v-else>Paid or no balance due</span>
          </div>
          <button type="button" @click="trackOrder(order)">Track</button>
        </article>
      </div>

      <div v-else class="empty-account-state">
        <p>No website orders have been saved on this device yet.</p>
        <RouterLink to="/shop" class="primary-btn">Browse products</RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.account-page {
  min-height: 70vh;
  background: #f7f5f2;
  color: #17181c;
  padding: 34px 32px 72px;
}

.account-hero,
.account-grid,
.recent-orders-card,
.account-notice {
  max-width: 1180px;
  margin-inline: auto;
}

.account-hero {
  margin-bottom: 20px;
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
h2 {
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
  font-size: 24px;
}

.account-hero p:last-child {
  max-width: 680px;
  margin: 14px 0 0;
  color: #6b6b6f;
  line-height: 1.7;
}

.account-notice {
  border: 1px solid #f1c29f;
  border-radius: 10px;
  background: #fff7f0;
  color: #9d4411;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 12px 14px;
}

.account-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.8fr);
  gap: 18px;
  align-items: start;
}

.account-card {
  border: 1px solid #e1dfdc;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(23, 24, 28, 0.08);
  padding: 22px;
}

.card-heading {
  margin-bottom: 18px;
}

.card-heading.horizontal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.field,
.lookup-form {
  display: grid;
  gap: 8px;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.field + .field,
.field-row + .field {
  margin-top: 14px;
}

label {
  color: #4f5056;
  font-size: 13px;
  font-weight: 800;
}

input,
select {
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

input:focus,
select:focus {
  outline: none;
  border-color: #ee6c1f;
  box-shadow: 0 0 0 3px rgba(238, 108, 31, 0.14);
}

.account-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.primary-btn,
.ghost-btn,
.recent-order button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border-radius: 7px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  padding: 0 16px;
}

.primary-btn {
  border: 1px solid #17181c;
  background: #17181c;
  color: #fff;
}

.ghost-btn {
  border: 1px solid #d8d4ce;
  background: #fff;
  color: #17181c;
}

.wide {
  width: 100%;
}

.privacy-note {
  margin: 16px 0 0;
  color: #777273;
  font-size: 12px;
  line-height: 1.6;
}

.lookup-form {
  gap: 14px;
}

.account-mini-guide {
  display: grid;
  gap: 8px;
  margin-top: 20px;
  border-top: 1px solid #e1dfdc;
  color: #6b6b6f;
  font-size: 13px;
  line-height: 1.5;
  padding-top: 18px;
}

.account-mini-guide strong {
  color: #17181c;
}

.recent-orders-card {
  margin-top: 18px;
}

.text-link {
  color: #ee6c1f;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.recent-order-list {
  display: grid;
  gap: 10px;
}

.recent-order {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(180px, 0.7fr) auto;
  align-items: center;
  gap: 14px;
  border: 1px solid #e1dfdc;
  border-radius: 10px;
  padding: 14px;
}

.recent-order div {
  display: grid;
  gap: 4px;
}

.recent-order span {
  color: #6b6b6f;
  font-size: 13px;
}

.recent-order button {
  border: 1px solid #ee6c1f;
  background: #fff7f0;
  color: #9d4411;
}

.empty-account-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px dashed #d8d4ce;
  border-radius: 10px;
  color: #6b6b6f;
  padding: 18px;
}

.empty-account-state p {
  margin: 0;
}

@media (max-width: 860px) {
  .account-page {
    padding: 28px 18px 56px;
  }

  .account-grid,
  .field-row,
  .recent-order {
    grid-template-columns: 1fr;
  }

  .card-heading.horizontal,
  .empty-account-state {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
