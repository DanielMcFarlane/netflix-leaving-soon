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
    INITIAL_LOAD_DELAY: 1000,
    CLICK_MIN: 400,
    CLICK_MAX: 850,
    MAX_IDLE_CHECKS: 4,
    FINAL_SETTLE_DELAY: 1000,
  };

  // Generates a random delay between min and max to simulate human interaction
  const delay = (min, max) => {
    const ms = max ? Math.floor(Math.random() * (max - min + 1) + min) : min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const scrollHorizontally = async () => {
    await delay(CONFIG.INITIAL_LOAD_DELAY);

    const seenIds = new Set();
    const allCards = new Map();

    let unchangedCount = 0;

    while (unchangedCount < CONFIG.MAX_IDLE_CHECKS) {
      const visibleCards = window.NFLX.Model.extractVisibleListCards();
      let newTitleFound = false;

      if (visibleCards.length === 0) {
        unchangedCount++;
        await delay(CONFIG.CLICK_MIN, CONFIG.CLICK_MAX);
        continue;
      }

      for (const { id, title } of visibleCards) {
        if (seenIds.has(id)) continue;

        seenIds.add(id);
        newTitleFound = true;
        allCards.set(id, { id, title });
      }

      unchangedCount = newTitleFound ? 0 : unchangedCount + 1;

      window.NFLX.Model.scrollMyListCarousel();

      await delay(CONFIG.CLICK_MIN, CONFIG.CLICK_MAX);
    }

    await delay(CONFIG.FINAL_SETTLE_DELAY);
    const leavingSoonData = window.NFLX.Model.getLeavingSoonDetails();

    const titles = Array.from(allCards.values())
      .filter(({ id }) => leavingSoonData.has(id))
      .sort((a, b) => a.title.localeCompare(b.title));

    return {
      titles,
      scanned: true,
    };
  };

  const init = async () => {
    let loadScreen;

    try {
      loadScreen = window.NFLX.View.showLoadingScreen();
      const scanResult = await scrollHorizontally();
      window.NFLX.View.buildAndShowModal(scanResult);
    } catch (error) {
      console.error("Netflix Leaving Soon Extension Error:", error);
    } finally {
      loadScreen?.remove();
    }
  };

  init();
})();
