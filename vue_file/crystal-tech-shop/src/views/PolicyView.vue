<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const policies = {
  returns: {
    eyebrow: 'RETURNS & REFUNDS',
    title: 'Return & Refund Policy',
    intro:
      'We want customers to shop with confidence. This policy explains how returns, exchanges, and refunds are handled for electronics, accessories, and online orders.',
    updated: 'Last updated: 7 September 2026',
    highlights: [
      'Return requests should be raised as soon as a fault or order issue is noticed.',
      'Items must be returned with proof of purchase and original accessories where applicable.',
      'Refunds are processed after inspection and approval by the shop team.',
    ],
    sections: [
      {
        heading: 'Eligible returns',
        body:
          'A return may be accepted where the item delivered is wrong, damaged on arrival, not working on arrival, or materially different from what was ordered.',
      },
      {
        heading: 'Condition of returned items',
        body:
          'Products should be returned in the same condition received, together with packaging, chargers, cables, manuals, warranty cards, and any bundled accessories.',
      },
      {
        heading: 'Items that may not qualify',
        body:
          'Items damaged through misuse, liquid damage, unauthorized repair, tampering, missing serial/IMEI labels, or missing core accessories may be rejected or handled under warranty assessment instead.',
      },
      {
        heading: 'Refund and exchange handling',
        body:
          'Once an item is inspected and approved, the customer may receive a replacement, exchange, store credit, or refund depending on stock availability and the original payment method.',
      },
    ],
  },
  warranty: {
    eyebrow: 'WARRANTY',
    title: 'Warranty Policy',
    intro:
      'Warranty support helps customers prove ownership and service eligibility. Devices are tracked using order details, serial numbers, IMEIs, and the original purchase receipt.',
    updated: 'Last updated: 7 September 2026',
    highlights: [
      'Warranty starts from the purchase date shown on the receipt.',
      'Phones and laptops may be verified using IMEI or serial number.',
      'Warranty does not cover damage caused by misuse, accidents, liquid, or tampering.',
    ],
    sections: [
      {
        heading: 'What warranty covers',
        body:
          'Warranty may cover manufacturer defects or genuine product faults confirmed by inspection within the applicable warranty period.',
      },
      {
        heading: 'What warranty does not cover',
        body:
          'Warranty does not cover cracked screens, liquid damage, power surge damage, unauthorized repair attempts, software misuse, missing serial labels, or damage caused after purchase.',
      },
      {
        heading: 'How to claim warranty',
        body:
          'Customers should provide the receipt or order number, phone number used during purchase, and the device serial number or IMEI where applicable.',
      },
      {
        heading: 'Repair or replacement decision',
        body:
          'After assessment, the shop or supplier may repair the item, replace it, or advise on paid service if the issue is outside warranty terms.',
      },
    ],
  },
  shipping: {
    eyebrow: 'SHIPPING & DELIVERY',
    title: 'Shipping & Delivery Policy',
    intro:
      'We support branch pickup, local delivery, and countrywide delivery where available. Delivery details are confirmed before dispatch so customers know what to expect.',
    updated: 'Last updated: 7 September 2026',
    highlights: [
      'Pickup orders are prepared for collection from the selected branch.',
      'Delivery timelines depend on location, item availability, and payment confirmation.',
      'Customers should inspect packages on delivery before confirming receipt.',
    ],
    sections: [
      {
        heading: 'Order processing',
        body:
          'Orders are processed after stock availability and payment status are confirmed. Some serialized items may require branch staff to allocate the exact unit before dispatch.',
      },
      {
        heading: 'Branch pickup',
        body:
          'For pickup orders, customers should carry their order number and the phone number used during checkout. Staff may request identification for high-value items.',
      },
      {
        heading: 'Delivery address and contact',
        body:
          'Customers are responsible for providing a reachable phone number and accurate delivery location. Failed delivery caused by incorrect details may require rescheduling.',
      },
      {
        heading: 'Delivery inspection',
        body:
          'If a package appears damaged or incorrect, the customer should notify the shop immediately before using the item so the issue can be handled quickly.',
      },
    ],
  },
  privacy: {
    eyebrow: 'PRIVACY',
    title: 'Privacy Policy',
    intro:
      'We collect only the information needed to process orders, support customers, confirm payments, and provide warranty or repair assistance.',
    updated: 'Last updated: 7 September 2026',
    highlights: [
      'Customer details are used for orders, delivery, payment confirmation, and support.',
      'Payment references may be stored for audit and receipt tracking.',
      'We do not sell customer personal information.',
    ],
    sections: [
      {
        heading: 'Information we collect',
        body:
          'We may collect customer name, phone number, email address, delivery address, order history, payment reference, and product serial/IMEI details where required.',
      },
      {
        heading: 'How we use information',
        body:
          'Information is used to create orders, send updates, verify payment, deliver products, support warranty claims, manage repairs, and improve customer service.',
      },
      {
        heading: 'Payment and M-Pesa details',
        body:
          'For M-Pesa and other payment methods, we may store transaction references, payer phone numbers, and payment status so receipts and order records remain accurate.',
      },
      {
        heading: 'Customer support and deletion requests',
        body:
          'Customers can contact us to correct their details or ask how their information is being used. Some records may be retained where required for receipts, audit, warranty, or legal compliance.',
      },
    ],
  },
}

