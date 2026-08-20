const categoryRail = [
  "Phones & Tablets",
  "Computers",
  "Audio",
  "Gaming",
  "Power & Networking",
  "Accessories",
  "Repairs",
];

const heroCampaigns = [
  {
    kicker: "Gaming · Volume 01",
    title: "Built for serious play.",
    copy: "Console pads, headsets, screens and power backup picked for the way Nairobi actually games.",
    action: "Shop gaming",
    tone: "dark",
    art: "gamepad",
  },
  {
    kicker: "Audio · Portable editions",
    title: "Sound that follows you.",
    copy: "Speakers, earbuds and party-ready audio with warranty-backed stock.",
    action: "Shop audio",
    tone: "orange",
    art: "speaker",
  },
  {
    kicker: "Repair desk",
    title: "Book. Quote. Fix. Collect.",
    copy: "Start a repair request online and let the shop workflow handle the rest.",
    action: "Start repair",
    tone: "cream",
    art: "phone",
  },
];

const featuredProducts = [
  {
    badge: "Most wanted",
    name: "Samsung Galaxy A15",
    category: "Phones & Tablets",
    price: "KES 27,500",
    oldPrice: "KES 29,000",
    meta: "6GB RAM · 128GB ROM",
    art: "phone",
  },
  {
    badge: "Work ready",
    name: "HP EliteBook 840 G6",
    category: "Computers",
    price: "KES 56,000",
    oldPrice: "KES 59,500",
    meta: "Core i5 · 8GB · 256GB SSD",
    art: "laptop",
  },
  {
    badge: "Top deal",
    name: "JBL Flip Portable Speaker",
    category: "Audio",
    price: "KES 13,500",
    oldPrice: "KES 15,000",
    meta: "Genuine stock · Warranty covered",
    art: "speaker",
  },
  {
    badge: "Fast mover",
    name: "Oraimo 20000mAh Power Bank",
    category: "Power & Networking",
    price: "KES 3,800",
    oldPrice: "KES 4,200",
    meta: "Type-C · Dual output",
    art: "powerbank",
  },
];

const trustSignals = [
  ["Free Delivery", "Orders over KES 5,000"],
  ["100% Genuine", "Warranty covered stock"],
  ["M-PESA Ready", "Fast secure checkout"],
  ["Same-Day Nairobi", "Pickup or rider delivery"],
];

const shopCategories = [
  ["Computers", "238+ items", "Laptops, desktops, monitors and business machines."],
  ["Audio", "285+ items", "Speakers, earbuds, headphones and sound systems."],
  ["Gaming", "411+ items", "Controllers, games, consoles and accessories."],
  ["Power & Networking", "184+ items", "Power banks, routers, chargers and cables."],
  ["Phones & Tablets", "96+ items", "Samsung, iPhone, Infinix, Tecno and tablets."],
  ["Repair Parts", "70+ items", "Screens, batteries, ports and service essentials."],
];

const testimonials = [
  {
    quote: "Got my phone, charger and receipt in minutes. The team actually explained the warranty.",
    name: "Brian K.",
    place: "Nairobi CBD",
  },
  {
    quote: "Booked a screen replacement before visiting. The quote was clear and pickup was smooth.",
    name: "Grace M.",
    place: "South B",
  },
  {
    quote: "Good shop energy. Genuine accessories, quick M-PESA payment, no stories.",
    name: "David O.",
    place: "Kisumu",
  },
];

const policyLinks = ["Payment Info", "Delivery", "Refund & Returns", "Privacy Policy"];

