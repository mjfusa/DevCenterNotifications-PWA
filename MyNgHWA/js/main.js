BgServiceManager.registerTask('js\\toastBgService.js', 'toastsService', new Windows.ApplicationModel.Background.ToastNotificationActionTrigger())

Windows.UI.WebUI.WebUIApplication.addEventListener('activated', (args) => {
    let baseUrl = "";
    const setEnvironment = (type) => {
        if (type == 'local') {
            window.isProd = false
            baseUrl = 'http://localhost:43765'
        } else if (type == 'test') {
            window.isProd = false
            baseUrl = 'http://localhost:43765'
        } else {
            window.isProd = true
            baseUrl = 'http://localhost:43765'
        }

        Windows.Storage.ApplicationData.current.localSettings.values['rootUrl'] = baseUrl
    },
        loadHub = () => {
            webView.src = baseUrl;
        },
        checkConnection = (firstCheck = false) => {
            var profile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
            if (profile && profile.getNetworkConnectivityLevel() == Windows.Networking.Connectivity.NetworkConnectivityLevel.internetAccess) {
                if (!firstCheck)
                    loadingView.innerHTML = "Loading...";
                loadHub();
            }
            else {
                if (firstCheck)
                    loadingView.innerHTML = "There is no Internet connection";
                setTimeout(checkConnection, 1000);
            }
        };

    if (args.kind == Windows.ApplicationModel.Activation.ActivationKind.launch &&
        args.previousExecutionState == Windows.ApplicationModel.Activation.ApplicationExecutionState.running) {
        //already running, thre's no need to login again
        return;
    }

    setEnvironment(window.CONFIG.env)

    if (window.tokens) {
        var credentials = window.tokens.retrieveCredentials();
        if (credentials) {
            var httpMethod = 'GET',
                myUrl = baseUrl + '/api/3/windows/login',
                parameters = {
                    oauth_consumer_key: 'CgFKVihXc1XHQGfFOVw2VZUy3uvpmBrY',
                    oauth_token: credentials.accessToken,
                    oauth_nonce: window.tokens.getNonce(),
                    oauth_timestamp: new Date().getTime(),
                    oauth_signature_method: 'HMAC-SHA1',
                    oauth_version: '1.0'
                },
                consumerSecret = 'BiFIh8SMvpSI7cLYVyia0cV1CxkFos5b',
                tokenSecret = credentials.tokenSecret,
                // generates a RFC 3986 encoded, BASE64 encoded HMAC-SHA1 hash
                // encodedSignature = oauthSignature.generate(httpMethod, url, parameters, consumerSecret, tokenSecret),
                // generates a BASE64 encode HMAC-SHA1 hash
                signature = oauthSignature.generate(httpMethod, myUrl, parameters, consumerSecret, tokenSecret,
                    { encodeSignature: false });

            baseUrl = myUrl + "?oauth_consumer_key=" + parameters.oauth_consumer_key + "&oauth_nonce=" + parameters.oauth_nonce + "&oauth_token=" + parameters.oauth_token + "&oauth_signature_method=" +
                + parameters.oauth_signature_method + "&oauth_timestamp=" + parameters.oauth_timestamp + "&oauth_version=1.0&oauth_signature=" + signature;

            if (args.kind === Windows.ApplicationModel.Activation.ActivationKind.toastNotification) {
                if (args.detail && args.detail.length > 0) {
                    var arguments = JSON.parse(args.detail[0].argument);
                    if (arguments.type && arguments.type == 'videoFinished') {
                        //webView.src = arguments.viewURL;
                        baseUrl += "&redirectURL=/view/" + arguments.objectId;
                    }
                }

            }
        } else {
            baseUrl += "";
        }
    } else {
        baseUrl += "";
    }

    checkConnection(true);
    //we start the bg service when the app starts. If there's no export job registered it will automatically stop'
    startExportService()
});

const systemNavigationManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView()
systemNavigationManager.addEventListener("backrequested", (evt) => {
    evt.handled = true //cancels the default behavior of the system back button
    if (window.Modal.current) {
        window.Modal.hide()
    } else
        if (webView.canGoBack) {
            webView.goBack()
        } else {
            evt.handled = false
        }
})

const DRIVE_IMPORT_CLIENT_ID = '547929436737-6hi6067f1i76mh0ma9jlbr7jl7j7al9r.apps.googleusercontent.com'
const DRIVE_IMPORT_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const REDIRECT_URI_GOOGLE = window.isProd ? 'https://www.wevideo.com/movieeditor/html/gdrive.html' : 'https://awstest.wevideo.com/movieeditor/html/gdrive.html'

const webView = document.getElementById("webview"),
    loadingView = document.getElementById('appLoading'),
    hiddenCls = 'hidden';
var filesMap = {};

webView.addEventListener('MSWebViewDOMContentLoaded', (e) => {
    loadingView.classList.add(hiddenCls);
    webView.classList.remove(hiddenCls);
});

webView.addEventListener('MSWebViewScriptNotify', (e) => {
    const { id, msg } = JSON.parse(e.value)
    switch (id) {
        case 'toastNotification':
            toastNotification(msg)
            break;
        case 'tileNotification':
            const glyphs = Object.keys(NotificationsExtensions.Badges.GlyphValue)
            let glyph = glyphs[Math.floor(Math.random() * 12) + 1]
            updateTileNotification(glyph)
            updateTileBadge(glyph)
            break;
        case 'bgTask':
            break
        case 'connectToService':
            tryAuthBroker(msg.url, (data) => {
                const res = JSON.stringify({
                    id: msg.id,
                    data: data
                })
                webView.invokeScriptAsync('eval', "WinRT.onMessage(" + res + ")").start()
            })
            break
        case 'connectOauth':
            connectOauth(msg)
            break
        case 'downloadMedia':
            downloadMedia(msg)
            break
        case 'checkTokens':
            checkTokens(msg);
            break;
        case 'deleteTokens':
            deleteTokens();
            break;
        case 'fullscreen':
            fullscreen(msg);
            break;
        case 'initUpload':
            initUpload(msg);
            break;
        case 'ticketsFetched':
            ticketsFetched(msg)
            break;
        case 'registerFile':
            registerFile(msg);
            break;
        case 'exportJobStarted':
            updateExportService(msg)
            break;
    }
});

webView.addEventListener("MSWebViewPermissionRequested", (e) => {
    if (e.permissionRequest.type == "media") {
        e.permissionRequest.allow();
    }
});

//maybe use https://github.com/tadeuszwojcik/win-notifyNotificationsExtensions
const updateTileNotification = (txt) => {
    var TileNotification = Windows.UI.Notifications.TileNotification;
    var TileUpdateManager = Windows.UI.Notifications.TileUpdateManager;
    var Tiles = NotificationsExtensions.Tiles;

    var textConfigs = [
        { text: txt, hintWrap: true, hintStyle: NotificationsExtensions.AdaptiveTextStyle.captionSubtle }
    ];

    // Build and append content from textConfigs, line by line.
    var adaptiveContent = new Tiles.TileBindingContentAdaptive();
    textConfigs.forEach(function (lineConfig) {
        var lineOfText = new NotificationsExtensions.AdaptiveText();
        for (var key in lineConfig) {
            lineOfText[key] = lineConfig[key];
        }
        adaptiveContent.children.push(lineOfText);
    });

    // Specify templates and send Notification.
    var tileContent = new Tiles.TileContent();
    tileContent.visual = new Tiles.TileVisual();
    tileContent.visual.branding = Tiles.TileBranding.nameAndLogo;
    tileContent.visual.tileMedium = new Tiles.TileBinding();
    tileContent.visual.tileMedium.content = adaptiveContent;
    tileContent.visual.tileWide = new Tiles.TileBinding();
    tileContent.visual.tileWide.content = adaptiveContent;
    tileContent.visual.tileLarge = new Tiles.TileBinding();
    tileContent.visual.tileLarge.content = adaptiveContent;

    var doc = tileContent.getXml();
    var notification = new TileNotification(doc);
    TileUpdateManager.createTileUpdaterForApplication().update(notification);
}

