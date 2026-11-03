//
//  model.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Handles data extraction from the Netflix DOM
//

window.NFLX = window.NFLX || {};

window.NFLX.Model = (function () {
  const LEAVING_REGEX = /leaving(?:[.\s\_-]|%2e|%20)?soon/i;

  // Match entity definitions rather than references so each entity's fields
  const ENTITY_DEFINITION_REGEX =
    /(?:\\x22|\\\\"|")([A-Za-z]+):(\d+)([^"\\]*?)(?:\\x22|\\\\"|")\s*:\s*\\{/g;

  const getLeavingSoonDetails = () => {
    const leavingSoonMap = new Map();
    const scripts = Array.from(document.scripts);

    for (const script of scripts) {
      const scriptText = script.textContent || "";

      if (!LEAVING_REGEX.test(scriptText)) continue;

      const entities = [];
      ENTITY_DEFINITION_REGEX.lastIndex = 0;
      let match;

      while ((match = ENTITY_DEFINITION_REGEX.exec(scriptText)) !== null) {
        entities.push({
          type: match[1],
          id: match[2],
          start: match.index + match[0].length,
          keyStart: match.index,
        });
      }

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.type !== "Video") continue;

        const endIndex = Math.min(
          entities[i + 1] ? entities[i + 1].keyStart : scriptText.length,
          entity.start + 20000,
        );
        const videoTextRegion = scriptText.slice(entity.start, endIndex);

        if (!LEAVING_REGEX.test(videoTextRegion)) continue;

        let videoTitle = null;
        for (const titleMatch of videoTextRegion.matchAll(
          /"displayString":"((?:\\.|[^"\\])*)"/g,
        )) {
          let candidate;
          try {
            candidate = JSON.parse(`"${titleMatch[1]}"`);
          } catch {
            candidate = titleMatch[1];
          }
          if (!LEAVING_REGEX.test(candidate)) {
            videoTitle = candidate;
            break;
          }
        }

        const existingRecord = leavingSoonMap.get(entity.id);
        leavingSoonMap.set(entity.id, {
          id: entity.id,
          title: existingRecord?.title || videoTitle || entity.id,
        });
      }
    }

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

    // Use the URL to identify My List when the heading is localised
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

  const slotHasLeavingBadge = (slotElement) => {
    const badgeAttributes = ["aria-label", "data-uia", "title"];

    for (const element of slotElement.querySelectorAll("*")) {
      if (element.children.length === 0) {
        const text = (element.textContent || "").trim();
        if (text && text.length <= 40 && LEAVING_REGEX.test(text)) return true;
      }

      for (const attribute of badgeAttributes) {
        const value = element.getAttribute(attribute);
        if (value && value.length <= 60 && LEAVING_REGEX.test(value)) {
          return true;
        }
      }
    }

    return false;
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

      const uniqueKey = videoId || cardUrl || cardImage?.src || "";

      if (!uniqueKey) continue;

      const hasLeavingBadge = slotHasLeavingBadge(slotElement);

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
