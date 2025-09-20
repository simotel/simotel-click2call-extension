let simotel = new Simotel();

const startSendingCall = new CustomEvent("onStartCall");
const callSent = new CustomEvent("callSent");

window.onCallSending = false;


chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (changes.hasOwnProperty("numbersHistory")) {
        updateHistoryNumbers();
    }
});

function updateHistoryNumbers() {
    chrome.storage.sync.get(['numbersHistory'], function (result) {
        $(".history ul").html("");
        for (let i in result.numbersHistory) {
            $(".history ul")
                .prepend(
                    `<li><a data-number='${result.numbersHistory[i]}' href="#"><img src="/images/phone64.png"><span>${result.numbersHistory[i]}</span></a></li>`
                )
        }
    });
}

async function trunkCall(caller, callee) {

    if (! await simotel.validator.isAllRequiredOptionsEntered(true)) {
        simotel.notifs.error("App setting problem, visit app options.")
        return false;
    }

    caller = simotel.validator.filterDestNumber(caller);
    if (!simotel.validator.validateNumber(caller)) {
        simotel.notifs.error(`Wrong Primary Number!!\r\n${caller}`)
        return false;
    }

    callee = simotel.validator.filterDestNumber(callee);
    if (!simotel.validator.validateNumber(callee)) {
        simotel.notifs.error(`Wrong Secondary Number!!\r\n${callee}`)
        return false;
    }

    simotel.notifs.success(`Sending call to Simotel ...`)

    window.onCallSending = true;

    try {
        const response = await simotel.trunkCall(caller, callee);
        if (response.success) {
            simotel.notifs.success(`Call successfully sent.`)
        }
        else {
            simotel.notifs.error(response.message);
        }
    }
    catch (error) {
        simotel.notifs.error(error.message);
    }

    window.onCallSending = false;
}