const updateTileBadge = (id) => {
    var BadgeUpdateManager = Windows.UI.Notifications.BadgeUpdateManager;
    var BadgeNotification = Windows.UI.Notifications.BadgeNotification;
    var Badges = NotificationsExtensions.Badges;
    var GlyphValue = Badges.GlyphValue;

    var glyph = GlyphValue[id];

    var badgeXml = new Badges.BadgeGlyphNotificationContent(glyph).getXml();

    // Create the badge notification
    var badge = new BadgeNotification(badgeXml);

    // Create the badge updater for our application.
    var badgeUpdater = BadgeUpdateManager.createBadgeUpdaterForApplication();

    // And update the badge
    badgeUpdater.update(badge);
}

const toastNotification = (msg) => {
    const { text, thumbUrl, objectId, viewURL } = msg;
    var myArgs = {};
    myArgs.objectId = objectId;
    myArgs.type = "videoFinished";
    myArgs.viewURL = viewURL;
    const toastVisual =
        "<toast launch='" + JSON.stringify(myArgs) + "'><visual><binding template='ToastGeneric'><text>" + text + "</text><image placement='appLogoOverride' src='logo/logo-256.png' /><image src='" + thumbUrl + "' /></binding></visual ></toast> ";
    var xmlDoc = Windows.Data.Xml.Dom;
    var toastXml = new xmlDoc.XmlDocument();
    toastXml.loadXml(toastVisual);

    var notifications = Windows.UI.Notifications;

    var toast = new notifications.ToastNotification(toastXml);
    var toastNotifier = notifications.ToastNotificationManager.createToastNotifier();
    toastNotifier.show(toast);

    /* update tile too */
    updateTileNotification(text);
}

const tryAuthBroker = (url, cb) => {
    //const redirectURI = Windows.Security.Authentication.Web.WebAuthenticationBroker.getCurrentApplicationCallbackUri().absoluteUri
    //const cbUri = new Windows.Foundation.Uri(redirectURI)
    //url += '?redirectURL=' + Windows.Foundation.Uri.escapeComponent(redirectURI)
    //const uri = new Windows.Foundation.Uri(url);
    //Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
    //    Windows.Security.Authentication.Web.WebAuthenticationOptions.none, uri)
    //    .done(function (result) {
    //        cb(result)
    //    }, function (err) {
    //        cb(err)
    //    })

    //return;

    let authVebview = document.createElement("x-ms-webview"),
        onNavigation = (e) => {
            const { uri } = e,
                connected = getQueryParam('connected', uri)

            if (connected) {
                window.Modal.hide()
            }

        }
    authVebview.classList.add('authVebview');
    authVebview.addEventListener('MSWebViewNavigationCompleted', onNavigation);
    authVebview.src = url

    window.Modal.show(authVebview, () => {
        authVebview.removeEventListener('MSWebViewNavigationCompleted', onNavigation)
        cb()
    })
}

