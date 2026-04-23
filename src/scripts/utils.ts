const COPY_RESET_DELAY = 2000; // ms before copy icon reverts to link icon

export function escapeHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function addListeners<T extends Element = Element>(selector: string, event: string, handler: (el: T) => void) {
  document.querySelectorAll(selector).forEach(function (el) {
    el.addEventListener(event, function () { handler(el as unknown as T); });
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  try {
    if ('gtag' in window && typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    } else {
      console.debug('Google Analytics is not initialized. Event not tracked:', name, params);
    }
  } catch (e) {
    console.warn('Failed to track event:', name, params, e);
  }
}

export function registerCopyToClipboard(
  button: Element,
  textFetcher: () => string | null | undefined,
  icon: Element | null,
  onCopy?: () => void
) {
  const originalIconClass = icon ? (icon as HTMLElement).className : null;
  button.addEventListener('click', async function () {
    const text = textFetcher() || '';

    const copied = await copyToClipboard(text);
    if (icon) {
      const parts = originalIconClass ? originalIconClass.split(' ') : [];
      const faIdx = parts.findIndex((p) => p && p.indexOf('fa-') === 0);
      const successParts = parts.slice();
      const failParts = parts.slice();
      if (faIdx !== -1) {
        successParts[faIdx] = 'fa-check';
        failParts[faIdx] = 'fa-times';
      } else {
        successParts.push('fa-check');
        failParts.push('fa-times');
      }
      (icon as HTMLElement).className = copied ? successParts.join(' ') : failParts.join(' ');
      setTimeout(function () { (icon as HTMLElement).className = originalIconClass || ''; }, COPY_RESET_DELAY);
    }

    if (copied && onCopy) {
      onCopy();
    }
  });
}

export async function copyToClipboard(text: string) {
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch (_) {
  }

  return copied;
}
