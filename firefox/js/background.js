//
//  background.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Contains the background logic for the extension.
//

browser.action.disable();

function updateIconState(tabId, url) {
  url && url.includes("netflix.com")
    ? browser.action.enable(tabId)
    : browser.action.disable(tabId);
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  updateIconState(tabId, tab.url);
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await browser.tabs.get(activeInfo.tabId);
  updateIconState(activeInfo.tabId, tab.url);
});

browser.action.onClicked.addListener(async (tab) => {
  try {
    await browser.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["css/style.css"],
    });

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["js/model.js", "js/view.js", "js/controller.js"],
    });
  } catch (error) {
    console.error("Failed to inject extension scripts:", error);
  }
});
