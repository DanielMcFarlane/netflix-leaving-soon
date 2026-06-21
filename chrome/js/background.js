//
//  background.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Contains the background logic for the extension.
//

chrome.action.disable();

function updateIconState(tabId, url) {
  url && url.includes("netflix.com")
    ? chrome.action.enable(tabId)
    : chrome.action.disable(tabId);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  updateIconState(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateIconState(activeInfo.tabId, tab.url);
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["css/style.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["js/model.js", "js/view.js", "js/controller.js"],
    });
  } catch (error) {
    console.error("Failed to inject extension scripts:", error);
  }
});
