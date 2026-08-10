const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://cloudflareinsights.com https://nominatim.openstreetmap.org",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https://tile.openstreetmap.org",
    "object-src 'none'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "style-src 'self'",
    "upgrade-insecure-requests"
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(self), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

function canonicalRedirect(url) {
  const canonical = new URL(url);
  canonical.protocol = "https:";
  canonical.hostname = "urdog.dev";
  canonical.port = "";

  if (canonical.pathname.endsWith("/index.html")) {
    canonical.pathname = canonical.pathname.slice(0, -"index.html".length);
  }

  if (["/breeds", "/photo-credits"].includes(canonical.pathname)) {
    canonical.pathname += "/";
  }

  return Response.redirect(canonical.toString(), 308);
}

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  const contentType = headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  } else if (/\.(?:css|js|json|svg|png|webp|webmanifest)$/.test(pathname)) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  } else if (pathname.endsWith("/robots.txt") || pathname.endsWith("/sitemap.xml")) {
    headers.set("Cache-Control", "public, max-age=3600");
  }

  if (response.status === 404) {
    headers.set("X-Robots-Tag", "noindex");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.hostname === "www.urdog.dev"
      || url.pathname.endsWith("/index.html")
      || ["/breeds", "/photo-credits"].includes(url.pathname)
    ) {
      return canonicalRedirect(url);
    }

    const response = await env.ASSETS.fetch(request);
    return withHeaders(response, url.pathname);
  }
};

export { SECURITY_HEADERS, canonicalRedirect, withHeaders };
