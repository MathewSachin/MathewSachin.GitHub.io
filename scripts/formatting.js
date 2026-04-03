(function () {
    // Lightbox: click on blog post images to expand
    var lightbox = document.getElementById("img-lightbox");
    if (lightbox) {
        var lightboxImg = lightbox.querySelector("img");
        document.querySelectorAll(".page-content img").forEach(function (img) {
            img.addEventListener("click", function () {
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt || "";
                lightbox.showModal();
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
    }

    // Copy code button
    document.addEventListener("click", function (e) {
        var btn = e.target.closest(".btn-clip");
        if (!btn) return;
        var selector = btn.getAttribute("data-clipboard-target");
        var target = selector ? document.querySelector(selector) : null;
        if (!target) return;
        navigator.clipboard.writeText(target.textContent).catch(function () {});
    });
}());
