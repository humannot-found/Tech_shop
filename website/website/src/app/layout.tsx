import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crystal Shop | Phones, Laptops, Accessories & Repairs",
  description:
    "Shop phones, laptops, accessories and repair services with M-PESA-ready checkout and branch pickup.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
