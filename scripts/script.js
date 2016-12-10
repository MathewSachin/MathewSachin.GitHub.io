$(document).ready(function () {
    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function(){ 
        $('.navbar-toggle:visible').click();
    });
});

function navbarToggle(x) {
    x.classList.toggle("change");
}

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