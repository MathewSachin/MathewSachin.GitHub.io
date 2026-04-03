(function () {
    document.querySelectorAll('div.highlight').forEach(function (block, i) {
        var id = 'code-block-' + (i + 1);
        var pre = block.querySelector('pre');
        if (pre) pre.id = id;

        // Detect language from the <code> class or the parent wrapper class
        var code = block.querySelector('code');
        var codeClass = (code && code.className) || '';
        var parentClass = (block.parentElement && block.parentElement.className) || '';
        var langMatch = codeClass.match(/language-(\w+)/) || parentClass.match(/language-(\w+)/);
        var lang = langMatch ? langMatch[1] : '';

        var langSpan = document.createElement('span');
        if (lang) {
            langSpan.className = 'code-lang';
            langSpan.textContent = lang;
        }

        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn-clip';
        copyBtn.setAttribute('data-clipboard-target', '#' + id);
        copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
        copyBtn.setAttribute('title', 'Copy to clipboard');
        copyBtn.innerHTML = '<i class="fa fa-copy" aria-hidden="true"></i>';

        var header = document.createElement('div');
        header.className = 'code-block-header';
        header.appendChild(langSpan);
        header.appendChild(copyBtn);

        block.insertBefore(header, block.firstChild);
    });

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-clip');
        if (!btn) return;
        var targetId = btn.getAttribute('data-clipboard-target');
        var target = targetId && document.querySelector(targetId);
        if (target) {
            navigator.clipboard.writeText(target.textContent).catch(function () {});
            btn.title = 'Copied!';
            setTimeout(function () { btn.title = 'Copy to clipboard'; }, 1500);
        }
    });
})();
