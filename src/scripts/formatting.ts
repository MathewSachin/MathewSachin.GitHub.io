import { addListeners, trackEvent, registerCopyToClipboard } from './utils';

(function () {
    const DEBOUNCE_DELAY = 500; // ms of inactivity before selection is tracked
    const SCROLL_MILESTONES = [25, 50, 75, 90]; // percent-scroll milestones to report

    // Copy code button
    document.querySelectorAll(".btn-clip").forEach(function (btn) {
        const selector = btn.getAttribute("data-clipboard-target");
        const target = selector ? document.querySelector(selector) : null;
        if (!target) return;

        registerCopyToClipboard(
            btn as HTMLElement,
            () => target.textContent,
            btn.querySelector("i"),
            () => trackEvent("copy_code"),
        );
    });

    // Series prev/next navigation clicks
    addListeners(".series-nav-btn, .series-prev-link", "click", function (seriesNavLink: Element) {
        const direction = (seriesNavLink as Element).classList.contains("next-post") ? "next" : "previous";
        const titleEl = (seriesNavLink as Element).querySelector(".nav-title");
        const postTitle = titleEl ? ((titleEl.textContent || '').trim()) : "";
        trackEvent("series_nav_click", { direction: direction, post_title: postTitle });
    });

    // Related post clicks
    addListeners(".related-post-link", "click", function (link: Element) {
        const titleEl = (link as Element).querySelector(".card-title");
        const postTitle = titleEl ? ((titleEl.textContent || '').trim()) : "";
        trackEvent("related_post_click", { post_title: postTitle });
    });

    // Post tag badge clicks
    addListeners(".post-tag .badge", "click", function (badge: Element) {
        trackEvent("tag_click", { tag_name: (badge as Element).textContent?.trim() });
    });

    // Social share button clicks
    addListeners("[data-share-method]", "click", function (el: Element) {
        trackEvent("post_share", { method: (el as Element).getAttribute("data-share-method") });
    });

    // Copy post link button
    const copyPostLink = document.getElementById("copy-post-link");
    if (copyPostLink) {
        registerCopyToClipboard(
            copyPostLink,
            () => window.location.href,
            copyPostLink.querySelector("i"),
            () => trackEvent("post_share", { method: "copy_link" })
        );
    }

    // Manual code highlight tracker: debounced so it fires at most once per DEBOUNCE_DELAY ms
    (function () {
        const MIN_SELECTION_LENGTH = 15;
        let highlightTimer: number | null = null;
        document.addEventListener("selectionchange", function () {
            if (highlightTimer !== null) clearTimeout(highlightTimer);
            highlightTimer = window.setTimeout(function () {
                const selection = document.getSelection();
                if (!selection || selection.toString().length <= MIN_SELECTION_LENGTH) return;
                const node = selection.anchorNode;
                if (!node) return;
                const el = node.nodeType === Node.TEXT_NODE ? (node.parentElement as Element | null) : (node as Element);
                if (el && el.closest("div.highlight")) {
                    trackEvent("manual_code_highlight", { page_path: window.location.pathname });
                }
            }, DEBOUNCE_DELAY);
        });
    }());

    // Scroll depth milestones
    (function () {
        const milestonesReached: number[] = [];
        window.addEventListener("scroll", function () {
            const pct = Math.min(
                Math.round(
                    (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
                ),
                100
            );
            SCROLL_MILESTONES.forEach(function (milestone) {
                if (pct >= milestone && milestonesReached.indexOf(milestone) === -1) {
                    milestonesReached.push(milestone);
                    trackEvent("scroll_depth", {
                        percent_scrolled: milestone,
                        page_path: window.location.pathname
                    });
                }
            });
        }, { passive: true });
    }());
}());
