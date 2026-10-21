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
  const LEAVING_REGEX = /leaving(?:[.\s_-]|%2e|%20)?soon/i;

  const getLeavingSoonDetails = () => {
    const leavingSoonMap = new Map();
    const scripts = Array.from(document.scripts);

    for (const script of scripts) {
      const scriptText = script.textContent || "";

      if (!LEAVING_REGEX.test(scriptText)) continue;

      const videoIdRegex = /Video:(\d+)(?:_|\b)/g;
      const videoIdPositions = [];
      let match;

      while ((match = videoIdRegex.exec(scriptText)) !== null) {
        videoIdPositions.push({ id: match[1], index: match.index });
      }

      // Isolate the text for each video so data doesn't mix
      for (let i = 0; i < videoIdPositions.length; i++) {
        const { id: videoId, index: startIndex } = videoIdPositions[i];
        const endIndex = Math.min(
          videoIdPositions[i + 1]
            ? videoIdPositions[i + 1].index
            : scriptText.length,
          startIndex + 20000,
        );
        const videoTextRegion = scriptText.slice(startIndex, endIndex);

        if (!LEAVING_REGEX.test(videoTextRegion)) continue;

        let videoTitle = null;
        const titleMatchResult = videoTextRegion.match(
          /"displayString":"((?:\\.|[^"\\])*)"/,
        );

        if (titleMatchResult) {
          try {
            videoTitle = JSON.parse(`"${titleMatchResult[1]}"`);
          } catch {
            videoTitle = titleMatchResult[1];
          }
        }

        const existingRecord = leavingSoonMap.get(videoId);
        leavingSoonMap.set(videoId, {
          id: videoId,
          title: existingRecord?.title || videoTitle || videoId,
        });
      }
    }

    // Merge titles captured by hook.js from dynamically loaded network responses
    try {
      const rawInjectedData =
        document.documentElement.getAttribute("data-nflx-leaving");
      const hookedTitles = rawInjectedData ? JSON.parse(rawInjectedData) : [];

      for (const item of hookedTitles) {
        if (!item?.id) continue;

        const existingRecord = leavingSoonMap.get(item.id);
        leavingSoonMap.set(item.id, {
          id: item.id,
          title: existingRecord?.title || item.title || item.id,
        });
      }
    } catch {}

    return leavingSoonMap;
  };

  const findMyListHeading = () => {
    return [...document.querySelectorAll("h1,h2,h3,h4,div,span")].find(
      (element) =>
        element.children.length === 0 &&
        element.textContent.trim() === "My List" &&
        // Ignore the main site navigation menu
        !element.closest('nav, header, [role="navigation"], [role="menubar"]'),
    );
  };

  const findCarousel = () => {
    const headingElement = findMyListHeading();

    if (headingElement) {
      let currentContainer = headingElement.parentElement;

      for (let i = 0; i < 12 && currentContainer; i++) {
        if (currentContainer.querySelectorAll("[data-virtual-slot]").length) {
          return { heading: headingElement, container: currentContainer };
        }
        currentContainer = currentContainer.parentElement;
      }
    }

    // Handle regional languages by falling back to the URL path
    if (/my-list/i.test(location.pathname)) {
      const firstVirtualSlot = document.querySelector("[data-virtual-slot]");

      if (firstVirtualSlot) {
        const fallbackContainer =
          firstVirtualSlot.closest(".mainView, main, [role='main']") ||
          document.body;
        return { heading: null, container: fallbackContainer };
      }
    }

    return null;
  };

  const getCards = (carouselContainer) => {
    const virtualSlots = [
      ...carouselContainer.querySelectorAll("[data-virtual-slot]"),
    ];
    const extractedCards = [];

    for (const slotElement of virtualSlots) {
      const cardLink = slotElement.querySelector("a[href]");
      const cardUrl = cardLink?.href || "";
      const videoId =
        cardUrl.match(/\/(?:watch|title)\/(\d+)/)?.[1] ||
        cardUrl.match(/jbv=(\d+)/)?.[1] ||
        "";

      const cardImage = slotElement.querySelector("img");

      // Record cards even if their images have not loaded yet
      const uniqueKey = videoId || cardUrl || cardImage?.src || "";

      if (!uniqueKey) continue;

      let hasLeavingBadge = false;
      try {
        hasLeavingBadge =
          LEAVING_REGEX.test(slotElement.textContent || "") ||
          LEAVING_REGEX.test(slotElement.innerHTML || "") ||
          LEAVING_REGEX.test(
            (() => {
              try {
                return decodeURIComponent(slotElement.innerHTML || "");
              } catch {
                return "";
              }
            })(),
          );
      } catch {
        hasLeavingBadge = false;
      }

      extractedCards.push({
        key: uniqueKey,
        id: videoId,
        href: cardUrl,
        src: cardImage?.src || "",
        srcset: cardImage?.srcset || "",
        title:
          cardImage?.alt ||
          cardLink?.getAttribute("aria-label") ||
          cardLink?.textContent?.trim() ||
          "",
        hasLeavingBadge,
      });
    }

    return extractedCards;
  };

  const isVisible = (element) => {
    const boundingBox = element.getBoundingClientRect();
    return boundingBox.width > 0 && boundingBox.height > 0;
  };

  const isDisabled = (element) =>
    element.disabled === true ||
    element.getAttribute("aria-disabled") === "true" ||
    element.hasAttribute("disabled");

  // Ignore buttons inside title cards to prevent accidental clicks
  const findNextControls = (carouselContainer) => {
    const buttonCandidates = [
      ...carouselContainer.querySelectorAll('button, [role="button"]'),
    ];

    return buttonCandidates.filter((buttonElement) => {
      if (buttonElement.closest("[data-virtual-slot], a")) return false;

      if (isDisabled(buttonElement) || !isVisible(buttonElement)) return false;

      const elementLabel = [
        buttonElement.getAttribute("aria-label"),
        buttonElement.getAttribute("title"),
        buttonElement.getAttribute("data-uia"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const elementClass = (
        typeof buttonElement.className === "string"
          ? buttonElement.className
          : ""
      ).toLowerCase();

      return (
        /\b(next|see more|more titles|scroll right|forward)\b/.test(
          elementLabel,
        ) ||
        /handle-?next|next-?(btn|button|page|arrow)|slider-?next/.test(
          elementClass,
        ) ||
        /handle-?next|next-?(btn|button|page|arrow)/.test(elementLabel)
      );
    });
  };

  return {
    getLeavingSoonDetails,
    findMyListHeading,
    findCarousel,
    getCards,
    findNextControls,
  };
})();
