"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector)
];

const state = {
  query: "",
  type: "web",
  page: 1,
  safe: true,
  timer: null,
  loading: false
};

const home = $("#home");
const searchView = $("#searchView");

const homeForm = $("#homeForm");
const homeInput = $("#homeInput");
const homeClear = $("#homeClear");
const homeSuggestions = $("#homeSuggestions");

const resultsForm = $("#resultsForm");
const resultsInput = $("#resultsInput");
const resultsSuggestions = $("#resultsSuggestions");

const results = $("#results");
const resultMeta = $("#resultMeta");
const pagination = $("#pagination");
const knowledge = $("#knowledge");

const safeBtn = $("#safeBtn");
const compactSafe = $("#compactSafe");
const themeBtn = $("#themeBtn");

/* =========================================
   HELPERS
========================================= */

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
  );
}

function escapeAttribute(value = "") {
  return escapeHTML(value);
}

function setInputValues(value) {
  homeInput.value = value;
  resultsInput.value = value;

  updateClearButton(homeInput);
}

function updateClearButton(input) {
  if (!homeClear) return;

  homeClear.style.display = input.value.trim()
    ? "block"
    : "none";
}

function closeSuggestions(box) {
  if (!box) return;

  box.innerHTML = "";
  box.style.display = "none";
}

function closeAllSuggestions() {
  closeSuggestions(homeSuggestions);
  closeSuggestions(resultsSuggestions);
}

function getStoredTheme() {
  return localStorage.getItem("tt-theme") || "dark";
}

function applyTheme() {
  const isLight = getStoredTheme() === "light";

  document.body.classList.toggle("light", isLight);

  if (themeBtn) {
    themeBtn.textContent = isLight ? "☾" : "☼";
  }
}

function toggleTheme() {
  const nextTheme =
    getStoredTheme() === "light"
      ? "dark"
      : "light";

  localStorage.setItem("tt-theme", nextTheme);

  applyTheme();
}

function updateSafeUI() {
  if (safeBtn) {
    safeBtn.classList.toggle(
      "active",
      state.safe
    );

    safeBtn.setAttribute(
      "aria-pressed",
      String(state.safe)
    );
  }

  if (compactSafe) {
    compactSafe.classList.toggle(
      "active",
      state.safe
    );

    compactSafe.textContent = state.safe
      ? "✦ Safe"
      : "✦ Off";

    compactSafe.setAttribute(
      "aria-pressed",
      String(state.safe)
    );
  }
}

function toggleSafeSearch() {
  state.safe = !state.safe;

  updateSafeUI();

  if (state.query) {
    runSearch(
      state.query,
      1,
      state.type
    );
  }
}

function setActiveTab(type) {
  $$(".search-tab").forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.type === type
    );
  });
}

