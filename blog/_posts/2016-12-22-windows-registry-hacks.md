---
title: Windows 10 Registry Hacks
tags: [windows, hack, registry]
---

**Warning**: The following hacks use Registry Editor which is a very powerful Windows tool.
Be careful when using it as misuse can render your system inoperable.

**Starting Registry Editor**: Type `regedit` in Start Menu and press Enter. Press `Yes` when asked for Administrator priveleges.

## LastActiveClick
Lets suppose you have a dozen documents open in Word at any point in time.
You click on another app, then have to get back to the document you were on and click on the Word icon in taskbar, it pops up all the open windows so you have to figure out which one you were on.
With this hack, clicking on the taskbar button takes you back to exactly the tab you were on.
This works with other apps too!

- Navigate to `HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced`.
- Create a new `32bit Dword` called `LastActiveClick`.
- Set it to `1`.

## Open with Notepad Context Menu
- Navigate to `HKEY_CLASSES_ROOT\*\shell`.
- Create a new key inside the `shell` key named `Open with Notepad`.
- Create another key within the `Open with Notepad` key named `command`.
- Set its `(Default)` value to `notepad.exe %1`.

To add Notepad icon on the menu:

- Navigate to `Open with Notepad` key.
- Create a new `Expandable String` called `Icon`.
- Set it to `notepad.exe`.

Making the Command hidden unless Shift is pressed:

- Navigate to `Open with Notepad` key.
- Create a new `Expandable String` called `Extended`.

The changes should take place immediately. To test it out, just right-click any file and see if you see the `Open with Notepad` command.

## Adding an App to Desktop Context Menu
Lets add Notepad to the Desktop context menu.

- Navigate to `HKEY_CLASSES_ROOT\Directory\Background\shell`.
- Create a new key inside the `shell` key named `Notepad`.
- Create another key within the `Notepad` key named `command`.
- Set its `(Default)` value to `notepad.exe`.

## Adding an App to Directory Context Menu
Repeat the steps as for **Adding an App to Desktop Context Menu** but with `HKEY_CLASSES_ROOT\Directory\shell` key.

## Adding Defragment to Drive Context Menu
- Navigate to `HKEY_CLASSES_ROOT\Drive\shell`.
- Create a new key inside the `shell` key named `Defragment`.
- Create another key within the `Defragment` key named `command`.
- Set its `(Default)` value to `defrag %1 -v`.

## Making **Open Command Window Here** always visible
Delete `Extended` value from `HKEY_CLASSES_ROOT\Drive\shell\cmd` for drives, `HKEY_CLASSES_ROOT\Directory\shell\cmd` for folders and `HKEY_CLASSES_ROOT\Directory\Background\shell` for Desktop.

To Revert: Add an `Expandable String` value to respective keys named `Extended`.

**Note**: With Windows 10, you may need to change the security of the keys to be able to delete the value:

- Right-click the `cmd` key in the tree.
- Select `Permissions`.
- Click the `Advanced` button.
- Change the owner to the current user and check `Full Control`.

## Stopping Windows from Adding **-Shortcut** to Shortcut File Names
- Navigate to `HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer`.
- Locate the value named `link`. If not found, create new `Binary` value named `link`.
- Set it to `00 00 00 00` (All Zeroes).

You’ll need to restart your computer (or sign out and back in) to complete the change.

Delete the `link` value to revert to default.

## Add Recycle Bin to My computer
- Navigate to `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace`.
- Create a new key inside the `NameSpace` key named `{645FF040-5081-101B-9F08-00AA002F954E}`.

## Add Control Panel to My computer
- Navigate to `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace`.
- **Category View**: Create a new key inside the `NameSpace` key named `{26EE0668-A00A-44D7-9371-BEB064C98683}`.
- **Icon View**: Create a new key inside the `NameSpace` key named `{21EC2020-3AEA-1069-A2DD-08002B30309D}`.

## Change Disk Cleanup to Delete Files Newer than 7 
- Navigate to `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches\Temporary Files`.
- The `LastAccess` value specifies the number of days (default: 7).

## Add **Run As Administrator** to any File Type
- Navigate to `HKEY_CLASSES_ROOT\.zip` substituting `zip` with the extension you are looking for.
- Note the value of `(Default)` item. Suppose it is `WinRAR.ZIP`.
- Then navigate to `HKEY_CLASSES_ROOT\WinRAR.ZIP\shell\open\command`.
- Copy the `command` key and its `(Default)` value to `HKEY_CLASSES_ROOT\WinRAR.ZIP\shell\runas\command`.

## Remove Programs from Open With Context Menu
- Navigate to `HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FileExts\`.
- Navigate to the subkey for the file type.
- Delete values for programs to be removed.

## Context Menu to Copy Text File to Clipboard
- Navigate to `HKEY_CLASSES_ROOT\txtfile\shell`.
- Create a new key inside the `shell` key named `copytoclip`.
- Set `(Default)` value of `copytoclip` to `Copy Contents to Clipboard`.
- Create another key within the `copytoclip` key named `command`.
- Set its `(Default)` value to `cmd /c clip < "%1"`.

## Disable Task Manager
- Navigate to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies\System`.
- Set `DisableTaskMgr` to 1.

## Enable Verbose Service Startup/Shutdown Messages
- Navigate to `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System`.
- Create a new `32bit Dword` called `VerboseStatus`.
- Set it to `1`.