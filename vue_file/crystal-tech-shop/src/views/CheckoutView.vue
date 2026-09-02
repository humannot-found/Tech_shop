<script setup>
import { computed, ref } from 'vue'
import {
  createStorefrontOrder,
  getStorefrontMpesaStatus,
  sendStorefrontMpesaPrompt,
} from '@/api/storefront'
import { cartItemKey, useCartStore } from '@/stores/cart'
import { useCustomerProfileStore } from '@/stores/customerProfile'

const cartStore = useCartStore()
const customerProfileStore = useCustomerProfileStore()

const form = ref({
  fullName: customerProfileStore.profile.fullName,
  phone: customerProfileStore.profile.phone,
  email: customerProfileStore.profile.email,
  deliveryMethod: customerProfileStore.profile.deliveryMethod,
  county: customerProfileStore.profile.county,
  deliveryAddress: customerProfileStore.profile.deliveryAddress,
  deliveryNotes: '',
})

const paymentMethod = ref('mpesa')
const placingOrder = ref(false)
const orderPlaced = ref(false)
const formErrors = ref({})
const checkoutError = ref('')
const paymentNotice = ref('')
const placedOrder = ref(null)
const mpesaPayment = ref(null)
const total = computed(() => cartStore.subtotal)

const checkoutButtonLabel = computed(() => {
  if (placingOrder.value && paymentMethod.value === 'mpesa') return 'Waiting for M-Pesa confirmation...'
  if (placingOrder.value) return 'Placing Order...'
  if (paymentMethod.value === 'mpesa') return `Send M-Pesa Prompt - ${formatKES(total.value)}`
  return `Place Order - ${formatKES(total.value)}`
})

function formatKES(amount) {
  return 'KES ' + amount.toLocaleString('en-KE')
}

function validate() {
  const errors = {}

  if (!cartStore.items.length) errors.cart = 'Add at least one item before checking out.'
  if (cartStore.items.some((item) => !item.variantId)) {
    errors.cart = 'One or more cart items are missing a shop SKU. Please remove and add them again.'
  }
  if (!form.value.fullName.trim()) errors.fullName = 'Required'
  if (!/^(?:\+?254|0)[17]\d{8}$/.test(form.value.phone.trim())) {
    errors.phone = 'Enter a valid Kenyan number, e.g. 0712345678 or 254712345678'
  }
  if (form.value.deliveryMethod === 'delivery') {
    if (!form.value.county.trim()) errors.county = 'Required'
    if (!form.value.deliveryAddress.trim()) errors.deliveryAddress = 'Required'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

function cleanPhone() {
  return form.value.phone.trim().replace(/^\+/, '')
}

function customerAddress() {
  const county = form.value.county.trim()
  const address = form.value.deliveryAddress.trim()

  if (form.value.deliveryMethod === 'delivery') return `${county}: ${address}`
  return address || county || null
}

function orderPayload() {
  return {
    customer: {
      full_name: form.value.fullName.trim(),
      phone: cleanPhone(),
      email: form.value.email.trim() || null,
      address: customerAddress(),
    },
    delivery_method: form.value.deliveryMethod,
    delivery_address: form.value.deliveryMethod === 'delivery' ? customerAddress() : null,
    notes: form.value.deliveryNotes.trim() || null,
    items: cartStore.items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.qty,
    })),
  }
}

function saveCheckoutProfile(order = null) {
  const phone = cleanPhone()
  customerProfileStore.updateProfile({
    fullName: form.value.fullName.trim(),
    phone,
    email: form.value.email.trim(),
    deliveryMethod: form.value.deliveryMethod,
    county: form.value.county.trim(),
    deliveryAddress: form.value.deliveryAddress.trim(),
  })
  if (order) customerProfileStore.rememberOrder(order, phone)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isFinishedPayment(status) {
  return ['completed', 'failed', 'cancelled'].includes(status?.payment_status)
}

async function pollMpesaStatus(orderNumber, phone, checkoutRequestId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await wait(3000)
    const status = await getStorefrontMpesaStatus(orderNumber, phone, checkoutRequestId)
    mpesaPayment.value = status
    placedOrder.value = status.order
    customerProfileStore.rememberOrder(status.order, phone)

    if (!isFinishedPayment(status)) continue

    if (status.payment_status === 'completed') {
      orderPlaced.value = true
      cartStore.clearCart()
      paymentNotice.value = status.customer_message || 'Payment confirmed. Your order is now paid.'
      return
    }

    checkoutError.value =
      status.result_description ||
      status.customer_message ||
      'The M-Pesa payment was not completed. You can try again.'
    return
  }

  paymentNotice.value =
    'The order was created, but we are still waiting for the M-Pesa callback. You can use the order number to follow up.'
}

