//
//  view.js
//  netflix-leaving-soon
//
//  Created by Daniel McFarlane on 10/06/2025
//
//  Contains the user interface rendering logic.
//

window.NFLX_View = (function () {
  const createElement = (tag, props = {}, children = []) => {
    const element = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === "style") {
        element.style.cssText = value;
      } else if (key === "className") {
        element.className = value;
      } else {
        element[key] = value;
      }
    });
    children.forEach((child) => element.appendChild(child));
    return element;
  };

  const showLoadingScreen = () => {
    const spinner = createElement("div", { className: "nflx-spinner" });
    const text = createElement("div", {
      className: "nflx-loader-text",
      textContent: "Loading all titles...",
    });
    const loadScreen = createElement(
      "div",
      { className: "nflx-loader-overlay" },
      [spinner, text],
    );
    document.body.appendChild(loadScreen);
    return loadScreen;
  };

  const createModalHeader = (headerText) => {
    const title = createElement("h3", {
      className: "nflx-modal-title",
      textContent: headerText,
    });
    return createElement("div", { className: "nflx-modal-header" }, [title]);
  };

  const createModalBody = (titles, scanned) => {
    const hasList = titles.length > 0;

    if (!scanned || !hasList) {
      return createElement("div", {
        className: "nflx-modal-body-empty",
        textContent: !scanned
          ? "We could not scan the page. The layout may have changed or the page hasn't fully loaded."
          : "No titles in your list are leaving soon.",
      });
    }

    const listItems = titles.map((t) =>
      createElement("li", { className: "nflx-list-item", textContent: t }),
    );
    return createElement("ul", { className: "nflx-list" }, listItems);
  };

  const createModalFooter = () => {
    const button = createElement("button", {
      id: "nflx-modal-btn",
      textContent: "Close",
    });
    const form = createElement(
      "form",
      { method: "dialog", className: "nflx-modal-form" },
      [button],
    );
    return createElement("div", { className: "nflx-modal-footer" }, [form]);
  };

  const buildAndShowModal = ({ titles, scanned }) => {
    document.getElementById("nflx-modal")?.remove();

    const hasList = titles.length > 0;
    const headerText = hasList
      ? "Leaving Soon"
      : !scanned
        ? "Something Went Wrong"
        : "No Titles Found";

    const headerElement = createModalHeader(headerText);
    const bodyContent = createModalBody(titles, scanned);
    const footerElement = createModalFooter();

    const dialog = createElement("dialog", { id: "nflx-modal" }, [
      headerElement,
      bodyContent,
      footerElement,
    ]);

    document.body.appendChild(dialog);
    dialog.showModal();
  };

  return { showLoadingScreen, buildAndShowModal };
})();