async function call(dest) {

    if (! await simotel.validator.isAllRequiredOptionsEntered()) {
        simotel.notifs.error("App setting problem, visit app options.")
        return false;
    }

    dest = simotel.validator.filterDestNumber(dest);
    if (!simotel.validator.validateNumber(dest)) {
        simotel.notifs.error(`Wrong Number!!\r\nDialed to ${dest}`)
        return false;
    }

    simotel.simotelStorage.addNumberToHistoryStorage(dest);
    simotel.notifs.success(`Sending call to Simotel ...`)

    window.onCallSending = true;
    
    try {

        const response = await simotel.speedCall(dest);

        if (response.success) {
            simotel.notifs.success(`Call successfully sent.\r\nDial to: ${dest} `)
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

async function switchTab(tab) {

    if (tab == "#dial-tab" && !await simotel.validator.isAllRequiredOptionsEntered()) {
        alert("You must enter all required options");
        tab = "#options-tab";
    }
    if (tab == "#trunkDial-tab" && !await simotel.validator.isAllRequiredOptionsEntered(true)) {
        alert("You must enter all required options for trunk call");
        tab = "#options-tab";
    }

    $(".tabs .tab").hide();
    $(".tabs").find(tab).first().show();

    $(".tabs-navigation a").removeClass("active");
    $(`.tabs-navigation a[data-dist='${tab}']`).addClass("active");
}




/**
 *  fill the options form inputs from simotel storage
 */
async function fillOptionsTabInputs() {
    simotel.simotelStorage.getOptions().then(function (simotelOptions) {

        // fill normal inputs
        $("input[type=text], input[type=number], input[type=password], select, textarea").each(function (index, item) {
            const key = $(item).attr('name') || $(item).attr('id');
            const val = simotelOptions[key];
            if (val != undefined) $(item).val(val);
        });

        // fill checkboxes
        $("input[type=checkbox]").each(function (index, item) {
            const key = $(item).attr('name') || $(item).attr('id');
            const val = simotelOptions[key];
            if (val) $(item).prop("checked", true);
        });

        // fill radios
        $("input[type=radio]").each(function (index, item) {
            const key = $(item).attr('name');
            const val = simotelOptions[key];
            if (val && $(item).val() === String(val)) {
                $(item).prop("checked", true);
            }
        });

        // apply mode visibility
        try {
            var mode = $('input[name=connection_mode]:checked').val() || 'local';
            var localIds = ['caller','server','user','pass','context','trunkName'];
            var cloudIds = ['cloud_caller','cloud_server','cloud_api_token','cloud_context','cloud_trunkName'];
            localIds.forEach(function(id){
                var row = $('#'+id).closest('.row');
                if(!row.length) row = $('#'+id).closest('.column').closest('.row');
                if(mode === 'cloud') { row.hide(); $('#'+id).prop('disabled', true); }
                else { row.show(); $('#'+id).prop('disabled', false); }
            });
            $('.cloud-only')[mode === 'cloud' ? 'show' : 'hide']();
            cloudIds.forEach(function(id){ $('#'+id).prop('disabled', mode !== 'cloud'); });
        } catch(e) { console.warn(e); }

    });
}


$(document).ready(function () {

    //ui inputs init state - fill the inputs and calls history
    updateHistoryNumbers();
    fillOptionsTabInputs();

    // switch to options tab if nessecery inputs not fill or switch to dial-tab
    simotel.validator.isAllRequiredOptionsEntered().then(res => {
        let defaultTab = res ? "#dial-tab" : "#options-tab"
        switchTab(defaultTab);
    });



    // ui interactions 
    $("#options_form").submit(function (e) {
        e.preventDefault();
        options = {};

        let formData = new FormData(e.target)
        formData.forEach((value, key) => {
            options[key] = value
        });

        options.discoverTelLink =
            options.hasOwnProperty("discoverTelLink")
                ? true
                : false;

        simotel.simotelStorage.setOptions(options)
            .then(() => {
                switchTab("#dial-tab");
            })

    });


    $("#dial_form").submit(async function (e) {

        if (window.onCallSending) {
            alert("Plz wait");
            return;
        }

        $(this).addClass("loading");

        e.preventDefault();

        let dest = $("#destination").val();
        await call(dest);

        $(this).removeClass("loading");
    });

    $("#trunkDial_form").submit(async function (e) {

        if (window.onCallSending) {
            alert("Plz wait");
            return;
        }

        $(this).addClass("loading");

        e.preventDefault();
        let caller = $("#trunkCaller").val();
        let callee = $("#trunkCallee").val();
        await trunkCall(caller, callee);
        
        $(this).removeClass("loading");
    });

    $(".history ul ").on("click", "a", async function () {

        if (window.onCallSending) {
            alert("Plz wait");
            return;
        }

        let dest = $(this).data("number");
        
        $("form").addClass("loading");
        await call(dest);
        $("form").removeClass("loading");
    });

    $(".tabs-navigation a").click(function () {
        let dist = $(this).data("dist");
        switchTab(dist)
    })

})
$(document).on('change','input[name=connection_mode]', function(){
  var mode = $('input[name=connection_mode]:checked').val() || 'local';
  var localIds = ['caller','server','user','pass','context','trunkName'];
  var cloudIds = ['cloud_caller','cloud_server','cloud_api_token','cloud_context','cloud_trunkName'];
  localIds.forEach(function(id){
    var row = $('#'+id).closest('.row');
    if(!row.length) row = $('#'+id).closest('.column').closest('.row');
    if(mode === 'cloud') { row.hide(); $('#'+id).prop('disabled', true); }
    else { row.show(); $('#'+id).prop('disabled', false); }
  });
  $('.cloud-only')[mode === 'cloud' ? 'show' : 'hide']();
  cloudIds.forEach(function(id){ $('#'+id).prop('disabled', mode !== 'cloud'); });
});
$(document).ready(function(){ $('input[name=connection_mode]').trigger('change'); });
