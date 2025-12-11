// --- Global data (filled AFTER fetch) ---
let allEpisodes = [];

// --- DOM references / build UI ---
const root = document.getElementById("root");

// Build header
const header = document.createElement("header");
const title = document.createElement("h1");
title.textContent = "TV Show Episodes";
title.id = "pageTitle";

// Controls container
const controls = document.createElement("div");
controls.className = "controls";

// --- Show selector dropdown ---
const showSelect = document.createElement("select");
showSelect.id = "showSelect";
showSelect.setAttribute("aria-label", "Select show");
showSelect.disabled = true; // disabled until shows are loaded

// Search bar
let searchBar = document.createElement("input");
searchBar.type = "search";
searchBar.placeholder = "Search episodes...";
searchBar.id = "searchBar";
searchBar.setAttribute("aria-label", "Search episodes");
searchBar.disabled = true; // disabled until data loaded

// Episode dropdown
let episodeSelect = document.createElement("select");
episodeSelect.id = "episodeSelect";
episodeSelect.setAttribute("aria-label", "Select episode");
episodeSelect.disabled = true; // disabled until data loaded

// Episode count label
const countLabel = document.createElement("span");
countLabel.className = "episode-count";
countLabel.setAttribute("aria-live", "polite"); // announce changes

// Append controls: showSelect first
controls.appendChild(showSelect);
controls.appendChild(searchBar);
controls.appendChild(episodeSelect);
controls.appendChild(countLabel);

header.appendChild(title);
header.appendChild(controls);
root.appendChild(header);

// Container for episodes and loading/error
const episodeContainer = document.createElement("section");
episodeContainer.id = "episodes";
root.appendChild(episodeContainer);

// Utility: format SxxExx
function formatCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(
    2,
    "0",
  )}`;
}

// Utility: safe text extractor (summary may be null and may contain HTML)
function extractSummaryText(summaryHtml) {
  if (!summaryHtml) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = summaryHtml;
  return tmp.textContent || tmp.innerText || "";
}

// --- Show loading UI (visible) ---
function showLoadingUI() {
  // disable controls while loading
  searchBar.disabled = true;
  episodeSelect.disabled = true;
  showSelect.disabled = true;

  episodeContainer.innerHTML = "";
  const loading = document.createElement("div");
  loading.setAttribute("role", "status");
  loading.className = "loading";
  loading.innerHTML = `<p>Loading episodes… please wait.</p>`;
  episodeContainer.appendChild(loading);
}

// --- Show error UI with Retry ---
function showErrorUI(
  message = "Failed to load episodes. Please check your connection.",
) {
  episodeContainer.innerHTML = "";
  const err = document.createElement("div");
  err.className = "error";
  err.setAttribute("role", "alert");
  err.innerHTML = `<p>${message}</p>`;

  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.textContent = "Retry";
  retryBtn.addEventListener("click", () => {
    fetchAndInit();
  });

  err.appendChild(retryBtn);
  episodeContainer.appendChild(err);

  // keep controls disabled
  searchBar.disabled = true;
  episodeSelect.disabled = true;
  showSelect.disabled = true;
}

// --- Fetch all shows once ---
async function fetchAllShows() {
  const url = "https://api.tvmaze.com/shows";
  const shows = await APICache.fetch(url); // cached if previously fetched
  // sort alphabetically, case-insensitive
  shows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return shows;
}

// --- Populate show dropdown ---
function populateShowDropdown(shows) {
  showSelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Select a show";
  showSelect.appendChild(defaultOpt);

  shows.forEach((show) => {
    const opt = document.createElement("option");
    opt.value = show.id; // store show ID
    opt.textContent = show.name;
    showSelect.appendChild(opt);
  });

  showSelect.disabled = false; // enable now that data is ready
}

// --- Fetch episodes for a specific show ---
async function fetchEpisodesByShow(showId) {
  const url = `https://api.tvmaze.com/shows/${showId}/episodes`;
  const episodes = await APICache.fetch(url);
  return episodes;
}

// --- Fetch shows and first show's episodes, then init UI ---
async function fetchAndInit() {
  showLoadingUI();
  try {
    const shows = await fetchAllShows();
    populateShowDropdown(shows);

    // Select first show by default
    if (shows.length > 0) {
      const firstShow = shows[0];
      showSelect.value = firstShow.id;
      const episodes = await fetchEpisodesByShow(firstShow.id);
      allEpisodes = episodes;
      initUIWithData(allEpisodes);
    }
  } catch (err) {
    console.error("Failed to load shows or episodes:", err);
    showErrorUI("❌ Failed to load shows. Please refresh or try Retry.");
  }
}

