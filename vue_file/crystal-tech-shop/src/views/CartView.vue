<script setup>
/**
 * CartView.vue
 * Crystal Tech Shop cart page.
 */
import { computed, ref } from 'vue'
import { cartItemKey, useCartStore } from '@/stores/cart'

const cartStore = useCartStore()

const promoCode = ref('')
const promoMessage = ref('')
const total = computed(() => cartStore.subtotal)

function formatKES(amount) {
  return 'KES ' + amount.toLocaleString('en-KE')
}

function applyPromo() {
  promoMessage.value = promoCode.value.trim()
    ? 'Promo codes are not active yet. The checkout will use the live system total.'
    : 'Enter a promo code once offers are enabled.'
}
</script>

<template>
  <div class="cart-page">
    <div class="cart-inner">
      <h1>Your Cart</h1>

      <div v-if="cartStore.items.length" class="cart-layout">
        <div class="cart-items">
          <div class="cart-items-head">
            <span>Product</span>
            <span>Price</span>
            <span>Qty</span>
            <span>Subtotal</span>
            <span></span>
          </div>

          <div v-for="item in cartStore.items" :key="cartItemKey(item)" class="cart-row">
            <div class="cart-product">
              <div class="thumb" aria-hidden="true">
                <img v-if="item.image" :src="item.image" :alt="item.name" />
                <svg
                  v-else
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>

              <div>
                <p class="product-name">{{ item.name }}</p>
                <p v-if="item.variant && item.variant !== '{}'" class="product-variant">
                  {{ item.variant }}
                </p>
                <p v-if="item.sku" class="product-variant">SKU {{ item.sku }}</p>
                <p v-if="item.availableQuantity !== null" class="stock-note">
                  {{ item.availableQuantity }} available online
                </p>
              </div>
            </div>

            <span class="cell-price">{{ formatKES(item.price) }}</span>

            <div class="qty-control">
              <button
                aria-label="Decrease quantity"
                @click="cartStore.updateQty(item.productId, item.qty - 1, item.variant, item.variantId)"
              >
                -
              </button>
              <span>{{ item.qty }}</span>
              <button
                aria-label="Increase quantity"
                :disabled="item.availableQuantity !== null && item.qty >= item.availableQuantity"
                @click="cartStore.updateQty(item.productId, item.qty + 1, item.variant, item.variantId)"
              >
                +
              </button>
            </div>

            <span class="cell-subtotal">{{ formatKES(item.price * item.qty) }}</span>

            <button
              class="remove-btn"
              aria-label="Remove item"
              @click="cartStore.removeItem(item.productId, item.variant, item.variantId)"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <RouterLink to="/shop" class="continue-link">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Continue Shopping
          </RouterLink>
        </div>

        <aside class="summary">
          <h3>Order Summary</h3>

          <div class="promo-row">
            <input v-model="promoCode" type="text" placeholder="Promo code" @keyup.enter="applyPromo" />
            <button @click="applyPromo">Apply</button>
          </div>
          <p v-if="promoMessage" class="promo-msg">{{ promoMessage }}</p>

          <div class="summary-line">
            <span>Subtotal</span>
            <span>{{ formatKES(cartStore.subtotal) }}</span>
          </div>
          <div class="summary-line">
            <span>Delivery</span>
            <span>Confirmed by staff</span>
          </div>

          <p class="free-delivery-note">
            The payment amount is pulled from the backend so the receipt and M-Pesa prompt stay aligned.
          </p>

          <div class="summary-total">
            <span>Total</span>
            <span>{{ formatKES(total) }}</span>
          </div>

          <RouterLink to="/checkout" class="checkout-btn">
            Proceed to Checkout
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

          <p class="mpesa-note">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Pay securely via M-Pesa at checkout
          </p>
        </aside>
      </div>

      <div v-else class="empty-cart">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything yet.</p>
        <RouterLink to="/shop" class="shop-now-btn">Start Shopping</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 32px 72px;
}

