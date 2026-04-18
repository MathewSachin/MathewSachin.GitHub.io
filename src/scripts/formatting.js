import { addListeners, trackEvent, registerCopyToClipboard } from './utils.js';

(function () {
    // Named constants — avoid magic numbers scattered through the file
    const COPY_RESET_DELAY      = 2000;         // ms before copy icon reverts to link icon
    const DEBOUNCE_DELAY        = 500;          // ms of inactivity before selection is tracked
    const SCROLL_MILESTONES     = [25, 50, 75, 90]; // percent-scroll milestones to report

    // Copy code button
    document.querySelectorAll(".btn-clip").forEach(function (btn) {
        const selector = btn.getAttribute("data-clipboard-target");
        const target = selector ? document.querySelector(selector) : null;
        if (!target) return;

        registerCopyToClipboard(
            btn,
            () => target.textContent,
            btn.querySelector("i"),
            () => trackEvent("copy_code"),
        );
    });

    // Series prev/next navigation clicks
    addListeners(".series-nav-btn, .series-prev-link", "click", function (seriesNavLink) {
        const direction = seriesNavLink.classList.contains("next-post") ? "next" : "previous";
        const titleEl = seriesNavLink.querySelector(".nav-title");
        trackEvent("series_nav_click", { direction: direction, post_title: titleEl ? titleEl.textContent.trim() : "" });
    });

    // Related post clicks
    addListeners(".related-post-link", "click", function (link) {
        const titleEl = link.querySelector(".card-title");
        trackEvent("related_post_click", { post_title: titleEl ? titleEl.textContent.trim() : "" });
    });

    // Post tag badge clicks
    addListeners(".post-tag .badge", "click", function (badge) {
        trackEvent("tag_click", { tag_name: badge.textContent.trim() });
    });

    // Social share button clicks
    addListeners("[data-share-method]", "click", function (el) {
        trackEvent("post_share", { method: el.getAttribute("data-share-method") });
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
    // of selection inactivity, preventing a flood of events while the user drags.
    (function () {
        // Ignore micro-selections (accidental clicks, word double-clicks, etc.)
        const MIN_SELECTION_LENGTH = 15;
        let highlightTimer = null;
        document.addEventListener("selectionchange", function () {
            clearTimeout(highlightTimer);
            highlightTimer = setTimeout(function () {
                const selection = document.getSelection();
                if (!selection || selection.toString().length <= MIN_SELECTION_LENGTH) return;
                const node = selection.anchorNode;
                if (!node) return;
                const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                if (el && el.closest("div.highlight")) {
                    trackEvent("manual_code_highlight", { page_path: window.location.pathname });
                }
            }, DEBOUNCE_DELAY);
        });
    }());

    // Scroll depth milestones: passive listener avoids any scroll jank; the per-event
    // work is a single arithmetic expression plus an O(4) array walk.
    (function () {
        const milestonesReached = [];
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
