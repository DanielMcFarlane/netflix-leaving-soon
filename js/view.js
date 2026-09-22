//
//  view.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Contains the user interface rendering logic.
//

window.NFLX = window.NFLX || {};

window.NFLX.View = (function () {
  const createElement = (tag, props = {}, children = []) => {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "style") {
        element.style.cssText = value;
      } else {
        element[key] = value;
      }
    }

    element.append(...children);
    return element;
  };

  const showLoadingScreen = () => {
    const loadScreen = createElement(
      "div",
      { className: "nflx-loader-overlay" },
      [
        createElement("div", { className: "nflx-spinner" }),
        createElement("div", {
          className: "nflx-loader-text",
          textContent: "Loading all titles...",
        }),
      ],
    );

    document.body.appendChild(loadScreen);
    return loadScreen;
  };

  const createModalHeader = (headerText) =>
    createElement("div", { className: "nflx-modal-header" }, [
      createElement("h3", {
        id: "nflx-modal-title",
        className: "nflx-modal-title",
        textContent: headerText,
      }),
    ]);

  const createModalBody = (titles, scanned) => {
    if (!scanned || titles.length === 0) {
      return createElement("div", {
        className: "nflx-modal-body-empty",
        textContent: !scanned
          ? "We could not scan the page. The layout may have changed or the page hasn't fully loaded."
          : "No titles in your list are leaving soon.",
      });
    }

    return createElement(
      "ul",
      { className: "nflx-list" },
      titles.map(({ title, id }) =>
        createElement("li", { className: "nflx-list-item" }, [
          createElement("a", {
            href: `https://www.netflix.com/title/${id}`,
            textContent: title,
            className: "nflx-list-link",
            target: "_blank",
            rel: "noopener noreferrer",
          }),
        ]),
      ),
    );
  };

  const createModalFooter = () =>
    createElement("div", { className: "nflx-modal-footer" }, [
      createElement(
        "form",
        { method: "dialog", className: "nflx-modal-form" },
        [
          createElement("button", {
            id: "nflx-modal-btn",
            textContent: "Close",
          }),
        ],
      ),
    ]);

  const buildAndShowModal = ({ titles, scanned }) => {
    document.getElementById("nflx-modal")?.remove();

    const hasList = titles.length > 0;
    const headerText = hasList
      ? "Leaving Soon"
      : !scanned
        ? "Something Went Wrong"
        : "No Titles Found";

    const dialog = createElement(
      "dialog",
      {
        id: "nflx-modal",
        "aria-labelledby": "nflx-modal-title",
        onclose: (e) => e.target.remove(),
      },
      [
        createModalHeader(headerText),
        createModalBody(titles, scanned),
        createModalFooter(),
      ],
    );

    document.body.appendChild(dialog);
    dialog.showModal();
  };

  const buildGrid = (heading, container, cards) => {
    if (!cards.length) return false;

    document.getElementById("netflix-mylist-grid")?.remove();

    const title = createElement("h2", {
      textContent: "My List",
      style:
        "color: #fff; font-size: 1.6rem; font-weight: 600; margin: 10px 0 20px;",
    });

    const gridItems = cards.map((card) => {
      const imgProps = {
        src: card.src,
        alt: card.title,
      };

      if (card.srcset) imgProps.srcset = card.srcset;

      const img = createElement("img", imgProps);
      const itemProps = {
        className: "nflx-grid-card",
        style: `cursor: ${card.href ? "pointer" : "default"};`,
      };

      if (card.href) itemProps.href = card.href;

      return createElement(card.href ? "a" : "div", itemProps, [img]);
    });

    const grid = createElement(
      "div",
      {
        style:
          "display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px 10px; width: 100%; padding: 20px 0;",
      },
      gridItems,
    );

    const wrapper = createElement(
      "section",
      {
        id: "netflix-mylist-grid",
        style: "padding: 10px 3vw 50px; box-sizing: border-box; width: 100%;",
      },
      [title, grid],
    );

    let originalSection = heading.parentElement;
    while (originalSection && !originalSection.contains(container)) {
      originalSection = originalSection.parentElement;
    }

    if (!originalSection) originalSection = container;

    originalSection.style.display = "none";
    originalSection.parentNode.insertBefore(
      wrapper,
      originalSection.nextSibling,
    );

    return true;
  };

  return {
    showLoadingScreen,
    buildAndShowModal,
    buildGrid,
  };
})();