async function placeOrder() {
  if (!validate()) return

  placingOrder.value = true
  checkoutError.value = ''
  paymentNotice.value = ''
  placedOrder.value = null
  mpesaPayment.value = null

  try {
    const order = await createStorefrontOrder(orderPayload())
    placedOrder.value = order
    saveCheckoutProfile(order)

    if (paymentMethod.value !== 'mpesa') {
      orderPlaced.value = true
      cartStore.clearCart()
      return
    }

    const phone = cleanPhone()
    const prompt = await sendStorefrontMpesaPrompt(order.order_number, phone, {
      phone_number: phone,
      idempotency_key: `web-${order.order_number}-${Date.now()}`,
      notes: `Website checkout for ${order.order_number}`,
    })

    mpesaPayment.value = prompt
    placedOrder.value = prompt.order
    paymentNotice.value = prompt.customer_message || 'Check your phone and enter your M-Pesa PIN.'

    await pollMpesaStatus(order.order_number, phone, prompt.checkout_request_id)
  } catch (error) {
    checkoutError.value = error.message || 'We could not place the order right now.'
  } finally {
    placingOrder.value = false
  }
}
</script>

<template>
  <main class="checkout-page">
    <div class="checkout-inner">
      <div v-if="orderPlaced" class="success-state">
        <svg
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>
        <h1>Order placed successfully</h1>
        <p v-if="placedOrder">
          Order {{ placedOrder.order_number }} has been received.
          <span v-if="paymentMethod === 'mpesa'"> Payment is confirmed.</span>
        </p>
        <p v-else>You'll receive a confirmation shortly with your order details.</p>
        <div class="success-actions">
          <RouterLink
            v-if="placedOrder"
            :to="{
              name: 'track-order',
              query: { order: placedOrder.order_number, phone: cleanPhone() },
            }"
            class="continue-btn"
          >
            Track this order
          </RouterLink>
          <RouterLink to="/account" class="continue-btn secondary">View account</RouterLink>
          <RouterLink to="/shop" class="continue-btn secondary">Continue Shopping</RouterLink>
        </div>
      </div>

      <template v-else>
        <header class="checkout-head">
          <RouterLink to="/cart" class="back-link">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.3"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Cart
          </RouterLink>
          <h1>Checkout</h1>
        </header>

        <div v-if="formErrors.cart" class="checkout-alert error">
          {{ formErrors.cart }}
        </div>

        <div v-if="checkoutError" class="checkout-alert error">
          {{ checkoutError }}
        </div>

        <div v-if="paymentNotice" class="checkout-alert">
          <strong v-if="placedOrder">Order {{ placedOrder.order_number }}</strong>
          <span>
            {{ paymentNotice }}
            <small v-if="mpesaPayment?.payment_status">
              Payment status: {{ mpesaPayment.payment_status.replace('_', ' ') }}
            </small>
          </span>
        </div>

        <div v-if="!cartStore.items.length" class="empty-notice">
          <p>Your cart is empty. Add something before checking out.</p>
          <RouterLink to="/shop" class="continue-btn">Go to Shop</RouterLink>
        </div>

        <div v-else class="checkout-layout">
          <form class="checkout-form" @submit.prevent="placeOrder">
            <section class="form-section">
              <h2>Contact &amp; Delivery</h2>

              <div class="field">
                <label for="fullName">Full Name</label>
                <input id="fullName" v-model="form.fullName" type="text" placeholder="Jane Wanjiru" />
                <span v-if="formErrors.fullName" class="field-error">{{ formErrors.fullName }}</span>
              </div>

              <div class="field-row">
                <div class="field">
                  <label for="phone">Phone Number</label>
                  <input id="phone" v-model="form.phone" type="tel" placeholder="0712345678" />
                  <span v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</span>
                </div>

                <div class="field">
                  <label for="email">Email (optional)</label>
                  <input id="email" v-model="form.email" type="email" placeholder="jane@example.com" />
                </div>
              </div>

              <div class="field">
                <label>Delivery Option</label>
                <div class="payment-options compact">
                  <label class="payment-option" :class="{ active: form.deliveryMethod === 'pickup' }">
                    <input v-model="form.deliveryMethod" type="radio" value="pickup" />
                    <span class="option-label">
                      <strong>Pickup from shop</strong>
                      <span>Reserve the order and collect from the branch.</span>
                    </span>
                  </label>

                  <label class="payment-option" :class="{ active: form.deliveryMethod === 'delivery' }">
                    <input v-model="form.deliveryMethod" type="radio" value="delivery" />
                    <span class="option-label">
                      <strong>Delivery</strong>
                      <span>The shop confirms delivery cost and timing.</span>
                    </span>
                  </label>
                </div>
              </div>

              <div class="field">
                <label for="county">County</label>
                <input id="county" v-model="form.county" type="text" placeholder="Nairobi" />
                <span v-if="formErrors.county" class="field-error">{{ formErrors.county }}</span>
              </div>

              <div class="field">
                <label for="address">
                  {{ form.deliveryMethod === 'delivery' ? 'Delivery Address' : 'Pickup Notes / Area' }}
                </label>
                <input
                  id="address"
                  v-model="form.deliveryAddress"
                  type="text"
                  :placeholder="
                    form.deliveryMethod === 'delivery'
                      ? 'Street, building, apartment no.'
                      : 'Optional: area or pickup preference'
                  "
                />
                <span v-if="formErrors.deliveryAddress" class="field-error">
                  {{ formErrors.deliveryAddress }}
                </span>
              </div>

              <div class="field">
                <label for="notes">Delivery Notes (optional)</label>
                <textarea
                  id="notes"
                  v-model="form.deliveryNotes"
                  rows="2"
                  placeholder="Gate code, landmark, preferred time"
                ></textarea>
              </div>
            </section>

            <section class="form-section">
              <h2>Payment Method</h2>

              <div class="payment-options">
                <label class="payment-option" :class="{ active: paymentMethod === 'mpesa' }">
                  <input v-model="paymentMethod" type="radio" value="mpesa" />
                  <span class="option-label">
                    <strong>M-Pesa</strong>
                    <span>Pay instantly via STK Push</span>
                  </span>
                </label>

                <label class="payment-option" :class="{ active: paymentMethod === 'flutterwave' }">
                  <input v-model="paymentMethod" type="radio" value="flutterwave" disabled />
                  <span class="option-label">
                    <strong>Card Payment</strong>
                    <span>Coming after the card gateway is configured.</span>
                  </span>
                </label>

                <label class="payment-option" :class="{ active: paymentMethod === 'cod' }">
                  <input v-model="paymentMethod" type="radio" value="cod" />
                  <span class="option-label">
                    <strong>Cash on Delivery</strong>
                    <span>Pay when your order arrives</span>
                  </span>
                </label>
              </div>
            </section>

            <button type="submit" class="place-order-btn" :disabled="placingOrder">
              {{ checkoutButtonLabel }}
            </button>
          </form>

          <aside class="summary">
            <h2>Order Summary</h2>

            <div class="summary-items">
              <div
                v-for="item in cartStore.items"
                :key="cartItemKey(item)"
                class="summary-item"
              >
                <span class="item-name">
                  {{ item.name }}
                  <small v-if="item.variant">{{ item.variant }}</small>
                  <span class="item-qty">x {{ item.qty }}</span>
                </span>
                <span class="item-price">{{ formatKES(item.price * item.qty) }}</span>
              </div>
            </div>

            <div class="summary-line">
              <span>Subtotal</span>
              <span>{{ formatKES(cartStore.subtotal) }}</span>
            </div>

            <div class="summary-line">
              <span>Delivery</span>
              <span>Confirmed by staff</span>
            </div>

            <div class="summary-total">
              <span>Total</span>
              <span>{{ formatKES(total) }}</span>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.checkout-page {
  width: 100%;
  background: #f7f5f2;
}

