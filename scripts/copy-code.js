var blocks = $("div.highlight");

blocks.each(function(i) {
    var id = "block" + (i + 1);
    $(this).attr('id', id);

    var btn = '<button class="btn btn-info btn-sm px-2 btn-clip" data-clipboard-target="#' + id + '" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Copy to clipboard"><i class="fa fa-copy fa-lg"></i></button>';
    
    var code = $(this);

    code.prepend(btn);
});

document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
    new bootstrap.Tooltip(el);
});
new ClipboardJS('.btn-clip');