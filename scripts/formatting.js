(function () {
    // Safe GA event tracker — no-ops gracefully if analytics is blocked
    function trackEvent(name, params) {
        try {
            if (typeof window.gtag === "function") {
                window.gtag("event", name, params || {});
            }
        } catch (_) {}
    }

    // Lightbox: click on blog post images to expand
    var lightbox = document.getElementById("img-lightbox");
    if (lightbox) {
        var lightboxImg = lightbox.querySelector("img");
        document.querySelectorAll(".page-content img").forEach(function (img) {
            img.addEventListener("click", function () {
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt || "";
                lightbox.showModal();
                trackEvent("image_expand", { image_alt: img.alt || img.src.split("/").pop() });
            });
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
    var progressBar = document.getElementById("reading-progress-bar");
    if (progressBar) {
        function updateProgress() {
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0;
            progressBar.style.width = progress + "%";
            progressBar.setAttribute("aria-valuenow", Math.round(progress));
        }
        window.addEventListener("scroll", updateProgress);
        window.addEventListener("resize", updateProgress);
        updateProgress();
    }

    // Back to top button
    var backToTop = document.getElementById("back-to-top");
    if (backToTop) {
        window.addEventListener("scroll", function () {
            backToTop.classList.toggle("visible", window.scrollY > 300);
        });
        backToTop.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
            trackEvent("back_to_top");
        });
    }

    // Mobile TOC collapse toggle
    var tocToggle = document.querySelector(".toc-mobile-toggle");
    var tocCollapse = document.getElementById("toc-nav-mobile-collapse");
    if (tocToggle && tocCollapse) {
        tocToggle.addEventListener("click", function () {
            var expanded = tocToggle.getAttribute("aria-expanded") === "true";
            tocToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
            tocCollapse.classList.toggle("show");
            trackEvent("toc_mobile_toggle", { action: expanded ? "collapse" : "expand" });
        });
    }

    // Table of contents: scroll-spy for statically generated TOC
    var tocNav = document.getElementById("toc-nav");
    var tocNavMobile = document.getElementById("toc-nav-mobile");
    var tocSidebar = document.getElementById("toc-sidebar");
    var tocMobile = document.getElementById("toc-mobile");
    if (tocNav) {
        var postContent = document.querySelector("#post .page-content");
        var headings = postContent ? Array.from(postContent.querySelectorAll("h2, h3")) : [];
        // Offset in px to account for the fixed navbar when scroll-spying
        var SCROLL_OFFSET = 90;

        if (headings.length >= 3) {
            tocSidebar.style.display = "";
            tocMobile.classList.remove("d-none");

            // Scroll-spy: highlight active section in both navs
            function updateToc() {
                var scrollPos = window.scrollY + SCROLL_OFFSET;
                var activeId = null;
                headings.forEach(function (h) {
                    if (h.getBoundingClientRect().top + window.scrollY <= scrollPos) {
                        activeId = h.id;
                    }
                });
                tocNav.querySelectorAll("a").forEach(function (a) { a.classList.remove("toc-active"); });
                tocNavMobile.querySelectorAll("a").forEach(function (a) { a.classList.remove("toc-active"); });
                if (activeId) {
                    var sel = 'a[href="#' + activeId + '"]';
                    tocNav.querySelectorAll(sel).forEach(function (a) { a.classList.add("toc-active"); });
                    tocNavMobile.querySelectorAll(sel).forEach(function (a) { a.classList.add("toc-active"); });
                }
            }
            window.addEventListener("scroll", updateToc);
            window.addEventListener("resize", updateToc);
        }

        // Track TOC link clicks in both desktop and mobile navs
        [tocNav, tocNavMobile].forEach(function (nav) {
            if (!nav) return;
            nav.querySelectorAll("a").forEach(function (a) {
                a.addEventListener("click", function () {
                    trackEvent("toc_click", { section: a.getAttribute("href") || "", link_text: a.textContent.trim() });
                });
            });
        });
    }

    // Copy code button
    document.querySelectorAll(".btn-clip").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var selector = btn.getAttribute("data-clipboard-target");
            var target = selector ? document.querySelector(selector) : null;
            if (!target) return;
            navigator.clipboard.writeText(target.textContent).catch(function () {});
            trackEvent("code_copy");
        });
    });

    // Series prev/next navigation clicks
    document.querySelectorAll(".series-nav-btn, .series-prev-link").forEach(function (seriesNavLink) {
        seriesNavLink.addEventListener("click", function () {
            var direction = seriesNavLink.classList.contains("next-post") ? "next" : "previous";
            var titleEl = seriesNavLink.querySelector(".nav-title");
            trackEvent("series_nav_click", { direction: direction, post_title: titleEl ? titleEl.textContent.trim() : "" });
        });
    });

    // Related post clicks
    document.querySelectorAll(".related-post-link").forEach(function (link) {
        link.addEventListener("click", function () {
            var titleEl = link.querySelector(".card-title");
            trackEvent("related_post_click", { post_title: titleEl ? titleEl.textContent.trim() : "" });
        });
    });

    // Post tag badge clicks
    document.querySelectorAll(".post-tag .badge").forEach(function (badge) {
        badge.addEventListener("click", function () {
            trackEvent("tag_click", { tag_name: badge.textContent.trim() });
        });
    });

    // Social share button clicks (Twitter / email) in the post header
    document.querySelectorAll('a[href*="twitter.com/intent/tweet"]').forEach(function (link) {
        link.addEventListener("click", function () { trackEvent("post_share", { method: "twitter" }); });
    });
    document.querySelectorAll('.bg-info a[href^="mailto:"]').forEach(function (link) {
        link.addEventListener("click", function () { trackEvent("post_share", { method: "email" }); });
    });
}());
