function navbarToggle(x) {
    x.classList.toggle("change");
}

$(function () {
    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function(){ 
        $('.navbar-toggle:visible').click();
    });
});