const currentPolicy = computed(() => {
  const page = String(route.params.page ?? 'returns')
  return policies[page] ?? policies.returns
})
</script>

<template>
  <main class="policy-page">
    <section class="policy-hero">
      <div>
        <p class="eyebrow">{{ currentPolicy.eyebrow }}</p>
        <h1>{{ currentPolicy.title }}</h1>
        <p>{{ currentPolicy.intro }}</p>
        <span>{{ currentPolicy.updated }}</span>
      </div>
    </section>

    <section class="policy-content">
      <aside class="policy-summary">
        <p class="eyebrow">AT A GLANCE</p>
        <ul>
          <li v-for="item in currentPolicy.highlights" :key="item">
            {{ item }}
          </li>
        </ul>
      </aside>

      <div class="policy-sections">
        <article v-for="section in currentPolicy.sections" :key="section.heading">
          <h2>{{ section.heading }}</h2>
          <p>{{ section.body }}</p>
        </article>

        <div class="policy-contact">
          <div>
            <p class="eyebrow">NEED HELP?</p>
            <h2>Talk to our team before making a decision.</h2>
            <p>
              If a customer is unsure about a return, warranty issue, delivery concern,
              or privacy request, the safest next step is to contact the shop with the
              order number and phone number used during purchase.
            </p>
          </div>
          <RouterLink to="/support">Contact Support</RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.policy-page {
  min-height: 100vh;
  background: #f7f5f2;
  color: #17181c;
}

.policy-hero,
.policy-content {
  max-width: 1216px;
  margin: 0 auto;
  padding-right: 32px;
  padding-left: 32px;
}

.policy-hero {
  padding-top: 38px;
  padding-bottom: 42px;
}

.policy-hero > div {
  max-width: 820px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #ee6c1f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.policy-hero h1 {
  margin: 0 0 16px;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(34px, 6vw, 58px);
  font-weight: 400;
  line-height: 1.04;
  letter-spacing: -0.04em;
}

.policy-hero p {
  margin: 0 0 18px;
  color: #4a4a4d;
  font-size: 16px;
  line-height: 1.75;
}

.policy-hero span {
  color: #777276;
  font-size: 13px;
}

.policy-content {
  display: grid;
  grid-template-columns: minmax(240px, 0.36fr) minmax(0, 1fr);
  gap: 28px;
  padding-bottom: 76px;
}

.policy-summary,
.policy-sections article,
.policy-contact {
  border: 1px solid #e1dfdc;
  border-radius: 8px;
  background: #fff;
}

.policy-summary {
  position: sticky;
  top: 98px;
  align-self: start;
  padding: 24px;
}

.policy-summary ul {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.policy-summary li {
  position: relative;
  padding-left: 22px;
  color: #2b2d33;
  font-size: 13.5px;
  line-height: 1.6;
}

.policy-summary li::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ee6c1f;
}

.policy-sections {
  display: grid;
  gap: 16px;
}

.policy-sections article {
  padding: 26px;
}

.policy-sections h2 {
  margin: 0 0 10px;
  color: #17181c;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 400;
}

.policy-sections p {
  margin: 0;
  color: #555156;
  font-size: 14px;
  line-height: 1.75;
}

.policy-contact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background: #17181c;
  color: #fff;
}

.policy-contact h2 {
  color: #fff;
}

.policy-contact p:not(.eyebrow) {
  max-width: 680px;
  color: rgba(255, 255, 255, 0.72);
}

.policy-contact a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 142px;
  border-radius: 6px;
  padding: 13px 22px;
  background: #ee6c1f;
  color: #fff;
  font-size: 12.5px;
  font-weight: 800;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}

.policy-contact a:hover {
  background: #d65a12;
}

@media (max-width: 860px) {
  .policy-content {
    grid-template-columns: 1fr;
  }

  .policy-summary {
    position: static;
  }

  .policy-contact {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 620px) {
  .policy-hero,
  .policy-content {
    padding-right: 18px;
    padding-left: 18px;
  }

  .policy-hero {
    padding-top: 28px;
  }

  .policy-sections article,
  .policy-summary,
  .policy-contact {
    padding: 22px;
  }
}
</style>
