(function () {
    // Named constants — avoid magic numbers scattered through the file
    const BACK_TO_TOP_THRESHOLD = 300;          // px of scroll before button appears
    const COPY_RESET_DELAY      = 2000;         // ms before copy icon reverts to link icon
    const DEBOUNCE_DELAY        = 500;          // ms of inactivity before selection is tracked
    const SCROLL_MILESTONES     = [25, 50, 75, 90]; // percent-scroll milestones to report

    // Safe GA event tracker — no-ops gracefully if analytics is blocked
    function trackEvent(name, params) {
        try {
            if (typeof window.gtag === "function") {
                window.gtag("event", name, params || {});
            }
        } catch (_) {}
    }

    // Shorthand: attach the same event listener to every element matching a selector
    function addListeners(selector, event, handler) {
        document.querySelectorAll(selector).forEach(function (el) {
            el.addEventListener(event, function () { handler(el); });
        });
    }

    // Lightbox: click on blog post images to expand
    const lightbox = document.getElementById("img-lightbox");
    if (lightbox) {
        const lightboxImg = lightbox.querySelector("img");
        addListeners(".page-content img", "click", function (img) {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt || "";
            lightbox.showModal();
            trackEvent("image_expand", { image_alt: img.alt || img.src.split("/").pop() });
        });
        lightbox.querySelector(".lightbox-close").addEventListener("click", function () {
            lightbox.close();
        });
        // Click on the dialog backdrop (outside content) to close
        lightbox.addEventListener("click", function (e) {
            if (e.target === lightbox) lightbox.close();
        });
    }

    // Reading progress bar
    const progressBar = document.getElementById("reading-progress-bar");
    if (progressBar) {
        function updateProgress() {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0;
            progressBar.style.width = progress + "%";
            progressBar.setAttribute("aria-valuenow", Math.round(progress));
        }
        window.addEventListener("scroll", updateProgress);
        window.addEventListener("resize", updateProgress);
        updateProgress();
    }

    // Back to top button — only visible when scrolling up past the threshold
    const backToTop = document.getElementById("back-to-top");
    if (backToTop) {
        let backToTopLastY = window.scrollY;
        window.addEventListener("scroll", function () {
            const currentScrollY = window.scrollY;
            const scrollingUp = currentScrollY < backToTopLastY;
            backToTopLastY = currentScrollY;
            backToTop.classList.toggle("visible", scrollingUp && currentScrollY > BACK_TO_TOP_THRESHOLD);
        });
        backToTop.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
            trackEvent("back_to_top");
        });
    }

    // Mobile TOC collapse toggle
    const tocToggle = document.querySelector(".toc-mobile-toggle");
    const tocCollapse = document.getElementById("toc-collapse");
    if (tocToggle && tocCollapse) {
        tocToggle.addEventListener("click", function () {
            const expanded = tocToggle.getAttribute("aria-expanded") === "true";
            tocToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
            tocCollapse.classList.toggle("show");
            trackEvent("toc_mobile_toggle", { action: expanded ? "collapse" : "expand" });
        });
    }

    // Table of contents: scroll-spy for statically generated TOC
    const tocNav = document.getElementById("toc-nav");
    const tocSidebar = document.getElementById("toc-sidebar");
    if (tocNav) {
        const postContent = document.querySelector("#post .page-content");
        const headings = postContent ? Array.from(postContent.querySelectorAll("h2, h3")) : [];
        // Offset in px to account for the fixed navbar when scroll-spying
        const SCROLL_OFFSET = 90;
        // Cache anchor list — reused for both scroll-spy and click tracking
        const tocLinks = tocNav.querySelectorAll("a");

        if (headings.length >= 3) {
            tocSidebar.style.display = "";

            // Mobile: float only the TOC card at the top of the viewport when scrolling up,
            //         but only after the TOC has scrolled completely off-screen.
            const mobileBreakpoint = window.matchMedia("(max-width: 767.98px)");
            // Select the specific TOC card that contains the collapse — not the affiliate sidebar
            // card which also carries the .toc-card class and is hidden on mobile.
            const tocCard = document.getElementById("toc-collapse")?.closest(".toc-card");
            // Capture the stable scroll threshold once before any stickiness changes layout
            const tocOffscreenAt = tocSidebar.getBoundingClientRect().bottom + window.scrollY;
            let tocLastScrollY = window.scrollY;
            let tocStickyActive = false;
            window.addEventListener("scroll", function () {
                if (!mobileBreakpoint.matches || !tocCard) { return; }
                const currentScrollY = window.scrollY;
                const scrollingUp = currentScrollY < tocLastScrollY;
                tocLastScrollY = currentScrollY;
                // Only make sticky once we've scrolled past the TOC's original bottom position
                const shouldBeSticky = scrollingUp && currentScrollY > tocOffscreenAt;
                if (shouldBeSticky === tocStickyActive) { return; }
                tocStickyActive = shouldBeSticky;
                if (shouldBeSticky) {
                    // Measure offsetHeight BEFORE applying position:fixed (line below) so the
                    // sidebar retains the same occupied space and the page doesn't jump.
                    tocSidebar.style.minHeight = tocCard.offsetHeight + "px";
                    // Collapse the TOC contents every time it becomes sticky so it stays compact.
                    if (tocCollapse) { tocCollapse.classList.remove("show"); }
                    if (tocToggle) { tocToggle.setAttribute("aria-expanded", "false"); }
                } else {
                    tocSidebar.style.minHeight = "";
                }
                tocCard.classList.toggle("toc-mobile-sticky", shouldBeSticky);
            });

            // Scroll-spy: highlight active section in TOC nav
            function updateToc() {
                const scrollPos = window.scrollY + SCROLL_OFFSET;
                let activeId = null;
                headings.forEach(function (h) {
                    if (h.getBoundingClientRect().top + window.scrollY <= scrollPos) {
                        activeId = h.id;
                    }
                });
                tocLinks.forEach(function (a) { a.classList.remove("toc-active"); });
                if (activeId) {
                    const sel = 'a[href="#' + activeId + '"]';
                    tocNav.querySelectorAll(sel).forEach(function (a) { a.classList.add("toc-active"); });
                }
            }
            window.addEventListener("scroll", updateToc);
            window.addEventListener("resize", updateToc);
        }

        // Track TOC link clicks and collapse mobile TOC on selection
        tocLinks.forEach(function (a) {
            a.addEventListener("click", function () {
                trackEvent("toc_click", { section: a.getAttribute("href") || "", link_text: a.textContent.trim() });
                // Collapse the TOC on mobile after the user taps a link
                if (tocCollapse && tocCollapse.classList.contains("show")) {
                    tocCollapse.classList.remove("show");
                    if (tocToggle) { tocToggle.setAttribute("aria-expanded", "false"); }
                }
            });
        });
    }

    // Copy code button
    addListeners(".btn-clip", "click", function (btn) {
        const selector = btn.getAttribute("data-clipboard-target");
        const target = selector ? document.querySelector(selector) : null;
        if (!target) return;
        navigator.clipboard.writeText(target.textContent).catch(function () {});
        trackEvent("code_copy");
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
        copyPostLink.addEventListener("click", async function () {
            const url = window.location.href;
            const icon = copyPostLink.querySelector("i");
            let copied = false;
            try {
                await navigator.clipboard.writeText(url);
                copied = true;
            } catch (_) {
                // Fallback: create a temporary textarea for manual copy
                const textarea = document.createElement("textarea");
                textarea.value = url;
                textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try { copied = !!document.execCommand("copy"); } catch (_) {}
                document.body.removeChild(textarea);
            }
            if (copied) {
                if (icon) { icon.className = "fa fa-check"; }
                setTimeout(function () { if (icon) { icon.className = "fa fa-link"; } }, COPY_RESET_DELAY);
                trackEvent("post_share", { method: "copy_link" });
            }
        });
    }

    // Intersection Observer: fire once when a code block or image/diagram enters the viewport.
    // Uses the browser-native async API so it never blocks the main thread.
    if (typeof IntersectionObserver !== "undefined") {
        const viewTargets = document.querySelectorAll("div.highlight, img, svg");
        if (viewTargets.length) {
            const viewObserver = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        const tag = entry.target.tagName.toLowerCase();
                        trackEvent("element_viewed", {
                            element_type: tag === "div" ? "code_block" : "image_or_diagram",
                            page_path: window.location.pathname
                        });
                        obs.unobserve(entry.target); // track each element only once
                    }
                });
            }, { threshold: 0.5 });
            viewTargets.forEach(function (el) { viewObserver.observe(el); });
        }
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
