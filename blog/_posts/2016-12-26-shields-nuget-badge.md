---
title: Making a Shields.io NuGet badge
tags: [nuget, shields]
---

**EDIT: shields.io now has a NuGet badge**

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

{% gist MathewSachin/a1eaec35d3f42c3f11955f0ccdda4ba3 %}