const root = document.getElementById("root");

// Simple fetch cache (stores Promises by URL)
const fetchCache = new Map();
function fetchWithCache(url) {
  if (fetchCache.has(url)) return fetchCache.get(url);
  const p = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
  });
  fetchCache.set(url, p);
  return p;
}

/* ---------- Build initial DOM shells ---------- */
function createTopbar() {
  const topbar = document.createElement("div");
  topbar.className = "topbar";

  const left = document.createElement("div");
  left.className = "left-controls";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "TV Shows";
  left.appendChild(title);

  const center = document.createElement("div");
  center.className = "center-controls";

  const filterLabel = document.createElement("div");
  filterLabel.className = "filter-label";
  filterLabel.textContent = "Filtering for";

  const showSearch = document.createElement("input");
  showSearch.type = "search";
  showSearch.placeholder = "Search shows by name, genre, summary...";
  showSearch.className = "input";
  showSearch.id = "show-search";

  const resultsCount = document.createElement("div");
  resultsCount.className = "results-count";
  resultsCount.textContent = "";

  center.appendChild(filterLabel);
  center.appendChild(showSearch);
  center.appendChild(resultsCount);

  const right = document.createElement("div");
  right.className = "right-controls";

  const showSelect = document.createElement("select");
  showSelect.className = "input show-select";
  showSelect.id = "show-select";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "none";
  defaultOpt.textContent = "Select a show...";
  showSelect.appendChild(defaultOpt);

  // Back link (hidden by default)
  const backLink = document.createElement("button");
  backLink.className = "input";
  backLink.style.cursor = "pointer";
  backLink.id = "back-to-shows";
  backLink.textContent = "← Back to shows";
  backLink.hidden = true;

  right.appendChild(showSelect);
  right.appendChild(backLink);

  topbar.appendChild(left);
  topbar.appendChild(center);
  topbar.appendChild(right);

  // when user picks from select, open that show
  showSelect.addEventListener("change", (e) => {
    if (!e.target.value || e.target.value === "none") return;
    const id = Number(e.target.value);
    const s = allShows && allShows.find((x) => Number(x.id) === id);
    if (s) openShowEpisodes(s);
  });

  return {
    topbar,
    showSearch,
    backLink,
    titleEl: title,
    resultsCountEl: resultsCount,
    showSelect,
  };
}

/* ---------- Views containers ---------- */
const { topbar, showSearch, backLink, titleEl, resultsCountEl, showSelect } =
  createTopbar();
root.appendChild(topbar);

const showsContainer = document.createElement("main");
showsContainer.id = "shows-listing";
root.appendChild(showsContainer);

const episodesView = document.createElement("section");
episodesView.id = "episodes-view";
episodesView.hidden = true;
root.appendChild(episodesView);

/* episodes toolbar elements (created but hidden until a show is selected) */
const episodesToolbar = document.createElement("div");
episodesToolbar.className = "episodes-toolbar";

const epTitle = document.createElement("div");
epTitle.style.fontWeight = 600;

const epSelect = document.createElement("select");
epSelect.className = "input";
epSelect.id = "episode-select";
epSelect.disabled = true;

const epSearch = document.createElement("input");
epSearch.type = "search";
epSearch.placeholder = "Search episodes (name or summary)";
epSearch.className = "input";
epSearch.id = "episode-search";
epSearch.disabled = true;

const epCount = document.createElement("div");
epCount.className = "input";
epCount.style.background = "transparent";
epCount.style.border = "none";
epCount.style.pointerEvents = "none";

episodesToolbar.appendChild(epTitle);
episodesToolbar.appendChild(epSelect);
episodesToolbar.appendChild(epSearch);
episodesToolbar.appendChild(epCount);
episodesView.appendChild(episodesToolbar);

const episodesContainer = document.createElement("div");
episodesContainer.id = "episodes-container";
episodesView.appendChild(episodesContainer);

