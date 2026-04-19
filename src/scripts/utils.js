const COPY_RESET_DELAY = 2000;         // ms before copy icon reverts to link icon

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

export function registerCopyToClipboard(button, textFetcher, icon, onCopy) {
    const originalIconClass = icon ? icon.className : null;
    button.addEventListener("click", async function () {
        const text = textFetcher();

        const copied = await copyToClipboard(text);
        if (icon) {
            var parts = originalIconClass ? originalIconClass.split(' ') : [];
            var faIdx = parts.findIndex((p) => p && p.indexOf('fa-') === 0);
            var successParts = parts.slice();
            var failParts = parts.slice();
            if (faIdx !== -1) {
                successParts[faIdx] = 'fa-check';
                failParts[faIdx] = 'fa-times';
            } else {
                successParts.push('fa-check');
                failParts.push('fa-times');
            }
            icon.className = copied ? successParts.join(' ') : failParts.join(' ');
            setTimeout(function () { icon.className = originalIconClass; }, COPY_RESET_DELAY);
        }

        if (copied && onCopy) {
            onCopy();
        }
    });
}

export async function copyToClipboard(text) {
    let copied = false;
    try {
        await navigator.clipboard.writeText(text);
        copied = true;
    } catch (_) {
        // Fallback: create a temporary textarea for manual copy
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try { copied = !!document.execCommand("copy"); } catch (_) {}
        document.body.removeChild(textarea);
    }

    return copied;
}