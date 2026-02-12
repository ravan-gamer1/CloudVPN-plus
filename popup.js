const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const toggleBtn = document.getElementById("toggle-btn");

const authSection = document.getElementById("auth-section");
const vpnSection = document.getElementById("vpn-section");
const statusText = document.getElementById("status");

function showLogin() {
  authSection.classList.remove("hidden");
  vpnSection.classList.add("hidden");
}

function showVPN() {
  authSection.classList.add("hidden");
  vpnSection.classList.remove("hidden");
  getVPNStatus(); // 👈 Important
}

// 🔐 Decode JWT
function parseJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// ⏳ Check expiry
function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

// 🚀 On popup load
document.addEventListener("DOMContentLoaded", async () => {
  const { token } = await chrome.storage.local.get("token");

  if (!token) {
    showLogin();
    return;
  }

  if (isTokenExpired(token)) {
    await chrome.storage.local.remove("token");
    showLogin();
    return;
  }

  showVPN();
});

// 🔄 React to token changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.token) {
    changes.token.newValue ? showVPN() : showLogin();
  }
});

// 🔑 Open login page
loginBtn.addEventListener("click", () => {
  chrome.tabs.create({
    url: "http://localhost:5000/login.html"
  });
});

// 🚪 Logout
logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("token");
  chrome.runtime.sendMessage({ type: "LOGOUT" });
  showLogin();
});

// 🔌 Toggle VPN
toggleBtn.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    type: "TOGGLE_VPN"
  });

  updateUI(response.connected);
});

// 📡 Get VPN status
async function getVPNStatus() {
  const response = await chrome.runtime.sendMessage({
    type: "GET_STATUS"
  });

  updateUI(response.connected);
}

// 🎨 Update UI
function updateUI(isConnected) {
  statusText.textContent = isConnected ? "Connected" : "Disconnected";
  toggleBtn.textContent = isConnected ? "Disconnect VPN" : "Connect VPN";
}
