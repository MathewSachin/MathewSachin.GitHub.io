---
title: Generating QR Codes (using Google Charts API)
---

>QR Code (abbreviated from Quick Response Code) is a machine-readable code consisting of an array of black and white squares, typically used for storing URLs or other information for reading by the camera on a smartphone.

As an example, here's the QR Code containing link to the homepage of this site:

![QR Code](/images/qr.png)

The Google Chart API is a tool that lets people easily create a chart from some data and embed it in a web page.
Google creates a PNG image of a chart from data and formatting parameters in an HTTP request.

Here's the general format:

`https://chart.googleapis.com/chart?cht=qr&chl=DATA&chs=160x160&chld=L|0`

Parameters | Description
-----------|---------------
chl        | The content to encode. Make sure the content is HTML encoded, e.g. `%20` for space.
cht        | Chart type. `qr` for QR Code.
chs        | Dimensions of the generated QR Code image as `<width>x<height>`.

See [Google Developer Site](https://developers.google.com/chart/infographics/docs/qr_codes) for more info.

So, here's a [CodePen](https://codepen.io) sample:

<p data-height="443" data-theme-id="0" data-slug-hash="LxPzob" data-default-tab="js,result" data-user="MathewSachin" data-embed-version="2" data-pen-title="QR Code Generator" class="codepen">See the Pen <a href="http://codepen.io/MathewSachin/pen/LxPzob/">QR Code Generator</a> by Mathew Sachin (<a href="http://codepen.io/MathewSachin">@MathewSachin</a>) on <a href="http://codepen.io">CodePen</a>.</p>
<script async src="https://production-assets.codepen.io/assets/embed/ei.js"></script>