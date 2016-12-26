---
title: Using Windows Phone on Authenticated Proxy Wifi
tags: [wifi, proxy, windowsphone]
---

No matter how much you like your Windows Phone, you hate it when you reach college where you are provided with authenticated proxy Wi-Fi.
All your friends having Android phones enjoy the Wi-Fi using [Psiphon](https://psiphon.ca/) while you are left behind.

Here's a way to use the Internet on your Windows Phone:
- Connect to the college Wi-Fi on your Windows computer.

- Download, Install and Start [CCProxy](http://www.youngzsoft.net/ccproxy/) on your Windows computer.  
   *CCProxy is easy-to-use and powerful proxy server*.

![CCProxy](/images/ccproxy.png)

- Open `Options > Advanced > Cascading`.

![CCProxy Cascading](/images/ccproxy-cascade.png)

- Check `Enable Cascading Proxy`.

- Fill `Proxy Address` and `Port`.

- Select `HTTP` as `Proxy Protocol`.

- Check `Need Authentication`.

- Fill `User Name` and `Password`.

- Press `OK`.

- Now in `Options`, note the values of `Local IP Address` and `HTTP Port`.

![CCProxy Options](/images/ccproxy-options.png)

- Make a Wi-Fi hotspot on your Windows computer.  
  Windows 10 Anniversary Update and later include a built-in Wi-Fi hotspot feature.  
  If you have an older OS, you could use a 3rd party software like [Connectify](http://www.connectify.me/).

- Connect your Windows Phone to your computer's Wi-Fi hotspot.

- On your Windows Phone, press and hold the name of your computer's Wi-Fi hotspot and click on `Edit`.

- Switch on `Proxy`.

![Windows Phone Proxy](/images/wpproxy.png)

- Enter values of `Server` and `Port` noted in Step 10.

- Press `done`.

Enjoy your college's Wi-Fi on your Windows Phone!
Sadly, some apps may still not work, most notably, WhatsApp.