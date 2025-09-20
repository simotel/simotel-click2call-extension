let simotel = new Simotel();
let autoDiscoverTelLink = true;

$(document).ready(function () {


    chrome.storage.sync.get(['discoverTelLink'], function (result) {
        autoDiscoverTelLink = result.discoverTelLink === true;
    });

    $('a[href^="tel:"]').click(function (e) {
        if (!autoDiscoverTelLink) return;
        e.preventDefault();
        let number = $(this).attr("href");
        number = number.split("tel:").join("");
        chrome.runtime.sendMessage(
            {contentScriptQuery: "sendCall", dest: number});

    })
})