h1 {
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(26px, 3.5vw, 34px);
  font-weight: 400;
  margin: 0 0 28px;
}

.cart-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 40px;
  align-items: start;
}

.cart-items-head {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1fr 1fr 36px;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e1dfdc;
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cart-row {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1fr 1fr 36px;
  gap: 12px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid #eeece9;
}

.cart-product {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: #f2f1ef;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9c7c3;
  flex: 0 0 auto;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-name {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}

.product-variant {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  margin: 2px 0 0;
}

.stock-note {
  color: #1a7d3d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  margin: 3px 0 0;
}

.cell-price,
.cell-subtotal {
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
}

.cell-subtotal {
  font-weight: 700;
}

.qty-control {
  display: flex;
  align-items: center;
  border: 1px solid #e1dfdc;
  border-radius: 6px;
  width: fit-content;
  overflow: hidden;
}

.qty-control button {
  width: 28px;
  height: 32px;
  background: #fff;
  border: none;
  color: #17181c;
  cursor: pointer;
  font-size: 14px;
}

.qty-control button:hover {
  background: #f2f1ef;
}

.qty-control button:disabled {
  color: #c9c7c3;
  cursor: not-allowed;
}

.qty-control span {
  width: 26px;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
}

.remove-btn {
  background: none;
  border: none;
  color: #a5a3a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  color: #d64536;
}

.continue-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  color: #17181c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.continue-link:hover {
  color: #ee6c1f;
}

.summary {
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  padding: 24px;
  position: sticky;
  top: 90px;
  background: #fff;
}

.summary h3 {
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  font-weight: 400;
  margin: 0 0 18px;
}

.promo-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.promo-row input {
  flex: 1;
  min-width: 0;
  border: 1px solid #e1dfdc;
  border-radius: 6px;
  padding: 9px 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
}

.promo-row button {
  background: #17181c;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
  padding: 0 16px;
}

.promo-row button:hover {
  background: #ee6c1f;
}

.promo-msg {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  margin: 0 0 14px;
}

.promo-msg.error {
  color: #d64536;
}

.promo-msg.success {
  color: #1a7d3d;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  color: #4a4a4d;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  padding: 8px 0;
}

.summary-line.discount {
  color: #1a7d3d;
}

.free-delivery-note {
  color: #ee6c1f;
  background: #fdf1e7;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  margin: 10px 0;
  padding: 8px 10px;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 14px 0;
  margin-top: 6px;
  border-top: 1px solid #e1dfdc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

.summary-total span:first-child {
  color: #17181c;
  font-size: 14px;
  font-weight: 600;
}

.summary-total span:last-child {
  color: #17181c;
  font-size: 19px;
  font-weight: 700;
}

.checkout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #ee6c1f;
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  padding: 14px 0;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: 10px;
}

.checkout-btn:hover {
  background: #d65a12;
}

.mpesa-note {
  display: flex;
  align-items: center;
  gap: 7px;
  justify-content: center;
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 11.5px;
  margin: 14px 0 0;
}

.mpesa-note svg {
  color: #ee6c1f;
  flex: 0 0 auto;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 80px 20px;
  color: #a5a3a0;
}

.empty-cart h2 {
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 400;
  margin: 20px 0 8px;
}

.empty-cart p {
  color: #6b6b6f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  margin: 0 0 22px;
}

.shop-now-btn {
  background: #17181c;
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  padding: 13px 28px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.shop-now-btn:hover {
  background: #ee6c1f;
}

@media (max-width: 900px) {
  .cart-page {
    padding: 28px 18px 56px;
  }

  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-items-head {
    display: none;
  }

  .cart-row {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 18px 0;
    position: relative;
  }

  .remove-btn {
    position: absolute;
    top: 18px;
    right: 0;
  }

  .summary {
    position: static;
  }
}
</style>
