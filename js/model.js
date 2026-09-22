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
      if (!text.includes("leaving.soon")) continue;

      // Gets the video ID from the script content
      const entityRegex = /(?:[A-Za-z0-9_]+):(?:[A-Za-z0-9_]+_)?Video:(\d+)_/g;
      let match;

      while ((match = entityRegex.exec(text)) !== null) {
        const videoId = match[1];
        const start = match.index;
        const entityText = text.slice(start, start + 1500); // Extract a chunk of text around the match without parsing the entire script

        if (!entityText.includes("leaving.soon")) continue;

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

        leavingSoon.set(videoId, { id: videoId, title: title || videoId });
      }
    }

    return leavingSoon;
  };

  const findMyListHeading = () => {
    return [...document.querySelectorAll("h1,h2,h3,h4,div,span")].find(
      (el) => el.children.length === 0 && el.textContent.trim() === "My List",
    );
  };

  const findCarousel = () => {
    const heading = findMyListHeading();
    if (!heading) return null;

    let container = heading.parentElement;

    // Traverse up to 12 levels of parent elements to find a container with virtual slots
    for (let i = 0; i < 12 && container; i++) {
      if (container.querySelectorAll("[data-virtual-slot]").length) {
        return { heading, container };
      }
      container = container.parentElement;
    }

    return null;
  };

  const getCards = (container) => {
    const slots = [...container.querySelectorAll("[data-virtual-slot]")];
    const results = [];

    for (const slot of slots) {
      const img = slot.querySelector("img");
      if (!img || !img.src) continue;

      const link = slot.querySelector("a[href]");
      const href = link?.href || "";
      // Extract the video ID from the href or from the image src if available
      const id =
        href?.match(/\/(?:watch|title)\/(\d+)/)?.[1] ||
        href?.match(/jbv=(\d+)/)?.[1] ||
        "";

      const key = id || href || img.src;
      if (!key) continue;

      const hasLeavingBadge =
        slot.textContent?.toLowerCase().includes("leaving soon") ||
        link
          ?.getAttribute("data-ui-tracking-context")
          ?.includes("leaving.soon") ||
        slot.innerHTML?.includes("leaving.soon");

      results.push({
        key,
        id,
        href,
        src: img.src,
        srcset: img.srcset || "",
        title: img.alt || link?.getAttribute("aria-label") || "",
        hasLeavingBadge: Boolean(hasLeavingBadge),
      });
    }

    return results;
  };

  const findNextControl = (container) => {
    const candidates = [
      ...container.querySelectorAll("button"),
      ...container.querySelectorAll('[role="button"]'),
      ...container.querySelectorAll("a"),
    ];

    let next = candidates.find((el) => {
      const description = [
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.getAttribute("data-uia"),
        typeof el.className === "string" ? el.className : "",
        el.textContent,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        description.includes("next") ||
        description.includes("right") ||
        description.includes("forward")
      );
    });

    if (next) return next;

    const containerRect = container.getBoundingClientRect();

    // Find the rightmost button that is visible and within the container's bounds
    const rightEdgeCandidates = candidates.filter((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right >= containerRect.right - 120
      );
    });

    return rightEdgeCandidates.at(-1) || null;
  };

  return {
    getLeavingSoonDetails,
    findMyListHeading,
    findCarousel,
    getCards,
    findNextControl,
  };
})();
