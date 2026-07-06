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
  const scrapeTitles = () => {
    // .ptrack-content is the current class used for the title cards in the "Leaving Soon" row
    // If it breaks it's probably this changing, so check the Netflix DOM for the new class name
    const cards = document.querySelectorAll(".ptrack-content");

    if (cards.length === 0) return { titles: [], scanned: false };

    const uniqueTitles = new Map();

    cards.forEach((card) => {
      if (
        !card.getAttribute("data-ui-tracking-context")?.includes("leaving.soon")
      )
        return;

      const link = card.querySelector("a");
      const title = link?.getAttribute("aria-label");
      const id = link?.getAttribute("href")?.match(/\/watch\/(\d+)/)?.[1]; // Extract the Netflix title ID from URLs

      if (title && id) {
        uniqueTitles.set(id, { title, id });
      }
    });

    return {
      titles: Array.from(uniqueTitles.values()),
      scanned: true,
    };
  };

  return { scrapeTitles };
})();
