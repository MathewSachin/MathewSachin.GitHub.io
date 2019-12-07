var blocks = $("div.highlight");

blocks.each(function(i) {
    var id = "block" + (i + 1);
    $(this).attr('id', id);

    var btn = '<button class="btn btn-info btn-sm my-0 px-2 btn-clip float-right" data-clipboard-target="#' + id + '" data-toggle="tooltip" data-placement="bottom" title="Copy to clipboard"><i class="fa fa-copy fa-lg"></i></button>';
    
    var code = $(this);

    code.prepend(btn);
});

$('.btn-clip').tooltip()
new ClipboardJS('.btn-clip');