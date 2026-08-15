"use client";

import React from "react";
import Link from "next/link";

const BRAND = "Deshio";


const LINK_STYLE: React.CSSProperties = {
  fontSize: '13px',
  color: '#555555',
  textDecoration: 'none',
  lineHeight: 2,
  display: 'block',
  transition: 'color 0.15s',
  fontFamily: "'Poppins', sans-serif",
};

const COL_HEADER_STYLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#111111',
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  marginBottom: '16px',
  fontFamily: "'Poppins', sans-serif",
};

export default function Footer() {
  const year = new Date().getFullYear();


  return (
    <footer style={{ background: '#f8f8f8', borderTop: '1px solid rgba(0,0,0,0.08)', paddingBottom: '80px' }}>
      <div className="ec-container">

        {/* ── Main footer grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '48px' }}>

          {/* Column 1 — Brand & Info */}
          <div>
            <Link href="/e-commerce" style={{ display: 'inline-block', marginBottom: '16px', textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '24px', fontWeight: 800, letterSpacing: '0.05em', color: '#111111' }}>
                Deshio
              </span>
            </Link>
            <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#555555', maxWidth: '300px', fontFamily: "'Poppins', sans-serif", marginBottom: '24px' }}>
              A complete lifestyle brand — Jamdani, 3piece, jwellery, and other fashionware curated for everyday confidence across Bangladesh.
            </p>

            <p style={COL_HEADER_STYLE}>Quick Info</p>
            <nav style={{ marginBottom: '24px' }}>
              {[
                { href: '/e-commerce/categories', label: 'All Categories' },
                { href: '/e-commerce/products', label: 'New & Popular' },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  style={LINK_STYLE}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#111111'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555555'}
                >
                  {label}
                </Link>
              ))}
            </nav>

          </div>

          {/* Column 2 — Useful Links */}
          <div>
            <p style={COL_HEADER_STYLE}>Useful Links</p>
            <nav>
              {[
                { href: '/e-commerce/products', label: 'New Arrivals' },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  style={LINK_STYLE}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#111111'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555555'}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3 — Our Promise */}
          <div>
            <p style={COL_HEADER_STYLE}>Our Promise</p>
            <div style={{ marginBottom: '24px' }}>
              {[
                { title: 'Comfort & Quality Assured', sub: 'Thoughtfully selected with quality finishing.' },
                { title: 'In-Store & Online Support', sub: 'Visit us or order easily — responsive service.' },
                { title: 'Nationwide Delivery', sub: 'Smooth and reliable delivery across Bangladesh.' },
              ].map(({ title, sub }) => (
                <div key={title} style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#111111', margin: '0 0 2px 0', fontFamily: "'Poppins', sans-serif" }}>{title}</p>
                  <p style={{ fontSize: '12px', color: '#555555', margin: 0, fontFamily: "'Poppins', sans-serif" }}>{sub}</p>
                </div>
              ))}
            </div>

          </div>
        </div>


        {/* ── Bottom bar ── */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: '#999999', fontFamily: "'Poppins', sans-serif", margin: 0 }}>
            © {year} Deshio STORE — Handcrafted for Confidence.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['bKash', 'Nagad', 'Visa', 'Mastercard'].map(m => (
              <span key={m} style={{
                padding: '4px 10px',
                border: '1px solid rgba(0,0,0,0.15)',
                color: '#555555',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
