//
//  background.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Contains the background logic for the extension.
//

browser.action.disable(); // Disable the extension icon by default until a Netflix tab is detected

const updateIconState = (tabId, url) => {
  url?.includes("netflix.com")
    ? browser.action.enable(tabId)
    : browser.action.disable(tabId);
};

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) updateIconState(tabId, tab.url);
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await browser.tabs.get(tabId);
  updateIconState(tabId, tab.url);
});

browser.action.onClicked.addListener(async ({ id }) => {
  try {
    const target = { tabId: id };
    await Promise.all([
      browser.scripting.insertCSS({ target, files: ["css/style.css"] }),
      browser.scripting.executeScript({
        target,
        files: ["js/model.js", "js/view.js", "js/controller.js"],
      }),
    ]);
  } catch (error) {
    console.error("Failed to inject extension scripts:", error);
  }
});
