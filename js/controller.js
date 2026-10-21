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

  const waitForSettle = async (container, maxMs = 3500) => {
    const start = Date.now();
    let previousCount = -1;
    let stablePolls = 0;

    await sleep(300);

    while (Date.now() - start < maxMs) {
      const currentCount = container.querySelectorAll(
        "[data-virtual-slot]",
      ).length;
      stablePolls = currentCount === previousCount ? stablePolls + 1 : 0;
      previousCount = currentCount;

      if (stablePolls >= 2) break;

      await sleep(200);
    }
  };

  const scrollPageDown = () => {
    const startY = window.scrollY;
    window.scrollTo({
      top: startY + window.innerHeight * 0.8,
      behavior: "instant",
    });
    return window.scrollY > startY + 1;
  };

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
    const IDLE_LIMIT = 5;

    const startScrollY = window.scrollY;

    // Keep the list in the viewport so Netflix keeps it mounted and renders its navigation arrows
    try {
      (initialCarousel.heading || initialCarousel.container).scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    } catch {}

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
      let progressMade = false;

      for (const arrow of nextArrows) {
        try {
          arrow.click();
          progressMade = true;
        } catch {}
      }

      // Prevent unmounting carousel rows by only scrolling downwards when in a grid layout
      if (!nextArrows.length && scrollPageDown()) progressMade = true;

      if (!progressMade && newCardsAdded === 0) break;

      await waitForSettle(container);
    }

    const finalCarousel = window.NFLX.Model.findCarousel();

    if (finalCarousel?.container) container = finalCarousel.container;

    for (const card of window.NFLX.Model.getCards(container)) {
      const existing = collectedCards.get(card.key);

      if (!existing) collectedCards.set(card.key, card);
      else if (card.hasLeavingBadge) existing.hasLeavingBadge = true;
    }

    window.scrollTo({ top: startScrollY, behavior: "instant" });

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

      // The grid injection requires a heading element to anchor itself to
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
