
// UTF-8 safe Basic Auth header
function basicAuth(user, pass){
  try {
    const bytes = new TextEncoder().encode(`${user}:${pass}`);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'Basic ' + btoa(binary);
  } catch(e){
    try { return 'Basic ' + btoa(unescape(encodeURIComponent(`${user}:${pass}`))); }
    catch(e2){ return 'Basic ' + btoa(`${user}:${pass}`); }
  }
}

class Simotel {

    notifs;
    validator;
    simotelStorage;

    constructor() {
        this.notifs = new Notifs;
        this.validator = new validations;
        this.simotelStorage = new SimotelStorage;
    }

    async trunkCall(caller, callee) {

        let {
            context, trunkName
        } = await this.simotelStorage.getOptions();

        
        const mode = await this.simotelStorage.getOption('connection_mode', 'local');
        if (mode === 'cloud') {
            const _opts = await this.simotelStorage.getOptions();
            context = _opts.cloud_context || context;
            trunkName = _opts.cloud_trunkName || trunkName;
        }
const payloadData = {
            caller,
            callee,
            context,
            caller_id: callee,
            timeout: "60",
            trunk_name: trunkName
        }

        return this.connectToSimotel(payloadData)
    }

    async speedCall(dest) {

        let { caller, context, trunkName, cloud_caller, cloud_context, cloud_trunkName } = await this.simotelStorage.getOptions();
        const mode = await this.simotelStorage.getOption('connection_mode', 'local');
        if (mode === 'cloud') { caller = cloud_caller || caller; context = cloud_context || context; trunkName = cloud_trunkName || trunkName; }

        const payloadData = {
            caller,
            callee: dest,
            context,
            caller_id: caller,
            timeout: "60",
            trunk_name: ""
        }

        return this.connectToSimotel(payloadData)
    }

    async connectToSimotel(data = {}) {

        let res; const url = await this.apiUrl();
        const mode = await this.simotelStorage.getOption('connection_mode', 'local');
        let headers;
        if (mode === 'cloud') {
            let token = await this.simotelStorage.getOption('cloud_api_token');
            token = (token || '').toString().trim();
            headers = { "X-APIKEY": token, "Content-Type": "application/json" };
        } else {
            const user = await this.simotelStorage.getOption('user');
            const pass = await this.simotelStorage.getOption('pass');
            headers = { 'Authorization': basicAuth(user, pass), "Content-Type": "application/json" };
        }const requestOptions = {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        }



        try {
            res = await fetch(
                url,
                requestOptions
            )
        }
        catch (error) {
            throw error.message;
            
        }

        if (res.ok) {
            return await res.json();
        }

        throw ("Error: " + res.status + " - " + (await res.json()).message)

    }

    async apiUrl() {
        const mode = await this.simotelStorage.getOption('connection_mode', 'local');
        if (mode === 'cloud') {
            let server = await this.simotelStorage.getOption('cloud_server');
            if (!server || !String(server).trim()) server = 'https://panel.hostedpbx.ir/api/v4.1/';
            server = String(server).replace(/\/+$/,'');
            return `${server}/call/originate/act`;
        } else {
            const server = await this.simotelStorage.getOption("server");
            return `http://${server}/api/v4/call/originate/act`;
        }
    }

}

class SimotelStorage {


    constructor() {
        this.initNumbersHistory();
    }

    initNumbersHistory() {
        chrome.storage.sync.get(['numbersHistory'], function (result) {
            if (!result.hasOwnProperty("numbersHistory")) {
                chrome.storage.sync.set({ numbersHistory: [] });
            }
        });
    }

    addNumberToHistoryStorage(number) {
        chrome.storage.sync.get(['numbersHistory'], function (result) {
            if (result.numbersHistory.length > 4) result.numbersHistory.shift();
            result.numbersHistory.push(number);
            chrome.storage.sync.set({ numbersHistory: result.numbersHistory });
        });
    }

