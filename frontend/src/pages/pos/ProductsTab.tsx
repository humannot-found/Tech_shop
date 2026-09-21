import type { KeyboardEvent, ReactNode, RefObject } from "react";

import type { PosProduct } from "../../api/types";
import { posShortcutHints } from "./usePosShortcuts";
import { money } from "./utils";

type ProductsTabProps = {
  query: string;
  setQuery: (value: string) => void;
  filtered: PosProduct[];
  catalogLive: boolean;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  showProductInformationHint: () => void;
  addToCart: (product: PosProduct) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onScan: (code: string) => void;
  scanBusy: boolean;
  children: ReactNode;
};

export function ProductsTab({
  query,
  setQuery,
  filtered,
  catalogLive,
  categories,
  activeCategory,
  setActiveCategory,
  showProductInformationHint,
  addToCart,
  searchInputRef,
  onScan,
  scanBusy,
  children,
}: ProductsTabProps) {
  return (
    <section className="pos-products-view">
      <header className="pos-products-header">
        <div className="pos-search-row">
          <label className="pos-search">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search, or scan a barcode / IMEI and press Enter"
              autoFocus
              ref={searchInputRef}
              aria-busy={scanBusy}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onScan(query);
                }
              }}
            />
          </label>
          <button
            className="info-button pos-result-chip"
            type="button"
            onClick={showProductInformationHint}
          >
            <strong>{filtered.length}</strong>
            <span>{catalogLive ? "Live catalog" : "Sample catalog"}</span>
          </button>
        </div>

        <div className="pos-shortcut-hints" aria-label="Keyboard shortcuts">
          {posShortcutHints.map((hint) => (
            <span key={hint.key}>
              <kbd>{hint.key}</kbd> {hint.label}
            </span>
          ))}
        </div>

        <div className="category-list">
          {categories.map((category) => (
            <button
              key={category}
              className={activeCategory === category ? "is-active" : ""}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </header>


      {children}

      <div className="product-list-scroller">
        <div className="terminal-product-grid">
          {filtered.map((product) => (
            <button
              className="product-tile"
              key={product.id}
              onClick={() => addToCart(product)}
            >
              <span
                className="product-tile__media"
                style={{ background: product.accent }}
              >
                {product.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="product-tile__body">
                <strong>{product.name}</strong>
                <small>{product.variantName}</small>
                <span className="product-tile__meta">
                  <b>{money(product.price)}</b>
                  <em>{product.stockHint}</em>
                </span>
              </span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="pos-empty-state">
              <strong>No matching products</strong>
              <span>Try another search term or category.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
