(function () {
    document.addEventListener("click", function (e) {
        var btn = e.target.closest(".btn-clip");
        if (!btn) return;
        var selector = btn.getAttribute("data-clipboard-target");
        var target = selector ? document.querySelector(selector) : null;
        if (!target) return;
        navigator.clipboard.writeText(target.textContent).catch(function () {});
    });
}());