.checkout-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 32px 72px;
}

.checkout-head {
  margin-bottom: 28px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: #6b6b6f;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
}

.back-link:hover {
  color: #ee6c1f;
}

h1 {
  margin: 0;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(26px, 3.5vw, 34px);
  font-weight: 400;
  letter-spacing: 0;
}

.checkout-alert {
  display: flex;
  gap: 8px;
  align-items: baseline;
  border: 1px solid #f1c29f;
  border-radius: 8px;
  background: #fff7f0;
  color: #9d4411;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 16px;
  padding: 12px 14px;
}

.checkout-alert.error {
  border-color: #f2b8ad;
  background: #fff4f2;
  color: #b3392c;
}

.checkout-alert small {
  display: block;
  margin-top: 3px;
  text-transform: capitalize;
}

.checkout-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 40px;
  align-items: start;
}

.form-section {
  margin-bottom: 32px;
}

.form-section h2,
.summary h2 {
  margin: 0 0 18px;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.field-error {
  color: #d64536;
  font-size: 11.5px;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.payment-options.compact {
  gap: 8px;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 14px 16px;
  background: #fff;
  cursor: pointer;
}

.payment-option.active {
  border-color: #ee6c1f;
  background: #fdf1e7;
}

.payment-option:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.62;
}

.payment-option input {
  width: auto;
}

.option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label strong {
  color: #17181c;
  font-size: 13.5px;
}

.option-label span:last-child {
  color: #6b6b6f;
  font-size: 12px;
}

.place-order-btn {
  width: 100%;
  border: none;
  border-radius: 6px;
  padding: 16px 0;
  background: #ee6c1f;
  color: #fff;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.place-order-btn:hover:not(:disabled) {
  background: #d65a12;
}

.place-order-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.summary {
  position: sticky;
  top: 90px;
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 24px;
  background: #fff;
}

.summary-items {
  display: flex;
  max-height: 220px;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  overflow-y: auto;
  border-bottom: 1px solid #e1dfdc;
}

.summary-item,
.summary-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #4a4a4d;
  font-size: 13px;
}