const connectOauth = (data) => {
    if (data) {
        const { type } = data
        switch (type) {
            case 'google':
                let authVebview = document.createElement("x-ms-webview"),
                    onNavigation = (e) => {
                        const { uri } = e

                        if (uri.indexOf(REDIRECT_URI_GOOGLE) == 0) {
                            if (uri.indexOf('#access_token=') > -1) {
                                const token = uri.split('#access_token=')[1].split('&')[0]
                                const res = JSON.stringify({
                                    id: 'google',
                                    data: { access_token: token }
                                })
                                webView.invokeScriptAsync('eval', "WinRT.onMessage(" + res + ")").start()
                            }

                            window.Modal.hide()
                        }
                    }
                authVebview.classList.add('authVebview');
                authVebview.addEventListener('MSWebViewNavigationCompleted', onNavigation);
                authVebview.src = GOOGLE_AUTH_ENDPOINT + '?client_id=' + DRIVE_IMPORT_CLIENT_ID + '&response_type=token&scope=' + Windows.Foundation.Uri.escapeComponent(DRIVE_IMPORT_SCOPE) + '&redirect_uri=' + Windows.Foundation.Uri.escapeComponent(REDIRECT_URI_GOOGLE) + '&prompt=select_account'

                window.Modal.show(authVebview, () => {
                    authVebview.removeEventListener('MSWebViewNavigationCompleted', onNavigation)
                })
                break
        }
        switch (type) {
            case 'onedrive':
                let authVebview = document.createElement("x-ms-webview"),
                    url = window.isProd ? 'https://www.wevideo.com/movieeditor/html/onedrive.html' : 'https://awstest.wevideo.com/movieeditor/html/onedrive.html',
                    onMsg = (e) => {
                        const { id, msg } = JSON.parse(e.value)

                        if (id === 'success') {
                            //do magic with the response
                            const res = JSON.stringify({
                                id: 'onedrive',
                                data: Windows.Foundation.Uri.escapeComponent(JSON.stringify(msg))
                            })
                            webView.invokeScriptAsync('eval', "WinRT.onMessage(" + res + ")").start()
                        }

                        window.Modal.hide()
                    },
                    onContentLoaded = (e) => {
                        //once the page is loaded, we remove the listener to avoid other loaded events because of picker redirects
                        authVebview.removeEventListener('MSWebViewDOMContentLoaded', onContentLoaded)

                        let options = JSON.stringify({
                            clientId: window.isProd ? "ff6b0862-ebc2-4693-b2f9-5cbd9c19f6dd" : "a4766c19-c518-4900-8740-a15218604641",
                            action: "download",
                            openInNewWindow: false,
                            advanced: {
                                redirectUri: url,
                            },
                            multiSelect: true
                        })

                        authVebview.invokeScriptAsync('eval', "showPicker(" + options + ")").start()
                    }

                authVebview.classList.add('authVebview')
                authVebview.addEventListener('MSWebViewDOMContentLoaded', onContentLoaded)
                authVebview.addEventListener('MSWebViewScriptNotify', onMsg)
                authVebview.src = url

                window.Modal.show(authVebview, () => {
                    authVebview.removeEventListener('MSWebViewDOMContentLoaded', onContentLoaded)
                    authVebview.removeEventListener('MSWebViewScriptNotify', onMsg)
                })
                break
        }
    }
}

const downloadMedia = (data) => {
    if (data) {
        const { title, url, mimeType } = data

        var fileType = mimeType.split("/")[0];


        var extension = window.getExtension(mimeType);

        // Create the picker object and set options
        var savePicker = new Windows.Storage.Pickers.FolderPicker();
        savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
        // Dropdown of file types the user can save the file as
        savePicker.fileTypeFilter.replaceAll(["*"]);

        // Default file name if the user does not type one in or select a file to replace
        savePicker.suggestedFileName = title;
        var complete = (parent, file) => {
            // add parent and file to FutureAccessList
            var fileToken = Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.add(file);
            var folderToken = Windows.Storage.AccessCache.StorageApplicationPermissions.futureAccessList.add(parent);

            /* send notification that the file downloaded */
            var myArgs = {};
            myArgs.fileToken = fileToken;
            myArgs.folderToken = folderToken;
            myArgs.type = "mediaDownloaded";
            const toastVisual =
                "<toast activationType='Background' launch='" + JSON.stringify(myArgs) + "'><visual><binding template='ToastGeneric'><text>Your file " + file.displayName + " was downloaded! </text><image placement='appLogoOverride' src='logo/logo-256.png' /></binding></visual ></toast> ";
            var xmlDoc = Windows.Data.Xml.Dom;
            var toastXml = new xmlDoc.XmlDocument();
            toastXml.loadXml(toastVisual);

            var notifications = Windows.UI.Notifications;

            var toast = new notifications.ToastNotification(toastXml);
            var toastNotifier = notifications.ToastNotificationManager.createToastNotifier();
            toastNotifier.show(toast);

        }
        savePicker.pickSingleFolderAsync().then(function (folder) {
            if (folder) {

                // Prevent updates to the remote version of the file until we finish making changes and call CompleteUpdatesAsync.
                //Windows.Storage.CachedFileManager.deferUpdates(file);
                folder.createFileAsync(title + "." + extension, Windows.Storage.CreationCollisionOption.replaceExisting).then((file) => {
                    var uri = Windows.Foundation.Uri(url);
                    var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();

                    // Create a new download operation.
                    var download = downloader.createDownload(uri, file);

                    // Start the download and persist the promise to be able to cancel the download.
                    var promise = download.startAsync().then(complete(folder, file), () => { }, () => { });
                });


            } else {
                //user cancel the operation
                return
            }
        });
    }
}