/* ---------- Helper utilities ---------- */
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}
function formatCode(season, number) {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(
    2,
    "0"
  )}`;
}

/* ---------- Show listing logic ---------- */
let allShows = []; // cached shows array (from /shows)
let currentShow = null;
let currentShowEpisodes = []; // episodes for currently selected show

function renderShows(shows) {
  showsContainer.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "shows-grid";

  const template = document.getElementById("show-card-template");

  for (const s of shows) {
    const node = template.content.cloneNode(true);
    const article = node.querySelector(".show-card");
    const img = article.querySelector(".show-image");
    const title = article.querySelector(".show-title");
    const meta = article.querySelector(".show-meta");
    const summary = article.querySelector(".show-summary");
    const stats = article.querySelector(".show-stats");

    // image (if available)
    if (s.image && (s.image.medium || s.image.original)) {
      img.src = s.image.medium || s.image.original;
      img.alt = `${s.name} poster`;
    } else {
      img.removeAttribute("src");
      img.alt = "No image";
      img.style.opacity = "0.6";
    }

    title.textContent = s.name || "Untitled";
    // clicking title opens episodes for that show
    title.addEventListener("click", () => openShowEpisodes(s));

    meta.textContent = `${(s.genres || []).join(", ") || "Genres unknown"} • ${
      s.status || "Status unknown"
    }`;
    summary.innerHTML = s.summary || "<p>No summary available.</p>";
    const rating = s.rating && s.rating.average ? s.rating.average : "N/A";
    const runtime = s.runtime ? `${s.runtime} min` : "N/A";
    const genres = (s.genres || []).length
      ? (s.genres || []).join(" | ")
      : "Genres unknown";
    const status = s.status || "Status unknown";
    stats.innerHTML = `
      <div><b>Rated: </b>${rating}</div>
      <div><b>Genres: </b>${genres}</div>
      <div><b>Status: </b>${status}</div>
      <div><b>Runtime: </b>${runtime}</div>
    `;

    grid.appendChild(node);
  }

  showsContainer.appendChild(grid);
}

/* ---------- Shows fetching / init ---------- */
async function loadShowsList() {
  const url = "https://api.tvmaze.com/shows";
  try {
    const shows = await fetchWithCache(url);
    // sort case-insensitive alphabetical
    shows.sort((a, b) =>
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
    );
    allShows = shows;
    renderShows(allShows);
    // populate results count and topbar select
    if (resultsCountEl)
      resultsCountEl.textContent = `found ${allShows.length} shows`;
    if (showSelect) {
      // keep first option as 'none' placeholder
      showSelect.innerHTML = "";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "none";
      defaultOpt.textContent = "Select a show...";
      showSelect.appendChild(defaultOpt);
      for (const s of allShows) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name || "Untitled";
        showSelect.appendChild(opt);
      }
    }
  } catch (err) {
    console.error("Failed to load shows", err);
    showsContainer.innerHTML = `<p>Failed to load shows. Try refreshing.</p>`;
  }
}

/* ---------- Show search (name/genres/summary) ---------- */
function applyShowSearch(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) {
    renderShows(allShows);
    if (resultsCountEl)
      resultsCountEl.textContent = `found ${allShows.length} shows`;
    return;
  }
  const filtered = allShows.filter((s) => {
    const name = (s.name || "").toLowerCase();
    const genres = (s.genres || []).join(" ").toLowerCase();
    const summary = stripHtml(s.summary || "").toLowerCase();
    return name.includes(q) || genres.includes(q) || summary.includes(q);
  });
  renderShows(filtered);
  if (resultsCountEl)
    resultsCountEl.textContent = `found ${filtered.length} shows`;
}

/* ---------- Episodes view: load and render for a show ---------- */
async function openShowEpisodes(showObj) {
  // switch UI
  currentShow = showObj;
  showsContainer.hidden = true;
  episodesView.hidden = false;
  backLink.hidden = false;
  titleEl.textContent = currentShow.name;

  // set header title text for episodes toolbar
  epTitle.textContent = `${currentShow.name} — Episodes`;

  // ensure episodes toolbar inputs enabled after loading
  epSelect.disabled = true;
  epSearch.disabled = true;
  epCount.textContent = "Loading…";

  const epUrl = `https://api.tvmaze.com/shows/${currentShow.id}/episodes`;
  try {
    const episodes = await fetchWithCache(epUrl);
    currentShowEpisodes = Array.isArray(episodes) ? episodes.slice() : [];
    populateEpisodeSelect(currentShowEpisodes);
    renderEpisodesList(currentShowEpisodes);
    epCount.textContent = `Showing ${currentShowEpisodes.length} / ${currentShowEpisodes.length} episodes`;
    epSelect.disabled = false;
    epSearch.disabled = false;
    // reset search value
    epSearch.value = "";
  } catch (err) {
    console.error("Failed to load episodes for show", err);
    episodesContainer.innerHTML = `<p>Failed to load episodes for this show.</p>`;
    epCount.textContent = "";
  }
}

