(function () {
    // Add table styles and wrap in responsive div
    document.querySelectorAll('.page-content table').forEach(function (table) {
        table.classList.add('table', 'table-bordered', 'table-striped', 'table-sm');
        var wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });

    // Blockquote styling
    document.querySelectorAll('blockquote').forEach(function (el) {
        el.classList.add('blockquote', 'fw-light');
    });

    // Lightbox via native <dialog>
    var lightbox = document.getElementById('img-lightbox');
    if (lightbox) {
        var lightboxImg = lightbox.querySelector('img');
        document.querySelectorAll('.page-content img').forEach(function (img) {
            img.addEventListener('click', function () {
                lightboxImg.src = this.src;
                lightboxImg.alt = this.alt || '';
                lightbox.showModal();
            });
        });
        document.getElementById('lightbox-close').addEventListener('click', function () {
            lightbox.close();
        });
        // Close on backdrop click
        lightbox.addEventListener('click', function (e) {
            var rect = lightbox.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right ||
                    e.clientY < rect.top || e.clientY > rect.bottom) {
                lightbox.close();
            }
        });
    }

    // Reading progress bar
    var progressBar = document.getElementById('reading-progress-bar');
    if (progressBar) {
        function updateProgress() {
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0;
            progressBar.style.width = progress + '%';
            progressBar.setAttribute('aria-valuenow', Math.round(progress));
        }
        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });
        updateProgress();
    }

    // Back to top button
    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', function () {
            backToTop.classList.toggle('visible', window.scrollY > 300);
        }, { passive: true });
        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Mobile TOC collapse
    var tocMobileBtn = document.getElementById('toc-mobile-btn');
    if (tocMobileBtn) {
        var tocMobileCollapse = document.getElementById('toc-nav-mobile-collapse');
        tocMobileBtn.addEventListener('click', function () {
            var expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', String(!expanded));
            tocMobileCollapse.classList.toggle('hidden');
        });
    }

    // TOC scroll-spy
    var tocNav = document.getElementById('toc-nav');
    var tocNavMobile = document.getElementById('toc-nav-mobile');
    var tocSidebar = document.getElementById('toc-sidebar');
    var tocMobile = document.getElementById('toc-mobile');
    if (tocNav) {
        var postContent = document.querySelector('#post .page-content');
        var headings = postContent ? Array.from(postContent.querySelectorAll('h2, h3')) : [];
        var SCROLL_OFFSET = 90;

        if (headings.length >= 3) {
            if (tocSidebar) tocSidebar.style.display = '';
            if (tocMobile) tocMobile.classList.remove('hidden');

            function updateToc() {
                var scrollPos = window.scrollY + SCROLL_OFFSET;
                var activeId = null;
                headings.forEach(function (h) {
                    if (h.offsetTop <= scrollPos) activeId = h.id;
                });
                tocNav.querySelectorAll('a').forEach(function (a) { a.classList.remove('toc-active'); });
                if (tocNavMobile) {
                    tocNavMobile.querySelectorAll('a').forEach(function (a) { a.classList.remove('toc-active'); });
                }
                if (activeId) {
                    var sel = 'a[href="#' + activeId + '"]';
                    tocNav.querySelectorAll(sel).forEach(function (a) { a.classList.add('toc-active'); });
                    if (tocNavMobile) {
                        tocNavMobile.querySelectorAll(sel).forEach(function (a) { a.classList.add('toc-active'); });
                    }
                }
            }
            window.addEventListener('scroll', updateToc, { passive: true });
            window.addEventListener('resize', updateToc, { passive: true });
        }
    }
})();

