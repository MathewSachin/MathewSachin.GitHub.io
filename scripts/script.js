function filterProjects() {
    var filter = $('#projectsFilter').val().toUpperCase();
    
    $("#projects li").each(function () {
        if ($(this).find("a").first().text().toUpperCase().indexOf(filter) > -1) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}