function ProductArt({ type }: { type: string }) {
  return (
    <div className={`product-visual product-visual-${type}`} aria-hidden="true">
      <span className="visual-shadow" />
      {type === "phone" && (
        <>
          <span className="phone-device" />
          <span className="phone-device phone-device-small" />
        </>
      )}
      {type === "laptop" && (
        <>
          <span className="laptop-screen" />
          <span className="laptop-base" />
        </>
      )}
      {type === "speaker" && (
        <>
          <span className="speaker-body" />
          <span className="speaker-ring speaker-ring-one" />
          <span className="speaker-ring speaker-ring-two" />
        </>
      )}
      {type === "powerbank" && (
        <>
          <span className="powerbank-body" />
          <span className="powerbank-light powerbank-light-one" />
          <span className="powerbank-light powerbank-light-two" />
          <span className="powerbank-light powerbank-light-three" />
        </>
      )}
      {type === "gamepad" && (
        <>
          <span className="gamepad-body" />
          <span className="gamepad-dot gamepad-dot-one" />
          <span className="gamepad-dot gamepad-dot-two" />
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <section className="delivery-strip">
        <span>Free delivery on orders over KES 5,000</span>
      </section>

      <header className="store-header">
        <div className="site-shell header-grid">
          <a className="brand-lockup" href="#" aria-label="Crystal Shop home">
            <span className="brand-symbol">CR</span>
            <span className="brand-text">
              Crystal<span>Shop</span>
            </span>
          </a>

          <label className="search-bar" htmlFor="site-search">
            <span>Search</span>
            <input
              id="site-search"
              name="search"
              placeholder="Search phones, laptops, chargers..."
              type="search"
            />
          </label>

          <nav className="header-actions" aria-label="Customer shortcuts">
            <a href="#repairs">Repairs</a>
            <a href="#contact">WhatsApp</a>
            <a className="cart-pill" href="#shop">
              Cart · 0
            </a>
          </nav>
        </div>
      </header>

      <nav className="category-rail" aria-label="Product categories">
        <div className="site-shell category-rail-inner">
          {categoryRail.map((item) => (
            <a href="#categories" key={item}>
              {item}
            </a>
          ))}
        </div>
      </nav>

      <section className="site-shell hero-grid">
        <article className="hero-card hero-card-main">
          <div className="hero-copy">
            <p className="eyebrow">Crystal Edit · Nairobi stock</p>
            <h1>Electronics with a shop-floor heartbeat.</h1>
            <p>
              Phones, laptops, audio, gaming gear and repair support — packed
              into one storefront that will connect directly to the POS,
              inventory and M-PESA backend.
            </p>
            <div className="hero-buttons">
              <a className="button button-light" href="#shop">
                Shop latest
              </a>
              <a className="button button-outline" href="#categories">
                Browse categories
              </a>
            </div>
          </div>
          <div className="hero-stage" aria-hidden="true">
            <ProductArt type="phone" />
            <ProductArt type="laptop" />
            <span className="hero-price-tag">From KES 3,800</span>
          </div>
        </article>

        <div className="campaign-stack">
          {heroCampaigns.map((campaign) => (
            <article className={`mini-campaign mini-campaign-${campaign.tone}`} key={campaign.title}>
              <div>
                <p>{campaign.kicker}</p>
                <h2>{campaign.title}</h2>
                <span>{campaign.copy}</span>
                <a href={campaign.art === "phone" ? "#repairs" : "#shop"}>{campaign.action}</a>
              </div>
              <ProductArt type={campaign.art} />
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell trust-row" aria-label="Store guarantees">
        {trustSignals.map(([title, copy]) => (
          <article key={title}>
            <span>✓</span>
            <div>
              <strong>{title}</strong>
              <small>{copy}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="deal-marquee" aria-label="Current promotions">
        <div className="site-shell deal-marquee-inner">
          <span>Top deal · Extra 10% off selected audio</span>
          <span>Clearance · Accessories from KES 250</span>
          <span>Bundle save · Phone + charger + protector</span>
        </div>
      </section>

      <section className="site-shell section-block" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live · Most wanted</p>
            <h2>What Nairobi is buying right now.</h2>
          </div>
          <a href="#categories">View all products</a>
        </div>

        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product-card" key={product.name}>
              <span className="product-badge">{product.badge}</span>
              <ProductArt type={product.art} />
              <div className="product-details">
                <span>{product.category}</span>
                <h3>{product.name}</h3>
                <p>{product.meta}</p>
                <div>
                  <strong>{product.price}</strong>
                  <small>{product.oldPrice}</small>
                </div>
              </div>
              <button type="button">Add to cart</button>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell section-block" id="categories">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>Find the thing without overthinking it.</h2>
          </div>
        </div>

        <div className="category-grid">
          {shopCategories.map(([name, count, copy]) => (
            <a className="category-card" href="#shop" key={name}>
              <span>{count}</span>
              <strong>{name}</strong>
              <p>{copy}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="site-shell repair-panel" id="repairs">
        <div className="repair-copy">
          <p className="eyebrow">Repair support</p>
          <h2>Cracked screen? Weak battery? Charging port drama?</h2>
          <p>
            Customers can book repairs online, get a branch quote, approve the
            work, then pay and collect through the same shop system.
          </p>
          <ul>
            <li>Device intake and customer details</li>
            <li>Technician diagnosis and quote</li>
            <li>Cashier approval, payment and receipt</li>
          </ul>
        </div>

        <form className="repair-form">
          <label htmlFor="repair-device">
            Device
            <input id="repair-device" name="device" placeholder="Samsung A15" />
          </label>
          <label htmlFor="repair-phone">
            Phone / WhatsApp
            <input id="repair-phone" name="phone" placeholder="07XX XXX XXX" />
          </label>
          <label htmlFor="repair-issue">
            What happened?
            <textarea
              id="repair-issue"
              name="issue"
              placeholder="Screen cracked, not charging, water damage..."
            />
          </label>
          <button type="button">Start repair request</button>
        </form>
      </section>

      <section className="site-shell testimonials-block">
        <div className="proof-card">
          <p className="eyebrow">Trusted locally</p>
          <h2>Built for real customers, real receipts, real follow-up.</h2>
          <p>
            This frontend will plug into the same backend powering staff,
            inventory, payments and repair workflows.
          </p>
        </div>
        {testimonials.map((item) => (
          <article className="testimonial-card" key={item.name}>
            <p>“{item.quote}”</p>
            <strong>{item.name}</strong>
            <span>{item.place}</span>
          </article>
        ))}
      </section>

      <footer className="site-footer" id="contact">
        <div className="site-shell footer-grid">
          <div>
            <a className="footer-brand" href="#">
              Crystal<span>Shop</span>
            </a>
            <p>
              Your gadgets, accessories, repairs and checkout experience in one
              connected electronics store.
            </p>
            <strong>M-PESA accepted · Secure checkout</strong>
          </div>

          <div>
            <h3>Quick Links</h3>
            <a href="#shop">Shop</a>
            <a href="#categories">Categories</a>
            <a href="#repairs">Repairs</a>
            <a href="#contact">Contact</a>
          </div>

          <div>
            <h3>Policies</h3>
            {policyLinks.map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>

          <div>
            <h3>Contact</h3>
            <a href="tel:+254700000000">+254 700 000 000</a>
            <a href="mailto:sales@example.com">sales@example.com</a>
            <p>Nairobi CBD · Branch pickup · Countrywide delivery</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
