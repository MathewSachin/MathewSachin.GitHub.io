(function () {
    document.querySelectorAll("div.highlight").forEach(function (block, i) {
        var id = "code-block-" + (i + 1);
        var pre = block.querySelector("pre");
        pre.id = id;

        // Detect language: check the <code> class first (set by Jekyll/highlight.js),
        // then fall back to the outer wrapper div (e.g. "language-kotlin highlighter-rouge").
        var codeEl = block.querySelector("code");
        var parentEl = block.parentElement;
        var codeClass = (codeEl && codeEl.getAttribute("class")) || "";
        var parentClass = (parentEl && parentEl.getAttribute("class")) || "";
        var langMatch = codeClass.match(/language-(\w+)/) || parentClass.match(/language-(\w+)/);
        var lang = langMatch ? langMatch[1] : "";

        // Use safe DOM construction so the language label is always treated as text
        var langSpan = document.createElement("span");
        if (lang) langSpan.className = "code-lang";
        langSpan.textContent = lang;

        var copyBtn = document.createElement("button");
        copyBtn.className = "btn btn-sm btn-clip";
        copyBtn.title = "Copy to clipboard";
        copyBtn.setAttribute("data-clipboard-target", "#" + id);
        copyBtn.setAttribute("aria-label", "Copy code to clipboard");
        copyBtn.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i>';

        var header = document.createElement("div");
        header.className = "code-block-header d-flex align-items-center justify-content-between px-3 py-1";
        header.appendChild(langSpan);
        header.appendChild(copyBtn);

        block.insertBefore(header, block.firstChild);
    });

    document.addEventListener("click", function (e) {
        var btn = e.target.closest(".btn-clip");
        if (!btn) return;
        var selector = btn.getAttribute("data-clipboard-target");
        var target = selector ? document.querySelector(selector) : null;
        if (!target) return;
        navigator.clipboard.writeText(target.textContent).catch(function () {});
    });
}());