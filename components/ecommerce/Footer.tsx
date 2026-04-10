"use client";

import React from "react";
import Link from "next/link";
import { Facebook, Instagram, Youtube, MapPin, Phone, MessageCircle, CheckCircle } from "lucide-react";

const BRAND = "Errum";

const stores = [
  { name: "Mirpur 12", address: "Level 3, Hazi Kujrat Ali Mollah Market, Mirpur 12", phone: "01942565664" },
  { name: "Jamuna Future Park", address: "3C-17A, Level 3, Jamuna Future Park", phone: "01307130535" },
  { name: "Bashundhara City", address: "38, 39, 40, Block D, Level 5, Bashundhara City", phone: "01336041064" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--bg-depth)] border-t border-[var(--border-default)] relative">
      <div className="ec-container relative">
        <div className="grid grid-cols-1 gap-12 py-20 md:grid-cols-3">

          {/* Brand */}
          <div className="space-y-6">
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                {BRAND}
                <span className="text-[var(--cyan)] ml-2 text-[10px] font-bold tracking-[0.3em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Studio</span>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-sm">
                A premium lifestyle brand — footwear, apparel, and objects curated for everyday confidence and enduring quality.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                { href: '/e-commerce/products', label: 'Artisanal Edit' },
                { href: '/e-commerce/categories', label: 'Collections' },
                { href: '/e-commerce/contact', label: 'Inquiries' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex gap-4">
              {[Facebook, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] transition-all"
                  aria-label="social">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Shopping Promise */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold tracking-[0.25em] uppercase text-[var(--text-muted)]" style={{ fontFamily: "'DM Mono', monospace" }}>
              Our Promise
            </h4>
            <div className="space-y-4">
              {[
                { title: 'Curated Quality', sub: 'Single-source materials, enduring finish.' },
                { title: 'Nationwide Reach', sub: 'Premium delivery to every corner of Bangladesh.' },
              ].map(({ title, sub }) => (
                <div key={title} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6 transition-all group hover:border-[var(--cyan-border)]">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle size={14} className="text-[var(--gold)]" />
                    <p className="text-[14px] font-semibold text-[var(--text-primary)] uppercase tracking-tight" style={{ fontFamily: "'Jost', sans-serif" }}>{title}</p>
                  </div>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stores */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold tracking-[0.25em] uppercase text-[var(--text-muted)]" style={{ fontFamily: "'DM Mono', monospace" }}>
              Stores & Inquiries
            </h4>
            <div className="space-y-4">
              {stores.map(store => (
                <div key={store.name} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6 transition-all group hover:border-[var(--cyan-border)]">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] uppercase tracking-tight mb-4" style={{ fontFamily: "'Jost', sans-serif" }}>{store.name}</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-[13px] text-[var(--text-secondary)]">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0 text-[var(--cyan)]" />
                      <span className="group-hover:text-[var(--text-primary)] transition-colors">{store.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-[var(--text-secondary)]">
                      <Phone size={14} className="flex-shrink-0 text-[var(--cyan)]" />
                      <span className="group-hover:text-[var(--text-primary)] transition-colors">{store.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-6 border-t border-[var(--border-default)] py-12 md:flex-row">
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.2em]" style={{ fontFamily: "'DM Mono', monospace" }}>
            © {year} {BRAND} Studio — All Rights Reserved.
          </p>
          <div className="flex items-center gap-4">
            {['bKash', 'Nagad', 'Card'].map(m => (
              <span key={m} className="px-4 py-2 bg-[var(--bg-lifted)] border border-[var(--border-default)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest rounded-[var(--radius-sm)]" style={{ fontFamily: "'DM Mono', monospace" }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

