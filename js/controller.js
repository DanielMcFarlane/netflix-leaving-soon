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
    const initialCarousel = window.NFLX.Model.findCarousel();
    if (!initialCarousel) {
      return { cards: [], scanned: false, heading: null, container: null };
    }

    const collectedCards = new Map();
    let container = initialCarousel.container;
    let idleScans = 0;
    let scanIteration = 0;
    const EMERGENCY_STOP_LIMIT = 250;
    const IDLE_LIMIT = 8;

    while (scanIteration < EMERGENCY_STOP_LIMIT && idleScans < IDLE_LIMIT) {
      scanIteration++;

      const activeCarousel = window.NFLX.Model.findCarousel();

      if (activeCarousel?.container) container = activeCarousel.container;

      const cards = window.NFLX.Model.getCards(container);
      const previousCardCount = collectedCards.size;

      for (const card of cards) {
        const existing = collectedCards.get(card.key);

        if (!existing) {
          collectedCards.set(card.key, card);
        } else if (card.hasLeavingBadge && !existing.hasLeavingBadge) {
          existing.hasLeavingBadge = true;
        }
      }

      const newCardsAdded = collectedCards.size - previousCardCount;
      idleScans = newCardsAdded === 0 ? idleScans + 1 : 0;

      // Force Netflix to render the UI arrows by simulating a user hover
      try {
        container.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        container.dispatchEvent(new MouseEvent("mouseenter"));
      } catch {}

      const nextArrows = window.NFLX.Model.findNextControls(container);

      if (!nextArrows || nextArrows.length === 0) break;

      try {
        nextArrows[nextArrows.length - 1].click();
      } catch {}
      await sleep(750);
    }

    const finalCarousel = window.NFLX.Model.findCarousel();

    if (finalCarousel?.container) container = finalCarousel.container;

    for (const card of window.NFLX.Model.getCards(container)) {
      const existing = collectedCards.get(card.key);

      if (!existing) collectedCards.set(card.key, card);
      else if (card.hasLeavingBadge) existing.hasLeavingBadge = true;
    }

    const finalCarouselState =
      window.NFLX.Model.findCarousel() || initialCarousel;

    return {
      cards: [...collectedCards.values()],
      scanned: true,
      heading: finalCarouselState.heading,
      container: finalCarouselState.container,
    };
  };

  const init = async () => {
    let loadScreen;

    try {
      loadScreen = window.NFLX.View.showLoadingScreen();

      const scanResult = await scanList();
      const leavingSoonData = window.NFLX.Model.getLeavingSoonDetails();

      const leavingSoonTitles = scanResult.cards
        .filter(
          (card) =>
            card.id && (card.hasLeavingBadge || leavingSoonData.has(card.id)),
        )
        .map((card) => ({
          id: card.id,
          title: card.title || leavingSoonData.get(card.id)?.title || "",
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      if (scanResult.scanned && scanResult.heading) {
        window.NFLX.View.buildGrid(
          scanResult.heading,
          scanResult.container,
          scanResult.cards,
        );
      }

      window.NFLX.View.buildAndShowModal({
        titles: leavingSoonTitles,
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
