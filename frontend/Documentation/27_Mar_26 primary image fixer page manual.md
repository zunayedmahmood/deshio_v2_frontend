# Primary Image Fixer Manual (27 Mar 2026)

The **Primary Image Fixer** is a dedicated administrative utility designed to allow rapid correction of primary product images across the catalog without entering the full product edit flow.

## 📍 Accessing the Page
This page is a **hidden utility route** and is not linked in the main sidebar. 
- **URL**: `/product/primary-image-fix`

## 🛠 Features
- **Global Search**: Search by Product Name, SKU, or Product ID.
- **Bulk Primary Update**: Select new primary images for multiple products and save them all at once.
- **Theme Support**: Fully compatible with both Light and Dark modes.
- **Fresh Asset Sync**: Automatically fetches the latest image status from the backend upon loading and individual updates.

## 📖 How to Use

### 1. Finding Products
Use the search bar at the top to filter the catalog. The list is sorted by the most recently updated products first.

### 2. Selecting a Primary Image
Each product card displays its currently active images.
- **Blue Border**: Indicates the currently selected candidate for the primary image.
- **"Primary" Label**: Indicates which image is currently saved as primary in the backend.
- **Position (Pos)**: Shows the current sort order of the image.

To change the primary image, simply click on the thumbnail you wish to set as primary.

### 3. Saving Changes
- **Individual Save**: Click **"Update Row"** on a specific product card to save only that product's change.
- **Bulk Save**: Click **"Save All Changes"** in the top utility bar to process all pending updates across the current page.

## ⚠️ Important Notes
- **Active Images Only**: Only images marked as "active" in the backend are displayed and eligible for primary status selection.
- **Permissions**: You must have `products.edit` or `products.manage_images` permissions to access this page.
- **Fallback**: If a product has no images, a link to the "Add Product" page is provided to upload new assets.