const fullscreen = (enable) => {
    var view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
    if (enable) {
        view.tryEnterFullScreenMode();
        setTimeout(() => {
            if (view.isFullScreen)
                window.onresize = () => {
                    window.onresize = undefined;
                    webView.invokeScriptAsync('eval', "WinRT.exitFullscreen()").start()
                };
        }, 100);
    }
    else if (view.isFullScreen)
        view.exitFullScreenMode();
}

const initUpload = () => {
    var filePicker = new Windows.Storage.Pickers.FileOpenPicker();
    filePicker.fileTypeFilter.replaceAll(['.mov', '.flv', '.bmp', '.gif', '.jpeg', '.jpg', '.tif', '.png', '.tiff', '.3gp', '.3gpp', '.avi', '.divx', '.dv', '.flv', '.mov', '.mpeg', '.wmv', '.mod', '.m2ts', '.mpg', '.mts', '.mp4', '.mkv', '.mjpeg', '.ogv', '.mp3', '.wav', '.m4a', '.ogg', '.aif', '.wma', '.m4v', '.mxf', '.trec', '.webm', '.pdf', '.gifv']);
    filePicker.pickMultipleFilesAsync().then(function (files) {
        var uid = uuid(),
            orgFiles = [],
            pickedFiles = [],
            checkDone = (file) => {
                if (pickedFiles.length === files.length) {
                    const res = JSON.stringify({
                        id: 'initUpload',
                        data: pickedFiles
                    })

                    webView.invokeScriptAsync('eval', "WinRT.onMessage(" + res + ")").start();
                }
            };

        if (files.length === 0) {
            checkDone()
            return
        }

        files.forEach((file) => {
            orgFiles.push(file)

            file.getBasicPropertiesAsync().then((prop) => {
                pickedFiles.push({
                    name: file.name,
                    size: prop.size,
                    lastModified: prop.dateModified,
                    type: file.contentType,
                    path: file.path,
                    source: 'WinRT',
                    transactionId: uid
                });
                checkDone()
            });
        });

        filesMap[uid] = orgFiles;
    }).done(null, function (e) {
        log(e.toString())
    });
}

const ticketsFetched = (msg) => {
    const { uploads, userId } = msg;
    const buildIdentifier = function (file) {
        return JSON.stringify({
            name: file.name,
            size: file.size,
            lastModified: file['lastModified']
        })
    },
        buildGroupName = function (uploadModel) {
            return JSON.stringify({
                userId: userId,
                folderId: uploadModel.folderId,
                ticketId: uploadModel.ticketId
            })
        }

    for (let i = 0; i < uploads.length; i++) {
        const { transactionId, path } = uploads[i].file
        let files = filesMap[transactionId]

        if (files) {
            for (let j = 0; j < files.length; j++) {
                if (files[j].path === path) {
                    let uri = new Windows.Foundation.Uri(uploads[i].ticket.url)
                    uploadFile(files[j], uploads[i].ticket.url, buildIdentifier(uploads[i].file), buildGroupName(uploads[i]))
                    //files.splice(j, 1)
                    break;
                }
            }
        }

        //if (files.length === 0) {
        //    delete filesMap[transactionId]
        //}
    }

    const res = JSON.stringify({
        id: 'ticketsFetched',
        data: {}
    })

    webView.invokeScriptAsync('eval', "WinRT.onMessage(" + res + ")").start()
}

