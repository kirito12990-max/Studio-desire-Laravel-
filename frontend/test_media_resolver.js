// Comprehensive test suite for resolveMediaUrl logic
import assert from 'assert';

// Emulate mediaResolver logic in node environment
function resolveMediaUrl(url, fallback = "", apiBaseUrl = "") {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  const lower = trimmed.toLowerCase();

  // Security: reject dangerous schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return fallback || "/placeholder.svg";
  }

  // Preserve safe client-side blob & data preview schemes
  if (lower.startsWith("blob:") || lower.startsWith("data:image/")) {
    return trimmed;
  }

  // Preserve valid absolute external HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Normalize Windows backslashes
  let cleanPath = trimmed.replace(/\\+/g, "/");

  // Strip duplicate leading slashes and ensure single leading slash
  cleanPath = cleanPath.replace(/^\/+/, "/");
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  // Deduplicate repeated /uploads path segments
  cleanPath = cleanPath.replace(/\/uploads\/uploads\//g, "/uploads/");

  // When apiBaseUrl is configured, prefix backend origin to root-relative media paths
  if (apiBaseUrl && cleanPath.startsWith("/uploads/")) {
    return `${apiBaseUrl}${cleanPath}`;
  }

  return cleanPath;
}

console.log("Running 10 Phase-10 URL Resolver Verification Tests...");

// 1. Root-relative /uploads/... paths
assert.strictEqual(
  resolveMediaUrl("/uploads/projects/entrance-01.webp"),
  "/uploads/projects/entrance-01.webp",
  "Test 1 failed: Root-relative path should be preserved"
);

// 2. Absolute backend-hosted URLs
assert.strictEqual(
  resolveMediaUrl("http://127.0.0.1:8080/uploads/projects/entrance-01.webp"),
  "http://127.0.0.1:8080/uploads/projects/entrance-01.webp",
  "Test 2 failed: Absolute HTTP URL should be preserved"
);

// 3. External HTTPS image URLs
assert.strictEqual(
  resolveMediaUrl("https://images.unsplash.com/photo-1600585154340-be6161a56a0c"),
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
  "Test 3 failed: External HTTPS URL should be preserved"
);

// 4. Empty and null values
assert.strictEqual(resolveMediaUrl(null, "/fallback.png"), "/fallback.png", "Test 4a failed: Null value handling");
assert.strictEqual(resolveMediaUrl(undefined, "/fallback.png"), "/fallback.png", "Test 4b failed: Undefined handling");
assert.strictEqual(resolveMediaUrl("", "/fallback.png"), "/fallback.png", "Test 4c failed: Empty string handling");

// 5. Multiple leading slashes
assert.strictEqual(
  resolveMediaUrl("///uploads/cms/photo.jpg"),
  "/uploads/cms/photo.jpg",
  "Test 5 failed: Duplicate leading slashes should be collapsed"
);

// 6. Encoded filenames
assert.strictEqual(
  resolveMediaUrl("/uploads/cms/3D%20RENDER_FINAL.webp"),
  "/uploads/cms/3D%20RENDER_FINAL.webp",
  "Test 6 failed: URL-encoded filename should be preserved"
);

// 7. Legacy URL formats (missing leading slash & Windows backslashes)
assert.strictEqual(
  resolveMediaUrl("uploads\\cms\\sample.jpg"),
  "/uploads/cms/sample.jpg",
  "Test 7 failed: Windows backslashes and relative path should be normalized"
);

// 8. Security - dangerous schemes
assert.strictEqual(
  resolveMediaUrl("javascript:alert(document.cookie)", "/safe.svg"),
  "/safe.svg",
  "Test 8a failed: javascript: scheme must be rejected"
);
assert.strictEqual(
  resolveMediaUrl("file:///C:/Windows/system32/config/SAM", "/safe.svg"),
  "/safe.svg",
  "Test 8b failed: file: scheme must be rejected"
);

// 9. API Origin prefixing when API_BASE_URL is set
assert.strictEqual(
  resolveMediaUrl("/uploads/projects/test.webp", "", "https://api.studiodesire.com"),
  "https://api.studiodesire.com/uploads/projects/test.webp",
  "Test 9 failed: Configured media origin prefixing"
);

// 10. Prevention of duplicated hostnames and path prefixes
assert.strictEqual(
  resolveMediaUrl("/uploads/uploads/cms/img.webp"),
  "/uploads/cms/img.webp",
  "Test 10 failed: /uploads/uploads/ deduplication"
);

console.log("All 10 URL Resolver Verification Tests PASSED successfully!");
