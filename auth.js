(async function () {
  console.log("Auth page loaded");

  const statusText = document.getElementById("status");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  console.log("Token from URL:", token);

  if (!token) {
    statusText.textContent = "Authentication failed: No token received.";
    return;
  }

  try {
    console.log("Saving token...");
    await chrome.storage.local.set({ token });

    console.log("Token saved.");

    statusText.textContent = "Authentication successful!";

    setTimeout(() => {
      chrome.tabs.getCurrent((tab) => {
        if (tab && tab.id) {
          chrome.tabs.remove(tab.id);
        }
      });
    }, 1000);

  } catch (error) {
    console.error("Storage error:", error);
    statusText.textContent = "Error saving authentication.";
  }
})();
