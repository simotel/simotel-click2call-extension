let simotel = new Simotel();

// simotel.simotelStorage.setOptions({discoverTelLink: true})

chrome.storage.onChanged.addListener(function (changes, namespace) {
    let options = {};
    for (var key in changes) {
        var storageChange = changes[key];
        options[key] = storageChange.newValue;
    }
    simotel.simotelStorage.setOptions(options);
});

// Add a listener to create the initial context menu items,
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "NasimTel",
        title: "Dial with Simotel",
        type: 'normal',
        contexts: ['selection'],
    });
});


chrome.contextMenus.onClicked.addListener(function (item, tab) {
    call(item.selectionText);
});


// messages listener
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.contentScriptQuery === "sendCall") {
            call(request.dest);
        }
    });


async function call(dest) {

    if (! await simotel.validator.isAllRequiredOptionsEntered()) {
        simotel.notifs.error("App setting problem, visit app options.")
        return false;
    }

    dest = simotel.validator.filterDestNumber(dest);
    if (!simotel.validator.validateNumber(dest)) {
        simotel.notifs.error(`Wrong Number!! \r\n Dialed to ${dest}`)
        return false;
    }

    simotel.simotelStorage.addNumberToHistoryStorage(dest);
    simotel.notifs.success(`Start sending call to simotel ...`)

    window.onCallSending = true;

    try {

        const response = await simotel.speedCall(dest);

        if (response.success) {
            simotel.notifs.success(`Call successfully sent. \r\n Dial to: ${dest} `)
        }
        else {
            simotel.notifs.error(response.message);
        }
    }
    catch (error) {
        simotel.notifs.error(error);
    }

    window.onCallSending = false;
}