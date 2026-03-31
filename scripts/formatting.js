$(function () {
    $(".page-content table").addClass("table table-bordered table-striped table-sm");
    $("blockquote").addClass("blockquote fw-light");

    // Lightbox: click on blog post images to expand
    var $lightbox = $("#img-lightbox");
    if ($lightbox.length) {
        $(".page-content img").on("click", function () {
            $lightbox.find(".modal-body img").attr("src", $(this).attr("src")).attr("alt", $(this).attr("alt") || "");
            bootstrap.Modal.getOrCreateInstance($lightbox[0]).show();
        });
    }

    // Reading progress bar
    var $progressBar = $("#reading-progress-bar");
    if ($progressBar.length) {
        function updateProgress() {
            var docHeight = $(document).height() - $(window).height();
            var progress = docHeight > 0 ? Math.min(($(window).scrollTop() / docHeight) * 100, 100) : 0;
            $progressBar.css("width", progress + "%").attr("aria-valuenow", Math.round(progress));
        }
        $(window).on("scroll.progress resize.progress", updateProgress);
        updateProgress();
    }

    // Back to top button
    var $backToTop = $("#back-to-top");
    if ($backToTop.length) {
        $(window).on("scroll.backtop", function () {
            if ($(this).scrollTop() > 300) {
                $backToTop.addClass("visible");
            } else {
                $backToTop.removeClass("visible");
            }
        });
        $backToTop.on("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Table of contents: auto-generated from h2/h3 headings
    var $tocNav = $("#toc-nav");
    var $tocNavMobile = $("#toc-nav-mobile");
    var $tocSidebar = $("#toc-sidebar");
    var $tocMobile = $("#toc-mobile");
    if ($tocNav.length) {
        var $postContent = $("#post .page-content");
        var $headings = $postContent.find("h2, h3");
        // Offset in px to account for the fixed navbar when scroll-spying
        var SCROLL_OFFSET = 90;

        if ($headings.length >= 3) {
            $headings.each(function () {
                var $h = $(this);
                var id = $h.attr("id");
                // Kramdown auto-generates IDs for all headings; skip any that lack one
                if (!id) return;
                var isH3 = this.tagName.toUpperCase() === "H3";
                var $link = $("<a>")
                    .attr("href", "#" + id)
                    .addClass(isH3 ? "toc-h3" : "")
                    .text($h.text());
                $tocNav.append($link);
                $tocNavMobile.append($link.clone());
            });

            $tocSidebar.show();
            $tocMobile.removeClass("d-none");

            // Scroll-spy: highlight active section in both navs
            $(window).on("scroll.toc resize.toc", function () {
                var scrollPos = $(window).scrollTop() + SCROLL_OFFSET;
                var activeId = null;
                $headings.each(function () {
                    if ($(this).offset().top <= scrollPos) {
                        activeId = $(this).attr("id");
                    }
                });
                $tocNav.find("a").removeClass("toc-active");
                $tocNavMobile.find("a").removeClass("toc-active");
                if (activeId) {
                    $tocNav.find('a[href="#' + activeId + '"]').addClass("toc-active");
                    $tocNavMobile.find('a[href="#' + activeId + '"]').addClass("toc-active");
                }
            });
        }
    }
});
