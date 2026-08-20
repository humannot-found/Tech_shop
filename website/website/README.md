# Crystal Shop Website

Public storefront for the tech shop system.

This app is separate from the internal staff dashboard in `frontend/`. It is meant for customers: browsing products, understanding repair services, and eventually placing online orders that use the same backend inventory as the shop/POS system.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- TypeScript

## Local development

```bash
cd website/website
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Current design direction

The active direction is a dense orange/black retail-electronics storefront: compact header, category rail, editorial campaign panels, deal ribbon, product cards, trust badges, repair booking and a grounded Nairobi shop feel. It borrows the practical rhythm of strong local e-commerce sites while keeping Crystal Shop's own content and visual system.

The current homepage includes:

- campaign hero
- category navigation rail
- promo/deal ribbon
- trust signals
- featured product cards
- category cards
- repair booking call-to-action
- testimonial/proof cards
- footer links and contact placeholders

## Backend connection plan

The website will later consume the existing FastAPI backend for:

- public catalog and product availability
- online orders
- repair booking
- payment initiation
- customer order/repair tracking

