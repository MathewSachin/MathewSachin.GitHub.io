/** Escape special HTML characters to prevent XSS in template literals. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Shorthand: attach the same event listener to every element matching a selector
export function addListeners(selector, event, handler) {
    document.querySelectorAll(selector).forEach(function (el) {
        el.addEventListener(event, function () { handler(el); });
    });
}

// Safe GA event tracker — no-ops gracefully if analytics is blocked
export function trackEvent(name, params) {
    try {
        if (typeof window.gtag === "function") {
            window.gtag("event", name, params || {});
        } else {
            console.debug("Google Analytics is not initialized. Event not tracked:", name, params);
        }
    } catch (_) {
        console.warn("Failed to track event:", name, params);
    }
}