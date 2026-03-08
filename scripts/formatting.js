$(function () {
    $(".page-content table").addClass("table table-bordered table-striped table-sm");
    $("blockquote").addClass("blockquote fw-light");

    // Lightbox: click on blog post images to expand
    var $lightbox = $("#img-lightbox");
    if ($lightbox.length) {
        $(".page-content img").on("click", function () {
            $lightbox.find(".modal-body img").attr("src", $(this).attr("src")).attr("alt", $(this).attr("alt") || "");
            new bootstrap.Modal($lightbox[0]).show();
        });
    }
});