    getOptionsFromStorage() {
        let th = this;
        let optionsKeys = ['user','pass','server','caller','context','discoverTelLink','trunkName','connection_mode','cloud_server','cloud_api_token','cloud_caller','cloud_context','cloud_trunkName'];
        return new Promise(resolve => {
            chrome.storage.sync.get(optionsKeys, function (result) {
                resolve(result);
            });
        })

    }

    setOptions(options) {
        return new Promise(resolve => {
            chrome.storage.sync.set(options, function (res) {
                resolve(true);
            });
        })
    }

    async getOptions() {
        return await this.getOptionsFromStorage();
    }

    async getOption(key, def = "") {
        let options = await this.getOptionsFromStorage();
        return options[key] ?? def;
    }

}

class Notifs {

    show(message, status) {
        try {
          if (typeof message !== 'string') {
            if (message && typeof message.message === 'string') {
              message = message.message;
            } else if (message && typeof message === 'object') {
              try { message = JSON.stringify(message); } catch(e) { message = String(message); }
            } else {
              message = String(message);
            }
          }
        } catch(e) { message = 'Unknown error'; }

        if (!chrome.hasOwnProperty("notifications")) {
            alert(message);
            return;
        }

        let id = Math.random().toString();
        chrome.notifications.create(id, {
            type: "basic",
            title: "Simotel Click2Dial",
            message: String(message),
            iconUrl: chrome.runtime.getURL('images/simotel128.png')
        });
    }

    success(message) {
        this.show(message, "success")
    }
    error(message) {
        this.show(message, "error")
    }

}

class validations {

    simotelStorage;

    constructor() {
        this.simotelStorage = new SimotelStorage;
    }

    filterDestNumber(number) {
        if (typeof number == "number")
            return number;

        number = number.replace(/\s/g, '');
        number = number.replace(/\s/g, '');
        number = number.split("-").join("");
        number = number.split("_").join("");
        number = number.split("(").join("");
        number = number.split(")").join("");

        let persianNum = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
        let num2en = function (str) {
            for (var i = 0; i < 10; i++) {
                str = str.split(persianNum[i]).join(i);
            }
            return str;
        };
        number = num2en(number);

        return number;

    }

    validateNumber(dest) {
        const regex = RegExp('^(?=.*[0-9])[-_ +()0-9]+$');
        return regex.test(dest)
    }

    async isAllRequiredOptionsEntered(withTrunk = false) {
        let mode = await this.simotelStorage.getOption('connection_mode', 'local');
        let optionsKeys = mode === 'cloud'
            ? ['cloud_api_token','cloud_server','cloud_caller','cloud_context']
            : ['user','pass','server','caller','context'];
        if (withTrunk) optionsKeys.push(mode === 'cloud' ? 'cloud_trunkName' : 'trunkName');

        let options = await this.simotelStorage.getOptions();
        for (let key in optionsKeys) {
            let opt = options[optionsKeys[key]];
            if (opt == undefined || !opt || opt == '')
                return false;
        }
        return true;
    }

}

// === MV3: Add context menu for dialing with Simotel ===
try {
  chrome.runtime.onInstalled.addListener(() => {
    try {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'simotel_dial_selection',
          title: 'Dial with Simotel',
          contexts: ['selection','link']
        });
      });
    } catch (e) {}
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      let raw = info.selectionText || '';
      if (!raw && info.linkUrl && info.linkUrl.startsWith('tel:')) {
        try { raw = decodeURIComponent(info.linkUrl.replace(/^tel:/i,'')); } catch(_) { raw = info.linkUrl.replace(/^tel:/i,''); }
      }
      const v = new validations();
      const num = v.filterDestNumber(raw || '');
      if (!v.validateNumber(num)) { new Notifs().error('Invalid phone number'); return; }
      const s = new Simotel();
      await s.speedCall(num);
    } catch (e) {
      try { new Notifs().error(e && e.message ? e.message : String(e)); } catch(_) {}
    }
  });
} catch(e) {}
// === end context menu ===
