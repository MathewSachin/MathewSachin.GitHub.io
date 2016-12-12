# Using Windows Phone on Authenticated Proxy Wifi
No matter how much you like your Windows Phone, you hate it when you reach college where you are provided with authenticated proxy Wi-Fi.
All your friends having Android phones enjoy the Wi-Fi while you are left behind.

Here's a way to use the Internet on your Windows Phone:
1. Connect to the college Wi-Fi on your Windows computer.

2. Download, Install and Start [CCProxy](http://www.youngzsoft.net/ccproxy/) on your Windows computer.  
   *CCProxy is easy-to-use and powerful proxy server*.

![CCProxy](../../images/ccproxy.png)

3. Open `Options > Advanced > Cascading`.

![CCProxy Cascading](../../images/ccproxy-cascade.png)

4. Check `Enable Cascading Proxy`.

5. Fill `Proxy Address` and `Port`.

6. Select `HTTP` as `Proxy Protocol`.

7. Check `Need Authentication`.

8. Fill `User Name` and `Password`.

9. Press `OK`.

10. Now in `Options`, note the values of `Local IP Address` and `HTTP Port`.

![CCProxy Options](../../images/ccproxy-options.png)

11. Make a Wi-Fi hotspot on your Windows computer.
    Windows 10 Anniversary Update and later include a built-in Wi-Fi hotspot feature.
    If you have an older OS, you could use a 3rd party software like [Connectify](http://www.connectify.me/).

12. Connect your Windows Phone to your computer's Wi-Fi hotspot.

13. On your Windows Phone, press and hold the name of your computer's Wi-Fi hotspot and click on `Edit`.

14. Switch on `Proxy`.

![Windows Phone Proxy](../../images/wpproxy.png)

15. Enter values of `Server` and `Port` noted in Step 10.

16. Press `done`.

Enjoy your college's Wi-Fi on your Windows Phone!
Sadly, some apps may still not work, most notably, WhatsApp.