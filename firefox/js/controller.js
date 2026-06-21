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

  const scrollToBottom = async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, CONFIG.INITIAL_LOAD_DELAY),
    );

    return new Promise((resolve, reject) => {
      let lastHeight = document.body.scrollHeight;
      let unchangedCount = 0;

      const timer = setInterval(() => {
        try {
          window.scrollBy(0, CONFIG.SCROLL_STEP);
          const currentHeight = document.body.scrollHeight;
          const reachedBottom =
            Math.ceil(window.scrollY + window.innerHeight) >= currentHeight;

          if (currentHeight > lastHeight) {
            lastHeight = currentHeight;
            unchangedCount = 0;
            return;
          }

          if (!reachedBottom) return;

          if (++unchangedCount >= CONFIG.MAX_IDLE_CHECKS) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        } catch (error) {
          clearInterval(timer);
          reject(error);
        }
      }, CONFIG.SCROLL_INTERVAL);
    });
  };

  const init = async () => {
    let loadScreen;
    try {
      loadScreen = window.NFLX_View.showLoadingScreen();
      await scrollToBottom();

      const scanResult = window.NFLX_Model.scrapeTitles();
      window.NFLX_View.buildAndShowModal(scanResult);
    } catch (error) {
      console.error("Netflix Leaving Soon Extension Error:", error);
    } finally {
      if (loadScreen) loadScreen.remove();
    }
  };

  init();
})();
