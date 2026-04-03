var blocks = $("div.highlight");

blocks.each(function(i) {
    var id = "code-block-" + (i + 1);
    var $block = $(this);
    var $pre = $block.find('pre');
    $pre.attr('id', id);

    // Detect language: check the <code> class first (set by Jekyll/highlight.js),
    // then fall back to the outer wrapper div (e.g. "language-kotlin highlighter-rouge").
    var codeClass = $block.find('code').attr('class') || '';
    var parentClass = $block.parent().attr('class') || '';
    var langMatch = codeClass.match(/language-(\w+)/) || parentClass.match(/language-(\w+)/);
    var lang = langMatch ? langMatch[1] : '';

    // Use safe DOM construction so the language label is always treated as text
    var $langSpan = $('<span>').addClass(lang ? 'code-lang' : '').text(lang);
    var $copyBtn = $('<button class="btn btn-sm btn-clip" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Copy to clipboard">')
        .attr('data-clipboard-target', '#' + id)
        .attr('aria-label', 'Copy code to clipboard')
        .html('<i class="fa fa-copy" aria-hidden="true"></i>');

    var $header = $('<div class="code-block-header d-flex align-items-center justify-content-between px-3 py-1">')
        .append($langSpan)
        .append($copyBtn);

    $block.prepend($header);
});

document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
    new bootstrap.Tooltip(el);
});
$(document).on('click', '.btn-clip', function() {
    var selector = $(this).data('clipboard-target');
    var $target = $(selector);
    if (!$target.length) return;
    navigator.clipboard.writeText($target.text()).catch(function() {});
});