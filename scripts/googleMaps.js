function initMap() {
    var mapCenter = new google.maps.LatLng(28.3518053, 77.3357153);

    var mapProp =
    {
        center: mapCenter,
        zoom: 2,
        scrollwheel: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        overviewMapControl: true,
    };

    var map = new google.maps.Map(document.getElementById("googleMap"), mapProp);

    var marker = new google.maps.Marker({position: mapCenter});

    marker.setMap(map);

    google.maps.event.addListener(marker, 'click', function() {
        map.setZoom(12);
        map.setCenter(marker.getPosition());
    });
}