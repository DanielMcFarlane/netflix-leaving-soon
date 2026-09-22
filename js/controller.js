//
//  controller.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Orchestrates the scrolling logic and connects the Model to the View.
//

(async function () {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const scanList = async () => {
    const found = window.NFLX.Model.findCarousel();
    if (!found) {
      return { cards: [], scanned: false, heading: null, container: null };
    }

    const collected = new Map();
    let container = found.container;
    let scansWithoutNewTitles = 0;
    let scan = 0;
    const EMERGENCY_STOP_LIMIT = 250;
    const NO_NEW_TITLES_LIMIT = 8;

    while (
      scan < EMERGENCY_STOP_LIMIT &&
      scansWithoutNewTitles < NO_NEW_TITLES_LIMIT
    ) {
      scan++;

      const current = window.NFLX.Model.findCarousel();
      if (current?.container) container = current.container;

      const cards = window.NFLX.Model.getCards(container);
      const before = collected.size;

      for (const card of cards) {
        if (!collected.has(card.key)) collected.set(card.key, card);
      }

      const added = collected.size - before;

      scansWithoutNewTitles = added === 0 ? scansWithoutNewTitles + 1 : 0;

      const next = window.NFLX.Model.findNextControl(container);
      if (!next) break;

      try {
        next.click();
      } catch (error) {
        break;
      }

      await sleep(850);
    }

    const allCards = [...collected.values()];
    const refreshed = window.NFLX.Model.findCarousel() || found;

    return {
      cards: allCards,
      scanned: true,
      heading: refreshed.heading,
      container: refreshed.container,
    };
  };

  const init = async () => {
    let loadScreen;

    try {
      loadScreen = window.NFLX.View.showLoadingScreen();

      const scanResult = await scanList();
      const leavingSoonData = window.NFLX.Model.getLeavingSoonDetails();

      // Filter and sort the cards that are leaving soon
      const titles = scanResult.cards
        .filter(
          (card) =>
            card.id && (card.hasLeavingBadge || leavingSoonData.has(card.id)),
        )
        .map((card) => ({
          id: card.id,
          title: card.title || leavingSoonData.get(card.id)?.title || "",
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      if (scanResult.scanned) {
        window.NFLX.View.buildGrid(
          scanResult.heading,
          scanResult.container,
          scanResult.cards,
        );
      }

      window.NFLX.View.buildAndShowModal({
        titles,
        scanned: scanResult.scanned,
      });
    } catch (error) {
      console.error("Netflix Leaving Soon Extension Error:", error);
    } finally {
      loadScreen?.remove();
    }
  };

  init();
})();
