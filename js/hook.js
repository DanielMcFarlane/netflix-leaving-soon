//
//  hook.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 18/10/2026
//
//  Intercepts fetch and XHR responses to find titles tagged "leaving.soon"
//

(function () {
  if (window.__nflxLeavingHooked) return;
  window.__nflxLeavingHooked = true;

  const DOM_DATA_ATTRIBUTE = "data-nflx-leaving";
  const LEAVING_REGEX = /leaving(?:[.\s\_-]|%2e|%20)?soon/i;
  const MAX_BADGE_STRING_LENGTH = 100;
  const MAX_DEPTH = 80;
  const capturedTitles = new Map();
  let debounceTimer = null;

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

  const isId = (val) =>
    (typeof val === "string" || typeof val === "number") &&
    /^\d+$/.test(String(val));

  const getVideoId = (node, parentKey) => {
    if (typeof parentKey === "string") {
      const match = parentKey.match(/^Video:(\d+)(?:_.*)?$/);
      if (match) return match[1];
    }

    if (node.__typename === "Video" && isId(node.videoId ?? node.id)) {
      return String(node.videoId ?? node.id);
    }

    if (isId(node.videoId)) return String(node.videoId);
    if (isId(node.summary?.id)) return String(node.summary.id);

    return null;
  };

  const parsePayload = (text) => {
    try {
      return JSON.parse(text);
    } catch {}

    // Handle anti-hijacking prefixes before the JSON payload
    const start = text.search(/[{[]/);
    if (start > 0) {
      try {
        return JSON.parse(text.slice(start));
      } catch {}
    }
    return null;
  };

  const scanPayload = (payloadText) => {
    if (typeof payloadText !== "string" || payloadText.length < 20) return;

    // Avoid traversing payloads that cannot contain a matching badge
    if (!LEAVING_REGEX.test(payloadText)) return;

    const parsedData = parsePayload(payloadText);
    if (!parsedData) return;

    const found = [];

    const scanNode = (node, parentKey, depth) => {
      if (depth > MAX_DEPTH) return false;

      if (typeof node === "string") {
        return (
          node.length <= MAX_BADGE_STRING_LENGTH && LEAVING_REGEX.test(node)
        );
      }

      if (Array.isArray(node)) {
        let hasBadge = false;
        for (const item of node) {
          if (scanNode(item, null, depth + 1)) hasBadge = true;
        }
        return hasBadge;
      }

      if (node === null || typeof node !== "object") return false;

      let hasBadge = false;
      for (const [key, val] of Object.entries(node)) {
        if (scanNode(val, key, depth + 1)) hasBadge = true;
      }

      const videoId = getVideoId(node, parentKey);

      // Allow badges to propagate until they reach their enclosing video
      if (!videoId) return hasBadge;

      // Video nodes claim their own badges rather than passing them upwards
      if (hasBadge) {
        found.push({
          id: videoId,
          title: typeof node.title === "string" ? node.title : "",
        });
      }
      return false;
    };

    try {
      scanNode(parsedData, null, 0);
    } catch {
      return;
    }

    let hasNewTitles = false;

    for (const { id, title } of found) {
      const existingRecord = capturedTitles.get(id);

      if (!existingRecord || (!existingRecord.title && title)) {
        capturedTitles.set(id, {
          id,
          title: title || existingRecord?.title || "",
        });
        hasNewTitles = true;
      }
    }

    if (hasNewTitles) publishToDOM();
  };

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
