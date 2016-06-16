$(document).ready(function ()
{
    var myCenter = new google.maps.LatLng(28.3518053, 77.3357153);

    function initialize()
    {
        var mapProp =
        {
            center: myCenter,
            zoom: 12,
            scrollwheel: false,
            draggable: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        var map = new google.maps.Map(document.getElementById("googleMap"), mapProp);

        var marker = new google.maps.Marker({ position: myCenter });

        marker.setMap(map);
    }

    google.maps.event.addDomListener(window, 'load', initialize);
});