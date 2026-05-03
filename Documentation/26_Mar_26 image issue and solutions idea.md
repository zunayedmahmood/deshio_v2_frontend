# Image Access Issue Investigation & Solutions (26-Mar-2026)

## 1. Issue Overview
We are experiencing a critical issue where approximately 55% of product images are returning **404 Not Found** errors on the frontend, despite being physically present on the server.

### Key Observations:
- **Timeline Split**: Images uploaded before **March 7-8, 2026** (timestamps `1772...`) are working correctly (Status 200). Images uploaded after this date (timestamps `1773...`) are failing (Status 404).
- **Server Behavior**:
    - **Success (200)**: These are served directly by the **LiteSpeed** web server as static files. Headers show `Content-Type: image/jpeg` and `Accept-Ranges: bytes`.
    - **Failure (404)**: These are falling through to the **Laravel (PHP)** backend. Headers show `X-Powered-By: PHP/8.2.30` and `Content-Type: application/json`.
- **Physical Presence**: Manual verification confirms that the files exist on the server at the exact paths specified in the database.

---

## 2. Root Cause Analysis (Theories)

### Theory A: The "Accidental Real Directory" (Most Likely)
When a project is synced or moved, the `public/storage` symlink is sometimes replaced by a **real directory** containing a copy of the files.
- **Scenario**: During a deployment around March 8th, the `public/storage` symlink was accidentally replaced with a real folder containing the then-current images.
- **Result**:
    - Old images exist in both the real `storage/app/public` folder and the "frozen" `public/storage` folder.
    - New images are uploaded to `storage/app/public` (where Laravel is configured to save them), but they are **not visible** to the web server because `public/storage` is no longer a link to that folder.
    - LiteSpeed looks in `public/storage/products/4973/...`, doesn't find the new file, and hands the request to Laravel, which also fails because the route doesn't exist.

### Theory B: Directory Permissions / Restrictive Umask
Laravel's `storeAs` method creates subdirectories for each product ID (e.g., `storage/app/public/products/4973`).
- **Scenario**: The PHP process (handled by LiteSpeed's LSAPI) might be creating new directories with restrictive permissions (e.g., `700` or `drwx------`).
- **Result**: The web server user (which might be different from the PHP user) cannot "enter" the new product folders, even if the image file itself is readable. This explains why older folders (created with different permissions) still work.

### Theory C: Case Sensitivity
Linux filesystems are case-sensitive.
- **Scenario**: If a file is saved as `.JPEG` but requested as `.jpeg`, it will 404.
- **Analysis**: However, the probe shows that both working and failing URLs use `.jpeg`, and the code uses `getClientOriginalExtension()`. If the user confirmed "exact name", this is less likely but should be checked.

### Theory D: Disk Configuration Inconsistency (Code Bug)
In `Deshio_be/app/Models/ProductImage.php`:
```php
public function getImageUrlAttribute() {
    return $this->image_path ? Storage::url($this->image_path) : null;
}
```
The model uses `Storage::url()` which defaults to the disk set in `FILESYSTEM_DISK`. If this is set to `local` instead of `public`, but images are saved to `public`, it could cause path resolution issues on some environments, although the URL string `/storage/...` usually looks the same.

---

## 3. Proposed Fixes & Workplan

### Phase 1: Infrastructure Fix (Immediate)
1. **Fix the Symlink**:
    - SSH into the server and navigate to the `Deshio_be` directory.
    - Run: `ls -la public/storage`. 
    - If it says `drwxr-xr-x` (a directory) instead of `lrwxrwxrwx` (a link), this is the problem.
    - **Action**:
        ```bash
        rm -rf public/storage
        php artisan storage:link
        ```
2. **Fix Permissions**:
    - Ensure all folders in the storage path are readable by the web server.
    - Run:
        ```bash
        find storage/app/public -type d -exec chmod 755 {} +
        find storage/app/public -type f -exec chmod 644 {} +
        ```

### Phase 2: Code Robustness (Prevention)
1. **Enforce Disk in Model**: Update `ProductImage.php` to explicitly use the `public` disk to avoid dependency on the `FILESYSTEM_DISK` env variable.
    - Change `Storage::url($this->image_path)` to `Storage::disk('public')->url($this->image_path)`.
2. **Sanitize Extensions**: Force lowercase extensions on upload to prevent case-sensitivity issues on Linux.

### Phase 3: Validation
1. **Check Statistics API**:
    - Access `GET /api/products/{productId}/images/statistics` for a failing product.
    - If `total_storage_bytes` is `0`, Laravel itself cannot find the file on the `public` disk, confirming a path/permission issue within the backend.
2. **Run Image Probe**: Re-run the scraper/probe to confirm all 100% of images return Status 200.

---

## 4. Implementation Details

### Updated `ProductImage.php` (Recommended Change)
```php
public function getImageUrlAttribute()
{
    // Explicitly use public disk to ensure consistency with controller upload logic
    return $this->image_path ? Storage::disk('public')->url($this->image_path) : null;
}

public function deleteImage()
{
    // Explicitly use public disk for deletion
    if ($this->image_path && Storage::disk('public')->exists($this->image_path)) {
        Storage::disk('public')->delete($this->image_path);
    }
    return $this->delete();
}
```

### Server-side Debugging Script
Save this as `test-images.php` in the root and run `php test-images.php`:
```php
<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$path = 'products/4973/1773394517_oCEIPKKQdQ.jpeg';
echo "Checking file: " . $path . "\n";
echo "Exists on public disk: " . (Illuminate\Support\Facades\Storage::disk('public')->exists($path) ? 'YES' : 'NO') . "\n";
echo "Public Path: " . storage_path('app/public/' . $path) . "\n";
echo "Physical file exists: " . (file_exists(storage_path('app/public/' . $path)) ? 'YES' : 'NO') . "\n";
echo "Permissions: " . substr(sprintf('%o', fileperms(storage_path('app/public/' . $path))), -4) . "\n";
```

## 5. Summary
The issue is likely an **infrastructure mismatch** caused by a broken symlink or directory permission drift during the March 7-8 updates. The code is mostly correct but lacks explicit disk definitions in the Model, making it vulnerable to environment changes. Re-establishing the `storage:link` and resetting permissions to `755/644` should resolve the majority of 404s.
