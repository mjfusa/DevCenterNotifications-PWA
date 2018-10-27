// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//
// Copyright (c) Microsoft Corporation. All rights reserved

//
// A JavaScript background task runs a specified JavaScript file.
//
(function () {
    "use strict";

        function showToast(message, iconUrl) {
        if (typeof Windows !== 'undefined' &&
            typeof Windows.UI !== 'undefined' &&
            typeof Windows.UI.Notifications !== 'undefined') {
            var notifications = Windows.UI.Notifications;
            var template = notifications.ToastTemplateType.toastImageAndText01;
            var toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
            var toastTextElements = toastXml.getElementsByTagName("text");
            toastTextElements[0].appendChild(toastXml.createTextNode(message));
            var toastImageElements = toastXml.getElementsByTagName("image");
            var newAttr = toastXml.createAttribute("src");
            newAttr.value = iconUrl;
            var altAttr = toastXml.createAttribute("alt");
            altAttr.value = "toast graphic";
            var attribs = toastImageElements[0].attributes;
            attribs.setNamedItem(newAttr);
            attribs.setNamedItem(altAttr);
            var toast = new notifications.ToastNotification(toastXml);
            var toastNotifier = notifications.ToastNotificationManager.createToastNotifier();
            toastNotifier.show(toast);
        }
    }

    function getProgress() {
        // Parse progress file saved by app.
        // return progress for display in toast
        return "You've completed 14 of the 20 Steps. Only 6 to go!"
    }
    //
    // The background task instance's activation parameters are available via Windows.UI.WebUI.WebUIBackgroundTaskInstance.current
    //
    var cancel = false,
        progress = 0,
        backgroundTaskInstance = Windows.UI.WebUI.WebUIBackgroundTaskInstance.current,
        cancelReason = "";

    //
    // Query BackgroundWorkCost
    // Guidance: If BackgroundWorkCost is high, then perform only the minimum amount
    // of work in the background task and return immediately.
    //
    var cost = Windows.ApplicationModel.Background.BackgroundWorkCost.currentBackgroundWorkCost;
    console.log("Background " + backgroundTaskInstance.task.name + " Starting...", cost.toString());
    var result = getProgress();

    showToast(getProgress());
    //showToast("hello there from the background");
    //
    // Associate a cancellation handler with the background task.
    //
    function onCanceled(cancelEventArg) {
        cancel = true;
        cancelReason = cancelEventArg;
        console.log('canceled')
    }
    backgroundTaskInstance.addEventListener("canceled", onCanceled);

    const runService = () => {
        close();
    }

    runService()


})();