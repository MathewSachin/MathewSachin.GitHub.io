<hr>

<h1>Frequently Asked Questions for Captura (Temporary)</h1>
<hr>

<br>
<h2>Will Captura support Linux or Mac?</h2>
Captura is written using .NET Framework, which at present, is supported only on Windows.

Software written using .NET Framework can work on Linux and Mac using Mono but the native calls and UI pose a problem to that.

Also, the recently released .Net Core only has support for console applications.

<br><br>
<h2>Does Captura support DirectX Game Video Recording?</h2>
Some games can be recorded when running on Windows 8 and above. In Captura v8.0.0 there was a separate `Desktop Duplication` option which can also record games which support that. From v9.0.0, `Desktop Duplication` is the default mode.

<br><br>
<h2>Why is maximum frame rate 30fps?</h2>
Captura is not very fast on low-end systems. This limit on framerate is a protection against Captura consuming all of your CPU/Memory/Disk and causing your system to hang.

Starting from v8.0.0, you can remove this limitation by going to Config / Extras / Remove FPS Limit.

For reference, Captura can capture 1920x1080 screen at 40fps on my system without audio using FFmpeg x264 codec. My system specifications: 8GB RAM DDR4, Intel i5 6th Gen CPU 2.3 GHz, Windows 10.

<br><br>
<h2>Why is the length of captured video shorter than recording duration?</h2>
This happens when Captura drops frames when your system can't keep with the specified frame rate. Try using a lower value of framerate, faster codec or smaller region.

<br><br>
<h2>Why does Captura run out of resources (high memory/CPU/disk usage) during recording?</h2>
Atleast 2 GHz CPU and 4 GB RAM are recommended.

This may happen if frames are not being captured as fast as the framerate set. Try a lower value of framerate, faster codec or smaller region. Also, try terminating unnecessary applications running in background using Task Manager. We admit that the technology employed in Captura is not fast.

<br><br>
<h2>Why does my Antivirus say that Captura is virus infected?</h2>
Captura is virus-free. It does not include any spam, adware or spyware.

It is probably due to the keystrokes capture feature being mistaken for a keylogger.

<br><hr><br>

<h1>Changelog v8.0.0 (Temporary)</h1>

<br><br>
<h3>Audio / Video Sources</h3>
- Stop Window capture when Window is closed.<br>
- **Fix:** Mouse cursor position is wrong after moving region selector.<br>
- **Fix:** Unable to resize Region Selector after stopping recording.<br>
- Desktop Duplication is supported with Variable Frame Rate Gif.<br>
- **Fix:** Desktop Duplication recording does not crash when Screen enters non-recordable mode. e.g. Sign-in screen.<br>
- Added an option to playback recorded audio in real-time in Config | Extras.<br>
- Record and ScreenShot buttons on Region Selector.<br>
- Added Window picker and Screen picker which prompt for selector on starting recording or taking screenshot.<br>
- More than 2 audio sources can be simultaneously recorded.<br>
- Audio sources can be changed during recording. A checkbox next to the Audio heading determines whether audio will be recorded.<br>
- Shows Error Message when bass.dll or bassmix.dll is not present.<br>
- Hide when Recording option is configured on Region Selector itself.<br>
- Refresh retains selected Audio/Video sources/codecs and Webcam.<br>
- Basic drawing support in Region Selector.<br>

<br><br>
<h3>Preview</h3>
- Added option to Preview while recording.<br>
- Supports full screen view.

<br><br>
<h3>Overlays</h3>
- Overlays are now configured on a separate window.<br>
- Overlays can be positioned by dragging boxes over a Background on the window.<br>
- Separate colors for Right and Middle mouse click overlays.<br>
- Support for custom image overlays.<br>
- Overlay customization from UI is used in Console.<br>
- Option to display Mouse Pointer Overlay to make easier to track Mouse Pointer.<br>
- Added minimal mouse click animation.<br>
- Elapsed is separated from TextOverlays and can be toggled from Main View.<br>

<br><br>
<h3>FFmpeg</h3>
- Option to resize FFmpeg output video size.<br>
- FFmpeg Log maintains multiple logs.<br>
- FFmpeg Log copies complete output to clipboard.<br>
- Multiple Custom FFmpeg Codecs.<br>
- Increased FFmpeg thread_queue_size<br>
- Ensure previous frame is written when writing asynchronously.<br>

<br><br>
<h3>Hotkey Window</h3>
Separate window to manage hotkeys with option to add, delete or edit action and keys.

<br><br>
<h3>Image Editor</h3>
- Added a minimal image editor.
- Added a new ScreenShot target: Editor.

<br><br>
<h3>Image Cropper</h3>
Added option to crop images.

<br><br>
<h3>Audio / Video Trimmer</h3>
Added option to trim Audio and Video.

<br><br>
<h3>Translation</h3>
Added new translations:

- Japanese
- Chinese (Simplified)
- Chinese (Traditional)

<br><br>
<h3>Other</h3>
- **Fix:**captura shot failing for fullscreen screenshots.<br>
- **Fix:** Main window webcam preview position on high DPI.<br>
- Duration is considered after Start Delay has elapsed.<br>
- Duration and Start Delay are stored in Settings.<br>
- Added option to use System Proxy.<br>
- **Fix:** Mouse Cursor moves slowly when recording from Command-line<br>
- Webcam capture support from Command-line.<br>
- Option to Minimize to System Tray on Startup.<br>
- Option to Minimize to System Tray when Closed.<br>
- Add a Translator window to aid in translation. Can be opened from About tab.<br>
- More icons in the UI.<br>
- Multiple selectable Screenshot Save Locations.<br>
- Display Licenses in a Window.<br>
- Notification Stack<br>
- Added an Exception Dialog.<br>
- Stop Recorder when Frames are not being writen. This happens when either the FrameRate is too high or a codec is slow. No of frames to be written are checked with a maximum value to <br>determine whether to stop recording. This helps prevent crash from 100% RAM usage and causing the system to hang.<br>
- Ability to delete uploaded images from Imgur