const uploadFile = (file, url, identifier, groupName) => {
    const uploader = new Windows.Networking.BackgroundTransfer.BackgroundUploader(),
        uri = new Windows.Foundation.Uri(url)

    //uploader.setRequestHeader("Filename", file.name);
    uploader.setRequestHeader("Content-Type", "application/octet-stream");
    uploader.setRequestHeader("x-amz-meta-fileidentifier", encodeURIComponent(identifier));
    uploader.setRequestHeader("x-amz-meta-title", Windows.Foundation.Uri.escapeComponent(file.name));
    uploader.setRequestHeader('x-amz-acl', 'public-read');
    uploader.method = "PUT";


    const successMessage = "Upload completed - " + file.name,
        errorMessage = "Upload failed - " + file.name,
        successToastXml = Windows.UI.Notifications.ToastNotificationManager.getTemplateContent(
            Windows.UI.Notifications.ToastTemplateType.toastText01),
        errorToastXml = Windows.UI.Notifications.ToastNotificationManager.getTemplateContent(
            Windows.UI.Notifications.ToastTemplateType.toastText01)

    successToastXml.getElementsByTagName("text").item(0).innerText = successMessage
    errorToastXml.getElementsByTagName("text").item(0).innerText = errorMessage

    const successToast = new Windows.UI.Notifications.ToastNotification(successToastXml),
        errorToast = new Windows.UI.Notifications.ToastNotification(errorToastXml)

    //showing toasts only in test and local
    if (!window.isProd) {
        //uploader.successToastNotification = successToast
        uploader.failureToastNotification = errorToast
        const toastVisual =
            "<toast launch='" + file.name + "' activationType='Background'><visual><binding template='ToastGeneric'><text>" + successMessage + "</text><image placement='appLogoOverride' src='logo/logo-256.png' /></binding></visual ></toast> ";
        var xmlDoc = Windows.Data.Xml.Dom;
        var toastXml = new xmlDoc.XmlDocument();
        toastXml.loadXml(toastVisual);

        uploader.successToastNotification = new Windows.UI.Notifications.ToastNotification(toastXml)
    }

    uploader.group = groupName;
    uploader.createUpload(uri, file).startAsync();
}

const registerFile = (msg) => {
    const { uid } = msg;
    filesMap[uid].push(filesMap[uid][filesMap[uid].length - 1]);
}

const getQueryParam = (name, url) => {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results == null ? null : results[1];
}

const uuid = () => {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

const clearTileNotifications = () => {
    Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().clear();
}
clearTileNotifications();

const updateExportService = ({ jobId }) => {
    const localSettings = Windows.Storage.ApplicationData.current.localSettings
    let exportTokens = localSettings.values['exportTokens']

    if (!exportTokens) {
        exportTokens = '[]'
    }

    exportTokens = JSON.parse(exportTokens)
    if (exportTokens.indexOf(jobId) == -1) {
        exportTokens.push(jobId)
    }

    localSettings.values['exportTokens'] = JSON.stringify(exportTokens)

    startExportService()

    if (window.checkRating) {
        //check if we can show th erating
        window.checkRating()
    }
}

const startExportService = () => {
    const taskPath = 'js\\background\\exportBgService.js',
        taskName = 'exportService'
    let task = BgServiceManager.getTask(taskName)

    if (!task) {
        task = BgServiceManager.registerTask(taskPath, taskName, new Windows.ApplicationModel.Background.ApplicationTrigger())
    }

    task.trigger.requestAsync()
}
