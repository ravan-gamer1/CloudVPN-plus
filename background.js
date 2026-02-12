const PROXY_CONFIG = {
  mode: "fixed_servers",
  rules: {
    singleProxy: {
      scheme: "http",  // change to socks5 if needed
      host: "127.0.0.1",
      port: 8080
    },
    bypassList: ["<local>"]
  }
};

function enableProxy() {
  chrome.proxy.settings.set(
    { value: PROXY_CONFIG, scope: "regular" },
    () => {
      console.log("Proxy enabled");
    }
  );
}

function disableProxy() {
  chrome.proxy.settings.clear(
    { scope: "regular" },
    () => {
      console.log("Proxy disabled");
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "TOGGLE_VPN") {

    chrome.storage.local.get("vpnState", (data) => {
      const newState = !data.vpnState;

      if (newState) {
        enableProxy();
      } else {
        disableProxy();
      }

      chrome.storage.local.set({ vpnState: newState }, () => {
        sendResponse({ connected: newState });
      });
    });

    return true;
  }

  if (message.type === "GET_STATUS") {
    chrome.storage.local.get("vpnState", (data) => {
      sendResponse({ connected: data.vpnState || false });
    });

    return true;
  }

  if (message.type === "LOGOUT") {
    disableProxy();
    chrome.storage.local.set({ vpnState: false });
  }
});
