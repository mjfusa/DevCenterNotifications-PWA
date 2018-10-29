﻿# Add Push Notifications to your app the easy way with Dev Center + Microsoft Store Services SDK

![Dev Center Engagement with Push Notifications](images/devcenternotificationspage.png)

With the combination of the [Dev Center Engagement Feature](https://docs.microsoft.com/en-us/windows/uwp/publish/send-push-notifications-to-your-apps-customers) and the [Microsoft Store Services SDK](https://docs.microsoft.com/en-us/windows/uwp/mosnetize/microsoft-store-services-sdk) you can easily add Push Notifications to your [Windows Progressive Web App](https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps) (PWA), [UWP](https://docs.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide), or [Desktop Bridge - Win32 app](https://aka.ms/desktopbridge).


## Powerful Push  <img src="images/power-button40.png" height="40px" width="40px" align="left"/> 
</div>
Push notifications in Windows are very powerful and flexible allowing you to target specific infomation to specific users. This, however, requires you integrate with the Windows Notifications Service (WNS), set up a server app to send notifications and code in your client application that registers with WNS. While this gives the developer flexibility and one to one targeting, it may be more than what you need. For an excellent walkthough of setting up WNS Push Notifications, see this post, [Push notifications in a PWA running on Windows 10](https://blogs.msdn.microsoft.com/appconsult/2018/06/07/push-notifications-in-a-pwa-running-on-windows-10/) written by [Matteo Pagani](https://twitter.com/QmatteoQ).

## Easy Push <img src="images/easybutton100.png" height="40px" width="40px" align="left"/> 

In contrast to 'Powerful Push', 'Easy Push' sends updated to all users of your app. That is you don't send specific data to specific users. This is very useful for:

* Cross promoting your apps. For example, if you have launched a new app, ask your user of your other apps to check it out.
* Letting your users know when your apps or IAP go on [sale](https://docs.microsoft.com/en-us/windows/uwp/publish/set-and-schedule-app-pricing).
* Requesting feedback
* Sending ad hoc annoucements and information to your users.

The Dev Center engagement notifications 



requires adding the following  [Microsoft Store Services SDK](https://docs.microsoft.com/en-us/windows/uwp/mosnetize/microsoft-store-services-sdk) code your app startup:

```cs
StoreServicesEngagementManager engagementManager = StoreServicesEngagementManager.GetDefault();
var res = await engagementManager.RegisterNotificationChannelAsync();
```
This sets up the connection between your Dev Center Account and your app. You can then broadcast toast and tile updates to you users.








Dev Center Engagement





## 


I was able to successfully see the app name in the app in the app list in Dev Center notifications. See screenshot below.
 
The docs provide instructions for adding the Microsoft Store Services SDK and the corresponding registration code you your application. Since this is a PWA, this has do be done indirectly via a Windows Runtime Component (basically a dll) that is referenced and called by JavaScript in the app. You'll need to download and install the Microsoft Store Services SDK.

I've provided a sample project (attached) that can be added to your Visual Studio project for the iAspire PWA project. After including this project:
1)	In References for the iAspire PWA, add a reference to the PushWinRTComponent project.
 
2)	In your JavaScript in somewhere early in the app, that gets called automatically, add this:
// Set up Push notifications
if (typeof Windows !== 'undefined' &&
  typeof Windows.UI !== 'undefined' &&
  typeof Windows.UI.Notifications !== 'undefined') {
  PushWinRTComponent.PushNotifications.init().then(
    function (result) {
      console.log("push init result: " + result);
    });
}
3)	Create the Store app packages and submit to the Store. You may want to publish as hidden to test the notifications.
4)	After the app passes certification, you will see in available in the Notifications UI of Dev Center and you can configure your notifications.

https://blogs.msdn.microsoft.com/appconsult/2018/06/07/push-notifications-in-a-pwa-running-on-windows-10/


