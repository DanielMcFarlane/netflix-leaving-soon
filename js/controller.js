//
//  controller.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Orchestrates the scrolling logic and connects the Model to the View.
//

(async function () {
  const CONFIG = {
    INITIAL_LOAD_DELAY: 2000,
    SCROLL_STEP: 500,
    MAX_IDLE_CHECKS: 6,
    SCROLL_INTERVAL: 250,
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const scrollToBottom = async () => {
    await delay(CONFIG.INITIAL_LOAD_DELAY);

    let lastHeight = document.body.scrollHeight;
    let unchangedCount = 0;

    // Netflix lazy-loads titles while scrolling
    // Loop until the page height doesn't change after a certain number of checks
    while (unchangedCount < CONFIG.MAX_IDLE_CHECKS) {
      window.scrollBy(0, CONFIG.SCROLL_STEP);
      await delay(CONFIG.SCROLL_INTERVAL);

      const currentHeight = document.body.scrollHeight;
      const reachedBottom =
        Math.ceil(window.scrollY + window.innerHeight) >= currentHeight;

      if (currentHeight > lastHeight) {
        lastHeight = currentHeight;
        unchangedCount = 0;
      } else if (reachedBottom) {
        unchangedCount++;
      }
    }
    window.scrollTo(0, 0);
  };

  const init = async () => {
    let loadScreen;
    try {
      loadScreen = window.NFLX.View.showLoadingScreen();
      await scrollToBottom();
      const scanResult = window.NFLX.Model.scrapeTitles();
      window.NFLX.View.buildAndShowModal(scanResult);
    } catch (error) {
      console.error("Netflix Leaving Soon Extension Error:", error);
    } finally {
      loadScreen?.remove();
    }
  };
  init();
})();
