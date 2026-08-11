'use client';

// Compatibility bridge for the quarantined mobile-camera scanner.
// New integrations should import from @/components/barcode/mobile-quarantine/MobileCameraBarcodeScanner.
// Removing the temporary mobile-camera feature later only requires removing those integrations
// plus the mobile-quarantine folder; existing hardware/manual barcode workflows are independent.
export { default } from '@/components/barcode/mobile-quarantine/MobileCameraBarcodeScanner';
