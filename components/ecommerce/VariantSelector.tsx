'use client';

import React from 'react';

import { ProductVariant } from '@/app/e-commerce/product/[id]/page';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onVariantChange: (variant: ProductVariant) => void;
  baseName?: string;
}

const formatVariantLabelForCard = (v: ProductVariant) => {
  // Use variation_suffix as the primary source of truth as it's more stable
  let source = v.variation_suffix || v.name || '';

  // Basic cleanup: remove brackets and leading/trailing dashes
  let clean = source.replace(/^\[|\]$/g, '').trim();
  while (clean.startsWith('-')) clean = clean.substring(1);
  while (clean.endsWith('-')) clean = clean.substring(0, clean.length - 1);

  const parts = clean.split(/[-/]/).map(p => p.trim()).filter(p => {
    const lp = p.toLowerCase();
    return lp !== 'na' && lp !== 'not applicable' && lp !== 'none' && lp !== '';
  });

  // Specific conversion for "US X / EU Y" patterns
  // Pattern: detects "us" followed by a number, and another numeric part for EU
  let usIndex = -1;
  let usVal = '';
  let euVal = '';

  for (let i = 0; i < parts.length; i++) {
    const low = parts[i].toLowerCase();
    if (low === 'us' && i + 1 < parts.length && !isNaN(Number(parts[i + 1]))) {
      usIndex = i;
      usVal = parts[i + 1];
      break;
    }
  }

  if (usIndex !== -1) {
    // We found a US size value. Look for another numeric part to assume as EU
    for (let i = 0; i < parts.length; i++) {
      if (i !== usIndex && i !== (usIndex + 1) && !isNaN(Number(parts[i]))) {
        euVal = parts[i];
        break;
      }
    }

    if (usVal && euVal) {
      // Reconstruct the remaining parts (e.g. Color)
      const others = parts.filter((_, i) => i !== usIndex && i !== (usIndex + 1) && parts[i] !== euVal);
      const sizeStr = `US ${usVal} / EU ${euVal}`;
      return others.length > 0 ? `${sizeStr} - ${others.join(' - ')}` : sizeStr;
    }
  }

  // Fallback: standard hyphenation for other patterns
  return parts.join(' - ') || 'Standard';
};

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onVariantChange,
}) => {
  // Group variants by type (e.g., Size, Color) if they are clearly separable
  // For now, following the screenshot's "SHOE SIZE" pattern.
  const activeLabel = formatVariantLabelForCard(selectedVariant);
  const isSizeVariant = /^\d+/.test(activeLabel) || activeLabel.includes('US') || activeLabel.includes('EU');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-widest text-gray-900 uppercase">
            {isSizeVariant ? 'Select Size' : 'Select Option'}:
          </span>
          <span className="text-[11px] font-medium text-gray-500 uppercase">
            {activeLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {variants.map((v) => {
            const isSelected = selectedVariant.id === v.id;
            const isAvailable = v.in_stock && (v.available_inventory ?? 0) > 0;
            const label = formatVariantLabelForCard(v);
            
            // Extract a compact label (e.g., just the number if it's a size)
            const displayLabel = isSizeVariant ? (label.match(/\d+/) || [label])[0] : label;

            return (
              <button
                key={v.id}
                onClick={() => onVariantChange(v)}
                className={`group relative flex items-center justify-center transition-all duration-200 ${
                  isSizeVariant 
                    ? 'w-12 h-12 rounded-full border text-sm font-medium' 
                    : 'px-6 py-2.5 rounded-full border text-[11px] font-bold uppercase tracking-wider'
                } ${
                  isSelected
                    ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                    : isAvailable
                      ? 'bg-white border-gray-200 text-gray-900 hover:border-gray-900'
                      : 'bg-white border-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10">{displayLabel}</span>
                
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    <div className="w-[120%] h-[1px] bg-gray-200 -rotate-45" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VariantSelector;