.summary-line {
  padding: 6px 0;
}

.item-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.item-name small {
  color: #6b6b6f;
  font-size: 11.5px;
}

.item-qty {
  color: #6b6b6f;
}

.item-price {
  font-weight: 700;
  white-space: nowrap;
}

.summary-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid #e1dfdc;
}

.summary-total span:first-child {
  color: #17181c;
  font-size: 14px;
  font-weight: 700;
}

.summary-total span:last-child {
  color: #17181c;
  font-size: 19px;
  font-weight: 800;
}

.empty-notice,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-notice p,
.success-state p {
  max-width: 420px;
  margin: 0 0 24px;
  color: #6b6b6f;
  font-size: 14px;
}

.success-state {
  color: #22a854;
}

.success-state h1 {
  margin: 18px 0 8px;
}

.continue-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  padding: 13px 28px;
  background: #17181c;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-decoration: none;
  text-transform: uppercase;
}

.success-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.continue-btn.secondary {
  border: 1px solid #e1dfdc;
  background: #fff;
  color: #17181c;
}

.continue-btn:hover {
  background: #ee6c1f;
}

.continue-btn.secondary:hover {
  border-color: #ee6c1f;
  background: #fff7f0;
  color: #9d4411;
}

@media (max-width: 860px) {
  .checkout-inner {
    padding: 24px 18px 56px;
  }

  .checkout-layout {
    grid-template-columns: 1fr;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .summary {
    position: static;
  }
}
</style>
