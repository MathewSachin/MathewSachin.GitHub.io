function navbarToggle(x) {
    x.classList.toggle("change");
}

$(function () {
    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function(){ 
        $('.navbar-toggle:visible').click();
    });

    // Back to Top
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100)
            $('.back-to-top').fadeIn(500);
        else $('.back-to-top').fadeOut(500);
    });
});