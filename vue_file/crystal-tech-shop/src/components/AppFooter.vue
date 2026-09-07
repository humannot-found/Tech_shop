<script setup>
/**
 * AppFooter.vue
 * Crystal Tech Shop site footer.
 */
const year = new Date().getFullYear()

const quickLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Shop', to: '/shop' },
  { label: 'Support', to: '/support' },
  { label: 'Track Order', to: '/track-order' },
]

const policies = [
  { label: 'Returns & Refunds', to: '/policies/returns' },
  { label: 'Warranty Policy', to: '/policies/warranty' },
  { label: 'Shipping & Delivery', to: '/policies/shipping' },
  { label: 'Privacy Policy', to: '/policies/privacy' },
]
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <RouterLink to="/" class="logo">
          <span class="logo-mark" aria-hidden="true"></span>
          <span class="logo-text-block">
            <span class="logo-name"><span class="crystal-word">CRYSTAL</span> TECH</span>
            <span class="logo-sub">SHOP</span>
          </span>
        </RouterLink>
        <p class="brand-blurb">Genuine electronics &amp; accessories, delivered across Kenya.</p>
      </div>

      <div class="footer-col">
        <h4>Quick Links</h4>
        <RouterLink v-for="l in quickLinks" :key="l.to" :to="l.to">{{ l.label }}</RouterLink>
      </div>

      <div class="footer-col">
        <h4>Policies</h4>
        <RouterLink v-for="p in policies" :key="p.to" :to="p.to">{{ p.label }}</RouterLink>
      </div>

      <div class="footer-col">
        <h4>Contact</h4>
        <a href="tel:+254140428465" class="contact-line">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.5 2.9.6a2 2 0 0 1 1.7 2z"
            />
          </svg>
          0140 428 465
        </a>
        <a href="mailto:hello@crystaltechshop.co.ke" class="contact-line">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M4 4h16v16H4z" />
            <path d="m22 6-10 7L2 6" />
          </svg>
          hello@crystaltechshop.co.ke
        </a>
        <a href="#" class="contact-line">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Highway Mall along Mirema, Roysambu
        </a>
      </div>
    </div>

    <div class="footer-bottom">
      <p>&copy; {{ year }} Crystal Tech Shop. All rights reserved.</p>
      <div class="socials">
        <a href="#" aria-label="Instagram">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" />
          </svg>
        </a>
        <a href="#" aria-label="Facebook">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>
        <a href="#" aria-label="WhatsApp">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #17181c;
  color: rgba(255, 255, 255, 0.7);
}

.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 32px 40px;
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1.2fr;
  gap: 32px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #fff;
}

.logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(155deg, #ee6c1f, #d65a12);
  flex-shrink: 0;
  position: relative;
}

.logo-mark::after {
  content: '';
  position: absolute;
  top: 7px;
  left: 7px;
  right: 7px;
  bottom: 7px;
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  border-radius: 4px;
  transform: rotate(45deg);
}

.logo-text-block {
  line-height: 1.05;
  font-family: Georgia, 'Times New Roman', serif;
}

.logo-name {
  font-size: 17px;
  font-weight: 700;
  display: block;
  color: #fff;
}

.crystal-word {
  background: linear-gradient(90deg, #fff3e6, #ffb26b, #ee6c1f, #ffd7b0, #fff3e6);
  background-size: 300% 100%;
  background-clip: text;
  color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: crystal-shimmer 4s ease-in-out infinite;
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

@media (prefers-reduced-motion: reduce) {
  .crystal-word {
    animation: none;
    background-position: 0% 50%;
  }
}

.logo-sub {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 9px;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.brand-blurb {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  max-width: 260px;
  margin: 0;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-col h4 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  font-weight: 400;
  color: #fff;
  margin: 0 0 4px;
}

.footer-col a {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.15s ease;
}

.footer-col a:hover {
  color: #ee6c1f;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-bottom p {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.socials {
  display: flex;
  gap: 14px;
}

.socials a {
  color: rgba(255, 255, 255, 0.55);
  transition: color 0.15s ease;
}

.socials a:hover {
  color: #ee6c1f;
}

@media (max-width: 900px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .footer-inner {
    grid-template-columns: 1fr;
    padding: 44px 18px 30px;
  }

  .footer-bottom {
    flex-direction: column;
    text-align: center;
    padding: 18px;
  }
}
</style>