function populateEpisodeSelect(episodes) {
  epSelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "all";
  defaultOpt.textContent = "All episodes";
  epSelect.appendChild(defaultOpt);

  for (const ep of episodes) {
    const opt = document.createElement("option");
    opt.value = ep.id;
    opt.textContent = `${formatCode(ep.season, ep.number)} — ${ep.name}`;
    epSelect.appendChild(opt);
  }
}

function renderEpisodesList(episodes, highlightTerm = "") {
  episodesContainer.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "episodes-grid";

  const tmpl = document.getElementById("episode-card-template");
  for (const ep of episodes) {
    const node = tmpl.content.cloneNode(true);
    const art = node.querySelector(".episode-card");
    const titleEl = art.querySelector(".episode-title");
    const metaEl = art.querySelector(".episode-meta");
    const img = art.querySelector(".episode-image");
    const summ = art.querySelector(".episode-summary");

    titleEl.textContent = `${formatCode(ep.season, ep.number)} — ${
      ep.name || "Untitled"
    }`;
    metaEl.textContent = `Airdate: ${ep.airdate || "Unknown"} • Runtime: ${
      ep.runtime ? ep.runtime + " min" : "Unknown"
    }`;

    if (ep.image && (ep.image.medium || ep.image.original)) {
      img.src = ep.image.medium || ep.image.original;
      img.alt = `${ep.name} image`;
    } else {
      img.removeAttribute("src");
      img.alt = "No image";
      img.style.opacity = "0.6";
    }

    summ.innerHTML = ep.summary || "<p>No summary available.</p>";

    grid.appendChild(node);
  }
  episodesContainer.appendChild(grid);
}

/* episode search & select handlers */
function applyEpisodeFilters() {
  const q = (epSearch.value || "").trim().toLowerCase();
  const selected = epSelect.value;
  if (selected && selected !== "all") {
    const found = currentShowEpisodes.find(
      (e) => String(e.id) === String(selected)
    );
    if (!found) {
      episodesContainer.innerHTML = `<p>No episode found.</p>`;
      epCount.textContent = "Showing 0";
      return;
    }
    renderEpisodesList([found]);
    epCount.textContent = `Showing 1 / ${currentShowEpisodes.length}`;
    return;
  }

  let results = currentShowEpisodes;
  if (q) {
    results = currentShowEpisodes.filter((ep) => {
      const title = (ep.name || "").toLowerCase();
      const summary = stripHtml(ep.summary || "").toLowerCase();
      const code = formatCode(ep.season, ep.number).toLowerCase();
      return title.includes(q) || summary.includes(q) || code.includes(q);
    });
  }
  if (results.length === 0)
    episodesContainer.innerHTML = `<p>No episodes match your search.</p>`;
  else renderEpisodesList(results);
  epCount.textContent = `Showing ${results.length} / ${currentShowEpisodes.length}`;
}

/* ---------- Back link handler ---------- */
backLink.addEventListener("click", () => {
  // show shows listing again
  episodesView.hidden = true;
  showsContainer.hidden = false;
  backLink.hidden = true;
  titleEl.textContent = "TV Shows";
  // reset episodes UI
  episodesContainer.innerHTML = "";
});

/* ---------- Event wiring (search) ---------- */
// Show search (debounced)
let showSearchTimer = null;
showSearch.addEventListener("input", (e) => {
  clearTimeout(showSearchTimer);
  showSearchTimer = setTimeout(() => applyShowSearch(e.target.value), 160);
});

// Episode controls
epSearch.addEventListener("input", () => {
  // simple immediate filtering
  applyEpisodeFilters();
});
epSelect.addEventListener("change", () => applyEpisodeFilters());

/* ---------- Initialize app (load shows listing) ---------- */
loadShowsList();
