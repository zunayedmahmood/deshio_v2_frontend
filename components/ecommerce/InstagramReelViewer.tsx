'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Instagram } from 'lucide-react';
import InstagramEmbed from './InstagramEmbed';

const REEL_URLS = [
  'https://www.instagram.com/reel/DW6uSbkERA9/',
  'https://www.instagram.com/p/DW6DQUGk-ho/',
  'https://www.instagram.com/reel/DW323H0EboK/',
  'https://www.instagram.com/p/DWwVRsnEzn8/',
  'https://www.instagram.com/p/DWnvVqhE6-p/',
];

export default function InstagramReelViewer() {
  const [activeIndex, setActiveIndex] = useState(2); // Start with middle
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  const next = () => setActiveIndex((prev) => (prev < REEL_URLS.length - 1 ? prev + 1 : prev));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  // Re-process embeds when index changes to ensure they are rendered if they were hidden
  useEffect(() => {
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    }
  }, [activeIndex]);

  return (
    <section className="bg-[var(--bg-surface)] relative py-20 border-y border-[var(--border-default)]">
      <div className="ec-container mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--cyan)] mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>On the Feed</div>
            <h2 className="text-[var(--text-primary)] text-4xl md:text-5xl font-medium tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Culture in Motion</h2>
            <p className="text-[var(--text-secondary)] mt-4 max-w-lg text-[15px] leading-relaxed">
              Explore our latest drops, community styling, and behind-the-scenes highlights straight from our studio.
            </p>
          </div>
          <a
            href="https://www.instagram.com/errum_bd/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 bg-[var(--bg-lifted)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-[var(--radius-sm)] text-[12px] font-bold uppercase tracking-widest hover:bg-[var(--cyan-pale)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] transition-all group self-start md:self-auto"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <Instagram size={16} className="transition-colors" />
            <span>Follow @errum_bd</span>
          </a>
        </div>
      </div>

      <div
        className="relative flex items-center justify-center min-h-[650px] md:min-h-[750px] select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={containerRef}
      >
        {/* Navigation Arrows */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-between px-4 md:px-12 pointer-events-none">
          <button
            onClick={prev}
            disabled={activeIndex === 0}
            className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all pointer-events-auto ${activeIndex === 0 ? 'opacity-0' : 'bg-[var(--bg-lifted)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] opacity-100'
              }`}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            disabled={activeIndex === REEL_URLS.length - 1}
            className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all pointer-events-auto ${activeIndex === REEL_URLS.length - 1 ? 'opacity-0' : 'bg-[var(--bg-lifted)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] opacity-100'
              }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Carousel Items */}
        <div className="relative w-full max-w-5xl mx-auto h-full flex items-center justify-center perspective-1000">
          {REEL_URLS.map((url, index) => {
            const diff = index - activeIndex;
            const isActive = diff === 0;
            const isPrev = diff === -1;
            const isNext = diff === 1;

            let transform = 'scale(0.8) translateX(0)';
            let opacity = '0';
            let zIndex = '0';

            if (isActive) {
              transform = 'scale(1) translateX(0)';
              opacity = '1';
              zIndex = '20';
            } else if (isPrev) {
              transform = 'scale(0.85) translateX(-60%) rotateY(15deg)';
              opacity = '0.4';
              zIndex = '10';
            } else if (isNext) {
              transform = 'scale(0.85) translateX(60%) rotateY(-15deg)';
              opacity = '0.4';
              zIndex = '10';
            } else if (diff < -1) {
              transform = 'scale(0.7) translateX(-120%)';
              opacity = '0';
            } else {
              transform = 'scale(0.7) translateX(120%)';
              opacity = '0';
            }

            return (
              <div
                key={url}
                className="absolute transition-all duration-700 ease-out w-full max-w-[340px] md:max-w-[400px]"
                style={{
                  transform,
                  opacity,
                  zIndex,
                  pointerEvents: isActive ? 'auto' : 'none',
                  filter: isActive ? 'none' : 'grayscale(30%) blur(1px)',
                }}
              >
                <div className="relative group">
                  {/* Center Focus Reflection Effect */}
                  {isActive && (
                    <div className="absolute -inset-8 bg-[var(--cyan-glow)] blur-[80px] rounded-full -z-10 opacity-30" />
                  )}
                  <InstagramEmbed url={url} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-3 mt-12 pb-4">
        {REEL_URLS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 transition-all duration-500 rounded-full ${i === activeIndex ? 'w-10 bg-[var(--cyan)]' : 'w-2 bg-[var(--border-strong)]'
              }`}
          />
        ))}
      </div>
    </section>
  );
}
