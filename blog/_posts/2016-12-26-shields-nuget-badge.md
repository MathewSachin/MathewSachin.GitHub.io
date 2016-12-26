---
title: Making a Shields.io NuGet badge
tags: [nuget, shields]
---

## What is Shields.io?
[Shields.io](http://shields.io) is a metadata badge service serving fast and scalable informational images as badges for GitHub, Travis CI, Jenkins, WordPress and many more services

Examples:  
![GitHub Stars](https://img.shields.io/github/stars/MathewSachin/Captura.svg?style=flat-square)
![AppVeyor Build Status](https://img.shields.io/appveyor/ci/MathewSachin/ManagedBass.svg?style=flat-square)
![GitHub Issues](https://img.shields.io/github/issues/ManagedBass/ManagedBass.svg?style=flat-square)

## Problem
Shields provides a wide variety of badges but unfortunately does not have a NuGet download counts badge.

Here's how it should look like:  
![NuGet badge](https://img.shields.io/badge/nuget-5.6K-green.svg?style=flat-square)

## Solution
The following code uses jQuery and [String Interpolation](https://developers.google.com/web/updates/2015/01/ES6-Template-Strings)

The trick is to call the NuGet API using AJAX and send the data to Shields to create a badge.

```javascript
// Supporting function to format the download count
function FormatDownloadCount(Download)
{
    var k = 1000;
    var m = k * k;

    // M for million
    if (Download >= m)
        return parseFloat((Download / m).toFixed(2)) + "M";

    // K for thousand
    return Download >= k
                ? (parseFloat((Download / k).toFixed(2)) +"K")
                : Download;
}

// Actual worker function.
// PackageName - ID of the package.
// ElementId - html ID of the element to recieve the image into.
function NuGetDownloadBadge(PackageName, ElementId)
{
    // uses String Interpolation `abc$(def)ghi`
    var searchQuery = `https://api-v2v3search-0.nuget.org/query?q=${PackageName}&skip=0&take=10`;

    // making an AJAX call to NuGet API
    $.ajax({
        url: searchQuery,
        dataType: 'jsonp',
        success: function (jsonResult)
        {
            var data = jsonResult.data;

            for (var i = 0, n = data.length; i < n; ++i)
            {
                if (data[i].id == PackageName)
                {
                    var count = FormatDownloadCount(data[i].totalDownloads);

                    // create and assign NuGet badge
                    // Change this line as required to customize the badge
                    $("#" + ElementId).html(`<img src="https://img.shields.io/badge/nuget-${count}-green.svg?style=flat-square">`);

                    break;
                }
            }
        }
    });
}
```