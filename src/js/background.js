function sendInitMessage(url, tabId){
  if (url && url.includes("watch?v")) {
    const queryParameters = url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);
    const urlParameterVideo = urlParameters.get("v");
    
    chrome.tabs.sendMessage(tabId, {
      type: "init",
      videoURL: urlParameterVideo,
    });
  }
}

/* Launched by entering a direct URL */
chrome.tabs.onUpdated.addListener((tabId, tab) => {
  sendInitMessage(tab.url, tabId);
});

/* Launched when reloading a YouTube video page or navigating on the YouTube site. */
chrome.webNavigation.onCompleted.addListener((details) => {
  chrome.tabs.get(details.tabId, function(tab) {
    sendInitMessage(tab.url, details.tabId);
  });
});

/* Saves annotation results to a local file chosen by the user. */
chrome.runtime.onMessage.addListener((msg, sender, response) => {
  if (msg.type != "saveFile")
    return;

  const url = "data:application/json;charset=utf-8," + encodeURIComponent(msg.data);
  chrome.downloads.download({url: url, filename: msg.filename, saveAs: true}, (downloadId) => {
    if (chrome.runtime.lastError || downloadId === undefined) {
      const error = chrome.runtime.lastError ? chrome.runtime.lastError.message : "unknown error";
      response({ok: false, error: /cancel/i.test(error) ? "canceled" : error});
      return;
    }

    const onChanged = (delta) => {
      if (delta.id != downloadId || !delta.state)
        return;
      if (delta.state.current == "complete") {
        chrome.downloads.onChanged.removeListener(onChanged);
        response({ok: true});
      }
      else if (delta.state.current == "interrupted") {
        chrome.downloads.onChanged.removeListener(onChanged);
        response({ok: false, error: delta.error ? delta.error.current : "interrupted"});
      }
    };
    chrome.downloads.onChanged.addListener(onChanged);
  });

  return true;
});
