//
//  model.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Handles data extraction from the Netflix DOM.
//

window.NFLX = window.NFLX || {};
window.NFLX.Model = (function () {
  const getLeavingSoonDetails = () => {
    const leavingSoon = new Map();
    const scripts = Array.from(document.scripts);

    for (const script of scripts) {
      const text = script.textContent || "";

      if (!text.includes("leaving.soon")) {
        continue;
      }

      // Match any Video entity pattern regardless of treatment prefix
      const entityRegex = /(?:[A-Za-z0-9_]+):(?:[A-Za-z0-9_]+_)?Video:(\d+)_/g;
      let match;

      while ((match = entityRegex.exec(text)) !== null) {
        const videoId = match[1];
        const start = match.index;
        const entityText = text.slice(start, start + 1500);

        if (!entityText.includes("leaving.soon")) {
          continue;
        }

        let title = null;
        const titleMatch = entityText.match(
          /"displayString":"((?:\\.|[^"\\])*)"/,
        );

        if (titleMatch) {
          try {
            title = JSON.parse(`"${titleMatch[1]}"`);
          } catch {
            title = titleMatch[1];
          }
        }

        leavingSoon.set(videoId, {
          id: videoId,
          title: title || videoId,
        });
      }
    }

    return leavingSoon;
  };

  const getMyListSection = () => {
    const headers = document.querySelectorAll(".carousel-row h2");
    const myListHeader = Array.from(headers).find(
      (h) => h.textContent.trim() === "My List",
    );
    return myListHeader ? myListHeader.closest(".carousel-row") : null;
  };

  const extractVisibleListCards = () => {
    const myListSection = getMyListSection();
    if (!myListSection) return [];

    const cards = myListSection.querySelectorAll(
      'a[data-uia="standard-card"], a[data-uia="progress-card"]',
    );
    const extractedCards = [];

    for (const card of cards) {
      const href = card.getAttribute("href");
      const id =
        href?.match(/jbv=(\d+)/)?.[1] ||
        href?.match(/\/(?:watch|title)\/(\d+)/)?.[1];
      const title = card.getAttribute("aria-label");

      if (!id || !title) continue;

      const cardContainer =
        card.closest(".title-card, .slider-item, .carousel-tile") ||
        card.parentElement;
      const hasLeavingBadge =
        cardContainer?.textContent?.toLowerCase().includes("leaving soon") ||
        card
          .getAttribute("data-ui-tracking-context")
          ?.includes("leaving.soon") ||
        cardContainer?.innerHTML?.includes("leaving.soon");

      extractedCards.push({
        id,
        title,
        hasLeavingBadge: Boolean(hasLeavingBadge),
      });
    }

    return extractedCards;
  };

  const scrollMyListCarousel = () => {
    const myListSection = getMyListSection();
    if (!myListSection) return false;

    const nextButton = myListSection.querySelector(
      '[data-uia="carousel-right-button"]',
    );
    if (!nextButton) return false;

    nextButton.click();
    return true;
  };

  return {
    getLeavingSoonDetails,
    extractVisibleListCards,
    scrollMyListCarousel,
  };
})();
