const categories = [
  {
    name: "Phones",
    count: "IMEI tracked",
    description: "Samsung, Infinix, iPhone and daily-driver devices.",
  },
  {
    name: "Laptops",
    count: "Serial tracked",
    description: "Business laptops, student machines and clean ex-UK picks.",
  },
  {
    name: "Chargers & Cables",
    count: "Fast movers",
    description: "Type-C chargers, cables, adapters and wall plugs.",
  },
  {
    name: "Power & Storage",
    count: "Ready stock",
    description: "Power banks, flash disks, memory cards and essentials.",
  },
];

const featuredProducts = [
  {
    tag: "Most asked",
    name: "Samsung Galaxy A15",
    variant: "6GB / 128GB / Blue",
    price: "KES 27,500",
    meta: "12-month warranty · M-PESA ready",
    code: "PHN",
  },
  {
    tag: "Work ready",
    name: "HP EliteBook 840 G6",
    variant: "Core i5 / 8GB / 256GB SSD",
    price: "KES 56,000",
    meta: "Serial tracked · Clean business laptop",
    code: "LAP",
  },
  {
    tag: "Bundle pick",
    name: "Oraimo Power Bank",
    variant: "20000mAh",
    price: "KES 3,800",
    meta: "Great with phone purchases",
    code: "PWR",
  },
  {
    tag: "Repair part",
    name: "Galaxy A15 Screen",
    variant: "Replacement LCD assembly",
    price: "KES 4,500",
    meta: "Available for repair jobs",
    code: "PRT",
  },
];

const trustSignals = [
  ["M-PESA Ready", "Prompt, pay, confirm."],
  ["Warranty Support", "Receipts and warranty tracking."],
  ["Genuine Stock", "Catalog-backed product records."],
  ["Repair Tracking", "Book, diagnose, quote, collect."],
];

const dealCards = [
  {
    label: "Bundle save",
    title: "Phone + charger + screen protector",
    copy: "Build practical customer bundles from fast-moving accessories.",
  },
  {
    label: "Repair desk",
    title: "Book a repair before visiting",
    copy: "Customers submit device issues online; staff handle the workflow inside the system.",
  },
  {
    label: "Same branch stock",
    title: "Website stock follows the shop",
    copy: "No duplicate inventory. Online availability comes from the same backend.",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <section className="top-strip">
        <span>Free delivery over KES 5,000</span>
        <span>Secure M-PESA checkout</span>
        <span>Visit branch or request delivery</span>
      </section>

      <header className="site-header">
        <a className="brand-lockup" href="#">
          <span className="brand-mark">CS</span>
          <span>
            <strong>Crystal Shop</strong>
            <small>Phones · Laptops · Repairs</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#shop">Shop</a>
          <a href="#repairs">Repairs</a>
          <a href="#deals">Deals</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-action" href="#contact">
          WhatsApp concierge
        </a>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Nairobi electronics · shop stock connected</p>
          <h1>
            Tech that moves fast, backed by people who know the work.
          </h1>
          <p>
            Shop phones, laptops, accessories and repair support from one place.
            The website will run on the same stock, repairs and M-PESA backbone
            as the internal shop system.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#shop">
              Shop devices
            </a>
            <a className="button button-secondary" href="#repairs">
              Book repair
            </a>
          </div>
        </div>

        <div className="hero-board" aria-label="Featured campaign cards">
          <article className="campaign-card campaign-card-main">
            <span>Built for</span>
            <strong>daily hustle.</strong>
            <p>Clean devices, trusted accessories, and receipts your customers can rely on.</p>
          </article>
          <article className="campaign-card">
            <span>Audio · Power · Storage</span>
            <strong>Essentials that actually move.</strong>
          </article>
          <article className="campaign-card campaign-card-light">
            <span>Repair ready</span>
            <strong>Quote, approve, pay, collect.</strong>
          </article>
        </div>
      </section>

      <section className="trust-grid" aria-label="Store trust signals">
        {trustSignals.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
          </article>
        ))}
      </section>

      <section className="section-block" id="shop">
        <div className="section-heading">
          <p className="eyebrow">Live · Most wanted</p>
          <h2>What customers are asking for this week.</h2>
          <a href="#">View all products</a>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product-card" key={product.name}>
              <div className="product-art">
                <span>{product.code}</span>
              </div>
              <div className="product-meta">
                <span>{product.tag}</span>
                <h3>{product.name}</h3>
                <p>{product.variant}</p>
                <strong>{product.price}</strong>
                <small>{product.meta}</small>
              </div>
              <button type="button">Add to cart</button>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Shop by category</p>
          <h2>Simple paths into the catalog.</h2>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <a className="category-card" href="#" key={category.name}>
              <span>{category.count}</span>
              <strong>{category.name}</strong>
              <p>{category.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="repair-section" id="repairs">
        <div>
          <p className="eyebrow">Repair service</p>
          <h2>Cracked screen, weak battery, charging issue?</h2>
          <p>
            Customers can book a repair online, receive a quote, approve it,
            pay at pickup, and track the job without calling five times.
          </p>
        </div>
        <form className="repair-card">
          <label>
            Device
            <input name="device" placeholder="e.g. Samsung A15" />
          </label>
          <label>
            Phone / WhatsApp
            <input name="phone" placeholder="07XX XXX XXX" />
          </label>
          <label>
            Problem
            <textarea name="problem" placeholder="Tell us what happened..." />
          </label>
          <button type="button">Start repair request</button>
        </form>
      </section>

      <section className="deal-strip" id="deals">
        {dealCards.map((deal) => (
          <article key={deal.title}>
            <span>{deal.label}</span>
            <strong>{deal.title}</strong>
            <p>{deal.copy}</p>
          </article>
        ))}
      </section>

      <footer className="site-footer" id="contact">
        <div>
          <strong>Crystal Shop</strong>
          <p>
            Your gadgets, repairs and checkout workflow in one connected retail
            system.
          </p>
        </div>
        <div>
          <span>Contact</span>
          <a href="tel:+254700000000">+254 700 000 000</a>
          <a href="mailto:sales@example.com">sales@example.com</a>
        </div>
        <div>
          <span>Visit</span>
          <p>Nairobi CBD · Branch pickup · Countrywide delivery</p>
        </div>
      </footer>
    </main>
  );
}