function setLoading() {
  results.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Searching the live web…
    </div>
  `;

  resultMeta.textContent = "SEARCHING";

  knowledge.innerHTML = "";
  pagination.innerHTML = "";
}

function setError(message) {
  results.innerHTML = `
    <div class="error">
      ${escapeHTML(message)}
      <br><br>
      Try again in a moment.
    </div>
  `;

  resultMeta.textContent = "SEARCH ERROR";
  knowledge.innerHTML = "";
  pagination.innerHTML = "";
}

/* =========================================
   THEME
========================================= */

applyTheme();
updateSafeUI();

if (themeBtn) {
  themeBtn.addEventListener(
    "click",
    toggleTheme
  );
}

if (safeBtn) {
  safeBtn.addEventListener(
    "click",
    toggleSafeSearch
  );
}

if (compactSafe) {
  compactSafe.addEventListener(
    "click",
    toggleSafeSearch
  );
}

/* =========================================
   AUTOCOMPLETE
========================================= */

async function fetchSuggestions(
  value,
  box
) {
  const query = value.trim();

  if (!query) {
    closeSuggestions(box);
    return;
  }

  try {
    const response = await fetch(
      `/api/suggest?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Suggestions request failed: ${response.status}`
      );
    }

    const data = await response.json();

    const suggestions =
      Array.isArray(data.suggestions)
        ? data.suggestions
        : [];

    if (!suggestions.length) {
      closeSuggestions(box);
      return;
    }

    box.innerHTML = suggestions
      .slice(0, 8)
      .map(
        (suggestion) => `
          <button
            class="suggestion"
            type="button"
            data-suggestion="${escapeAttribute(
              suggestion
            )}"
          >
            <span>⌕</span>
            ${escapeHTML(suggestion)}
          </button>
        `
      )
      .join("");

    box.style.display = "block";

    $$(".suggestion", box).forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const value =
              button.dataset.suggestion || "";

            closeAllSuggestions();

            setInputValues(value);

            runSearch(
              value,
              1,
              "web"
            );
          }
        );
      }
    );
  } catch {
    closeSuggestions(box);
  }
}

function bindAutocomplete(
  input,
  box
) {
  if (!input || !box) return;

  input.addEventListener(
    "input",
    () => {
      updateClearButton(input);

      clearTimeout(state.timer);

      state.timer = setTimeout(
        () => {
          fetchSuggestions(
            input.value,
            box
          );
        },
        180
      );
    }
  );

  input.addEventListener(
    "focus",
    () => {
      if (input.value.trim()) {
        fetchSuggestions(
          input.value,
          box
        );
      }
    }
  );

  input.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeSuggestions(box);
      }
    }
  );
}

bindAutocomplete(
  homeInput,
  homeSuggestions
);

bindAutocomplete(
  resultsInput,
  resultsSuggestions
);

/* =========================================
   HOME FORM
========================================= */

homeForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    closeAllSuggestions();

    runSearch(
      homeInput.value,
      1,
      "web"
    );
  }
);

resultsForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    closeAllSuggestions();

    runSearch(
      resultsInput.value,
      1,
      state.type
    );
  }
);

homeClear.addEventListener(
  "click",
  () => {
    homeInput.value = "";

    updateClearButton(
      homeInput
    );

    closeSuggestions(
      homeSuggestions
    );

    homeInput.focus();
  }
);

/* =========================================
   QUICK SEARCHES
========================================= */

$$(".quick-searches button").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        const query =
          button.dataset.q || "";

        setInputValues(query);

        runSearch(
          query,
          1,
          "web"
        );
      }
    );
  }
);

/* =========================================
   SEARCH TABS
========================================= */

$$(".search-tab").forEach(
  (tab) => {
    tab.addEventListener(
      "click",
      () => {
        state.type =
          tab.dataset.type || "web";

        setActiveTab(
          state.type
        );

        if (!state.query) {
          return;
        }

        runSearch(
          state.query,
          1,
          state.type
        );
      }
    );
  }
);

/* =========================================
   MAIN SEARCH
========================================= */

async function runSearch(
  query,
  page = 1,
  type = "web"
) {
  const cleanedQuery =
    String(query || "").trim();

  if (!cleanedQuery) {
    return;
  }

  if (state.loading) {
    // Let the current request finish instead of
    // firing several identical upstream requests.
  }

  state.query = cleanedQuery;
  state.page = Number(page) || 1;
  state.type = type || "web";
  state.loading = true;

  setInputValues(
    cleanedQuery
  );

  setActiveTab(
    state.type
  );

  closeAllSuggestions();

  home.hidden = true;
  searchView.hidden = false;

  setLoading();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  try {
    if (
      state.type === "web" ||
      state.type === "wiki"
    ) {
      await loadWebSearch();
    } else {
      await loadSpecialSearch(
        state.type
      );
    }
  } catch (error) {
    console.error(
      "Search error:",
      error
    );

    setError(
      "The live search provider is temporarily unavailable."
    );
  } finally {
    state.loading = false;
  }
}

/* =========================================
   WEB SEARCH
========================================= */

async function loadWebSearch() {
  const params =
    new URLSearchParams();

  params.set(
    "q",
    state.query
  );

  params.set(
    "page",
    String(state.page)
  );

  params.set(
    "safe",
    state.safe ? "1" : "0"
  );

  const response =
    await fetch(
      `/api/search?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `Search request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (state.type === "wiki") {
    renderWikipediaMode(
      data.knowledge
    );

    return;
  }

  renderWebResults(
    data
  );
}

/* =========================================
   SPECIAL SEARCH
========================================= */

async function loadSpecialSearch(
  type
) {
  const params =
    new URLSearchParams();

  params.set(
    "q",
    state.query
  );

  params.set(
    "safe",
    state.safe ? "1" : "0"
  );

  const response =
    await fetch(
      `/api/special/${encodeURIComponent(
        type
      )}?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `Special search failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  renderMediaResults(
    data
  );
}

/* =========================================
   WEB RESULT RENDERING
========================================= */

function renderWebResults(data) {
  const items =
    Array.isArray(data.results)
      ? data.results
      : [];

  const page =
    Number(data.page) || state.page;

  resultMeta.textContent =
    `WEB RESULTS  ·  PAGE ${page}`;

  if (!items.length) {
    results.innerHTML = `
      <div class="empty">
        No results found.
        <br>
        Try a broader search.
      </div>
    `;

    knowledge.innerHTML = "";
    pagination.innerHTML = "";

    return;
  }

  results.innerHTML =
    items
      .map(
        (item, index) => `
          <article
            class="result"
            style="animation-delay:${Math.min(
              index * 35,
              240
            )}ms"
          >
            <div class="result-url">
              ${escapeHTML(
                item.displayUrl ||
                item.url ||
                ""
              )}
            </div>

            <h2>
              <a
                href="${escapeAttribute(
                  item.url || "#"
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHTML(
                  item.title ||
                  "Untitled result"
                )}
              </a>
            </h2>

            <p>
              ${escapeHTML(
                item.snippet ||
                "Open this result to read more."
              )}
            </p>
          </article>
        `
      )
      .join("");

  renderKnowledge(
    data.knowledge
  );

  renderPagination(
    page
  );
}

/* =========================================
   WIKIPEDIA MODE
========================================= */

function renderWikipediaMode(item) {
  resultMeta.textContent =
    "WIKIPEDIA-STYLE KNOWLEDGE";

  pagination.innerHTML = "";

  renderKnowledge(item);

  if (!item) {
    results.innerHTML = `
      <div class="empty">
        No matching knowledge result.
      </div>
    `;

    return;
  }

  results.innerHTML = `
    <article class="result">
      <div class="result-url">
        wikipedia.org
      </div>

      <h2>
        <a
          href="${escapeAttribute(
            item.url || "#"
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHTML(
            item.title ||
            "Wikipedia result"
          )}
        </a>
      </h2>

      <p>
        ${escapeHTML(
          item.extract ||
          "No summary was available."
        )}
      </p>
    </article>
  `;
}

/* =========================================
   KNOWLEDGE PANEL
========================================= */

function renderKnowledge(item) {
  if (!item) {
    knowledge.innerHTML = "";
    return;
  }

  const image =
    item.image
      ? `
        <img
          class="knowledge-img"
          src="${escapeAttribute(
            item.image
          )}"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        >
      `
      : "";

  knowledge.innerHTML = `
    <div class="knowledge-card">

      ${image}

      <div class="knowledge-body">

        <h2>
          ${escapeHTML(
            item.title ||
            "Knowledge"
          )}
        </h2>

        <p>
          ${escapeHTML(
            item.extract ||
            "No summary available."
          )}
        </p>

        ${
          item.url
            ? `
              <a
                href="${escapeAttribute(
                  item.url
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read on Wikipedia ↗
              </a>
            `
            : ""
        }

      </div>
    </div>
  `;
}

/* =========================================
   MEDIA RESULTS
========================================= */

function renderMediaResults(data) {
  const type =
    data.type || state.type;

  const items =
    Array.isArray(data.results)
      ? data.results
      : [];

  resultMeta.textContent =
    `${String(type).toUpperCase()} RESULTS`;

  knowledge.innerHTML = "";
  pagination.innerHTML = "";

  if (!items.length) {
    results.innerHTML = `
      <div class="empty">
        No ${escapeHTML(type)}
        results were returned.
      </div>
    `;

    return;
  }

  results.innerHTML = `
    <div class="media-grid">

      ${items
        .map(
          (item) => `
            <a
              class="media-card"
              href="${escapeAttribute(
                item.url || "#"
              )}"
              target="_blank"
              rel="noopener noreferrer"
            >

              ${
                item.image
                  ? `
                    <img
                      src="${escapeAttribute(
                        item.image
                      )}"
                      alt=""
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    >
                  `
                  : `
                    <div class="media-placeholder"></div>
                  `
              }

              <div class="media-info">

                <strong>
                  ${escapeHTML(
                    item.title ||
                    "Untitled"
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    item.source ||
                    item.snippet ||
                    ""
                  )}
                </span>

              </div>

            </a>
          `
        )
        .join("")}

    </div>
  `;
}

/* =========================================
   PAGINATION
========================================= */

function renderPagination(currentPage) {
  const page =
    Number(currentPage) || 1;

  const pages = [];

  const start =
    Math.max(1, page - 2);

  const end =
    Math.min(20, page + 2);

  for (
    let current = start;
    current <= end;
    current++
  ) {
    pages.push(current);
  }

  pagination.innerHTML = `
    <button
      class="page-btn"
      type="button"
      data-page="${page - 1}"
      ${page === 1 ? "disabled" : ""}
      aria-label="Previous page"
    >
      ‹
    </button>

    ${pages
      .map(
        (number) => `
          <button
            class="page-btn ${
              number === page
                ? "active"
                : ""
            }"
            type="button"
            data-page="${number}"
            aria-label="Page ${number}"
            ${
              number === page
                ? 'aria-current="page"'
                : ""
            }
          >
            ${number}
          </button>
        `
      )
      .join("")}

    <button
      class="page-btn"
      type="button"
      data-page="${page + 1}"
      aria-label="Next page"
    >
      ›
    </button>
  `;

  $$(".page-btn", pagination).forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          if (button.disabled) {
            return;
          }

          const nextPage =
            Number(
              button.dataset.page
            );

          if (
            !Number.isFinite(nextPage) ||
            nextPage < 1 ||
            nextPage > 20
          ) {
            return;
          }

          runSearch(
            state.query,
            nextPage,
            state.type
          );
        }
      );
    }
  );
}

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener(
  "keydown",
  (event) => {
    const target =
      event.target;

    const isTyping =
      target instanceof
        HTMLInputElement ||
      target instanceof
        HTMLTextAreaElement;

    /*
      /
      Focus search.
    */
    if (
      event.key === "/" &&
      !isTyping &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();

      if (searchView.hidden) {
        homeInput.focus();
      } else {
        resultsInput.focus();
      }
    }

    /*
      Escape closes autocomplete.
    */
    if (
      event.key === "Escape"
    ) {
      closeAllSuggestions();
    }
  }
);

/* =========================================
   LINK / HISTORY BEHAVIOR
========================================= */

window.addEventListener(
  "popstate",
  () => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const query =
      params.get("q");

    if (!query) {
      return;
    }

    const page =
      Number(
        params.get("page") || "1"
      );

    const type =
      params.get("type") || "web";

    runSearch(
      query,
      page,
      type
    );
  }
);

function updateURL(
  query,
  page,
  type
) {
  const params =
    new URLSearchParams();

  params.set(
    "q",
    query
  );

  params.set(
    "page",
    String(page)
  );

  params.set(
    "type",
    type
  );

  const url =
    `${window.location.pathname}?${params.toString()}`;

  window.history.replaceState(
    {
      query,
      page,
      type
    },
    "",
    url
  );
}

/*
  Keep URL state synchronized.
  Wrapped so normal searching doesn't
  require the user to reload.
*/
const originalRunSearch =
  runSearch;

runSearch = async function (
  query,
  page = 1,
  type = "web"
) {
  const cleaned =
    String(query || "").trim();

  if (!cleaned) {
    return;
  }

  updateURL(
    cleaned,
    page,
    type
  );

  return originalRunSearch(
    cleaned,
    page,
    type
  );
};

/* =========================================
   INITIAL URL
========================================= */

(() => {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const query =
    params.get("q");

  if (!query) {
    return;
  }

  const page =
    Number(
      params.get("page") || "1"
    );

  const type =
    params.get("type") || "web";

  runSearch(
    query,
    page,
    type
  );
})();
