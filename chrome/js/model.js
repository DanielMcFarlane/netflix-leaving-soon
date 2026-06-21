//
//  model.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Handles data extraction from the Netflix DOM.
//

window.NFLX_Model = (function () {
  const scrapeTitles = () => {
    const cards = Array.from(document.querySelectorAll(".ptrack-content"));
    if (cards.length === 0) return { titles: [], scanned: false };

    const leavingSoonCards = cards.filter((card) =>
      card.getAttribute("data-ui-tracking-context")?.includes("leaving.soon"),
    );

    const rawTitles = leavingSoonCards
      .map((card) => card.querySelector("a")?.getAttribute("aria-label"))
      .filter(Boolean);

    return { titles: [...new Set(rawTitles)], scanned: true };
  };

  return { scrapeTitles };
})();
