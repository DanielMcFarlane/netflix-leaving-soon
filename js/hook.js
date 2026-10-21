//
//  hook.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 18/10/2026
//
//  Intercepts network requests looking for fetch and XHR responses for titles tagged "leaving.soon"
//

(function () {
  if (window.__nflxLeavingHooked) return;
  window.__nflxLeavingHooked = true;

  const DOM_DATA_ATTRIBUTE = "data-nflx-leaving";
  const LEAVING_REGEX = /leaving(?:[.\s_-]|%2e|%20)?soon/gi;
  const capturedTitles = new Map();
  let debounceTimer = null;

  // Debounce DOM writes to prevent UI freezing during bulk network requests
  const publishToDOM = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        document.documentElement.setAttribute(
          DOM_DATA_ATTRIBUTE,
          JSON.stringify([...capturedTitles.values()]),
        );
      } catch {}
    }, 100);
  };

  const scanPayload = (payloadText) => {
    if (typeof payloadText !== "string" || payloadText.length < 20) return;

    let hasNewTitles = false;

    // Recursively traverses the JSON tree from the bottom up.
    // A node inherits the 'leaving soon' status if any of its children contain the badge.
    const scanNode = (node, parentKey) => {
      if (typeof node === "string") {
        LEAVING_REGEX.lastIndex = 0;
        return LEAVING_REGEX.test(node);
      }

      if (Array.isArray(node)) {
        let containsLeavingBadge = false;
        for (const item of node) {
          if (scanNode(item, null)) {
            containsLeavingBadge = true;
          }
        }
        return containsLeavingBadge;
      }

      if (node === null || typeof node !== "object") {
        return false;
      }

      // Inherit the leaving soon status if any child properties contain the badge
      let containsLeavingBadge = false;
      for (const [key, val] of Object.entries(node)) {
        if (scanNode(val, key)) {
          containsLeavingBadge = true;
        }
      }

      // Identify the current video ID
      let videoId = null;

      if (parentKey && typeof parentKey === "string") {
        const match = parentKey.match(/^Video:(\d+)$/);

        if (match) videoId = match[1];
      }

      const isValidId = (val) => val && /^\d+$/.test(String(val));

      videoId =
        videoId || (isValidId(node.videoId) ? String(node.videoId) : null);
      videoId = videoId || (isValidId(node.id) ? String(node.id) : null);
      videoId =
        videoId ||
        (isValidId(node.summary?.id) ? String(node.summary.id) : null);

      let videoTitle = null;
      if (typeof node.title === "string") {
        videoTitle = node.title;
      }

      // Match found - save it and prevent parent nodes from reusing the badge.
      if (containsLeavingBadge && videoId) {
        const existingRecord = capturedTitles.get(videoId);

        if (!existingRecord || (!existingRecord.title && videoTitle)) {
          capturedTitles.set(videoId, {
            id: videoId,
            title: videoTitle || existingRecord?.title || "",
          });
          hasNewTitles = true;
        }
        return false;
      }

      return containsLeavingBadge;
    };

    try {
      const parsedData = JSON.parse(payloadText);
      scanNode(parsedData, null);
    } catch {
      // Fallback parser for non-JSON payloads.
      LEAVING_REGEX.lastIndex = 0;
      let regexMatch;

      while ((regexMatch = LEAVING_REGEX.exec(payloadText)) !== null) {
        // Look backwards from the match to find the closest preceding video ID key
        const searchWindowStart = Math.max(0, regexMatch.index - 8000);
        const textBeforeMatch = payloadText.slice(
          searchWindowStart,
          regexMatch.index,
        );
        const videoIdMatches = [...textBeforeMatch.matchAll(/Video:(\d+)/g)];
        const closestVideoIdMatch = videoIdMatches[videoIdMatches.length - 1];

        if (!closestVideoIdMatch) continue;

        const matchedVideoId = closestVideoIdMatch[1];
        const videoIdPosition = searchWindowStart + closestVideoIdMatch.index;
        let extractedTitle = null;

        // Look forwards from the ID key position to extract the display title
        const displayStringMatch = payloadText
          .slice(videoIdPosition, videoIdPosition + 600)
          .match(/"displayString":"((?:\\.|[^"\\])*)"/);

        if (displayStringMatch) {
          try {
            extractedTitle = JSON.parse(`"${displayStringMatch[1]}"`);
          } catch {
            extractedTitle = displayStringMatch[1];
          }
        }

        const existingRecord = capturedTitles.get(matchedVideoId);

        if (!existingRecord || (!existingRecord.title && extractedTitle)) {
          capturedTitles.set(matchedVideoId, {
            id: matchedVideoId,
            title: extractedTitle || existingRecord?.title || "",
          });
          hasNewTitles = true;
        }
      }
    }

    if (hasNewTitles) publishToDOM();
  };

  // Read fetch responses without breaking the original request
  const originalFetch = window.fetch;

  if (typeof originalFetch === "function") {
    window.fetch = function (...args) {
      const fetchPromise = originalFetch.apply(this, args);
      fetchPromise
        .then((response) => {
          try {
            const contentType = response.headers.get("content-type") || "";

            if (/json|text|javascript/i.test(contentType)) {
              response
                .clone()
                .text()
                .then(scanPayload)
                .catch(() => {});
            }
          } catch {}
        })
        .catch(() => {});
      return fetchPromise;
    };
  }

  // Intercept XMLHttpRequest to parse payloads once the load event fires
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      try {
        if (this.responseType === "" || this.responseType === "text") {
          scanPayload(this.responseText);
        } else if (this.responseType === "json" && this.response) {
          scanPayload(JSON.stringify(this.response));
        }
      } catch {}
    });
    return originalXhrSend.apply(this, args);
  };
})();