// --- Initialize controls and rendering once we have data ---
function initUIWithData(episodes) {
  // populate episode dropdown
  makeEpisodeDropdown(episodes);

  // enable controls
  searchBar.disabled = false;
  episodeSelect.disabled = false;
  showSelect.disabled = false;

  // render all episodes
  renderEpisodes(episodes);
  updateCount(episodes.length);

  // Remove previous event listeners by replacing nodes
  const newSearchBar = searchBar.cloneNode(true);
  searchBar.parentNode.replaceChild(newSearchBar, searchBar);
  searchBar = newSearchBar;

  const newEpisodeSelect = episodeSelect.cloneNode(true);
  episodeSelect.parentNode.replaceChild(newEpisodeSelect, episodeSelect);
  episodeSelect = newEpisodeSelect;

  // Search handler (debounced)
  let timer = null;
  searchBar.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => applyFilters(), 180);
  });

  // Episode select handler
  episodeSelect.addEventListener("change", () => applyFilters());
}

// --- Apply filters using cached allEpisodes ---
function applyFilters() {
  if (!Array.isArray(allEpisodes)) return;

  const q = (searchBar.value || "").trim().toLowerCase();
  const selectedVal = episodeSelect.value;

  let results = allEpisodes;

  // If a specific episode selected
  if (selectedVal && selectedVal !== "all") {
    const found = allEpisodes.find(
      (ep) => String(ep.id) === String(selectedVal),
    );
    if (!found) {
      renderNoResults();
      updateCount(0);
      return;
    }
    results = [found];
    renderEpisodes(results);
    updateCount(1);
    return;
  }

  // Otherwise filter by query (title, summary text, or code)
  if (q) {
    results = allEpisodes.filter((ep) => {
      const title = (ep.name || "").toLowerCase();
      const summaryText = extractSummaryText(ep.summary).toLowerCase();
      const code = formatCode(ep.season, ep.number).toLowerCase();
      return title.includes(q) || summaryText.includes(q) || code.includes(q);
    });
  }

  if (results.length === 0) {
    renderNoResults();
  } else {
    renderEpisodes(results);
  }
  updateCount(results.length);
}

// --- Render "no results" message ---
function renderNoResults() {
  episodeContainer.innerHTML = `<p>No episodes found.</p>`;
}

// --- Render episode cards ---
function renderEpisodes(list) {
  episodeContainer.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "episode-grid";

  list.forEach((ep) => {
    const card = document.createElement("article");
    card.className = "episode";
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-labelledby", `title-${ep.id}`);
    card.dataset.episodeId = ep.id;

    const header = document.createElement("header");
    header.className = "episode-header";

    const h2 = document.createElement("h2");
    h2.id = `title-${ep.id}`;
    h2.textContent = `${formatCode(ep.season, ep.number)} - ${
      ep.name || "Untitled"
    }`;
    header.appendChild(h2);

    const meta = document.createElement("p");
    meta.className = "episode-meta";
    meta.textContent = `Airdate: ${ep.airdate || "Unknown"} • Runtime: ${
      ep.runtime ? ep.runtime + " min" : "Unknown"
    }`;
    header.appendChild(meta);

    card.appendChild(header);

    if (ep.image && (ep.image.medium || ep.image.original)) {
      const img = document.createElement("img");
      img.className = "episode-image";
      img.src = ep.image.medium || ep.image.original;
      img.alt = `${ep.name || "Episode image"}`;
      img.loading = "lazy";
      card.appendChild(img);
    }

    const summarySection = document.createElement("section");
    summarySection.className = "episode-summary";
    summarySection.setAttribute("aria-label", "Episode summary");
    summarySection.innerHTML = ep.summary || "<p>No summary available.</p>";
    card.appendChild(summarySection);

    grid.appendChild(card);
  });

  episodeContainer.appendChild(grid);
}

// --- Build episode dropdown ---
function makeEpisodeDropdown(episodes) {
  episodeSelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "all";
  defaultOpt.textContent = "All Episodes";
  episodeSelect.appendChild(defaultOpt);

  episodes.forEach((ep) => {
    const opt = document.createElement("option");
    opt.value = ep.id;
    opt.textContent = `${formatCode(ep.season, ep.number)} - ${
      ep.name || "Untitled"
    }`;
    episodeSelect.appendChild(opt);
  });
}

// --- Update visible count label ---
function updateCount(n) {
  countLabel.textContent = `Showing ${n} episode(s)`;
}

// --- Handle show selection ---
showSelect.addEventListener("change", async () => {
  const showId = showSelect.value;
  if (!showId) return;

  showLoadingUI();

  try {
    const episodes = await fetchEpisodesByShow(showId);
    allEpisodes = episodes;
    initUIWithData(allEpisodes); // ensures search & episode select work for new show
  } catch (err) {
    console.error("Failed to load episodes for selected show:", err);
    showErrorUI("❌ Failed to load episodes for this show. Please try again.");
  }
});

// --- Start app ---
fetchAndInit();
