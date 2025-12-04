// Initial setup runs after the page loads
function setup() {
  const allEpisodes = getAllEpisodes(); // supplied by episodes.js, provides the full episode list
  makePageForEpisodes(allEpisodes); // builds the layout and fills it with episode cards
}

// Formats season and episode into S07E02 format
function formatEpisodeCode(season, number) {
  const s = String(season).padStart(2, "0"); // ensures season has two digits
  const e = String(number).padStart(2, "0"); // ensures episode number has two digits
  return `S${s}E${e}`;
}

// Builds a single episode card element
function makeEpisodeCard(episode) {
  const { name, season, number, image, summary, runtime, airdate } = episode;

  const article = document.createElement("article");
  article.className = "episode"; // card styling
  article.setAttribute("tabindex", "0"); // makes card keyboard accessible
  article.setAttribute("aria-labelledby", `title-${season}-${number}`); // links to title for screen readers

  const header = document.createElement("header");
  header.className = "episode-header";

  const h2 = document.createElement("h2");
  h2.id = `title-${season}-${number}`; // unique id for accessibility
  h2.textContent = `${formatEpisodeCode(season, number)} - ${name}`; // formatted title
  header.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "episode-meta";
  meta.textContent = `Airdate: ${airdate || "Unknown"} • Runtime: ${
    runtime ? runtime + " min" : "Unknown"
  }`; // shows airdate and runtime
  header.appendChild(meta);

  article.appendChild(header);

  // Adds image if available
  if (image && image.medium) {
    const img = document.createElement("img");
    img.src = image.medium; // medium size image
    img.alt = `${name} (Season ${season} Episode ${number})`; // descriptive alt text
    img.loading = "lazy"; // improves performance by delaying load
    img.className = "episode-image";
    article.appendChild(img);
  }

  // Summary section
  const summarySection = document.createElement("section");
  summarySection.className = "episode-summary";
  summarySection.innerHTML = summary || "<p>No summary available.</p>"; // uses provided HTML summary
  article.appendChild(summarySection);

  return article;
}

// Builds the full page layout including header, search, count, and episode grid
function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = ""; // clears previous content

  const main = document.createElement("main");
  main.className = "site-main";

  // Header block that contains both the title and search box
  const headerContainer = document.createElement("div");
  headerContainer.className = "site-header";

  const heading = document.createElement("h1");
  heading.textContent = "TV Show Episodes"; // main page heading
  headerContainer.appendChild(heading);

  // Search input and its label
  const searchContainer = document.createElement("div");
  searchContainer.className = "search-container";

  const searchLabel = document.createElement("label");
  searchLabel.textContent = "Search: "; // visible label text
  searchLabel.setAttribute("for", "search-input"); // connects label to input

  const searchInput = document.createElement("input");
  searchInput.id = "search-input"; // referenced by label
  searchInput.type = "text"; // text search field
  searchInput.placeholder = "Type to search by name or summary"; // hint text for user

  searchLabel.appendChild(searchInput);
  searchContainer.appendChild(searchLabel);

  headerContainer.appendChild(searchContainer);
  main.appendChild(headerContainer);

  // Displays the number of episodes shown vs total
  const count = document.createElement("p");
  count.className = "episode-count";
  count.textContent = `Showing ${episodeList.length} of ${episodeList.length} episodes`; // initial count
  main.appendChild(count);

  // Container for all episode cards
  const list = document.createElement("section");
  list.className = "episode-grid"; // CSS grid for layout
  list.setAttribute("aria-label", "Episodes list");

  // Build each episode card and add to the grid
  episodeList.forEach((ep) => {
    const card = makeEpisodeCard(ep);
    list.appendChild(card);
  });

  main.appendChild(list);
  rootElem.appendChild(main);

  // Live search filter logic
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase(); // lowercased search term
    let matched = 0; // counts visible episodes

    Array.from(list.children).forEach((card, i) => {
      const ep = episodeList[i];
      const isMatch =
        ep.name.toLowerCase().includes(term) ||
        (ep.summary && ep.summary.toLowerCase().includes(term));

      if (isMatch) {
        card.style.display = ""; // keep visible
        matched++;
      } else {
        card.style.display = "none"; // hide non matches
      }
    });

    // Update count to show "X of Y episodes"
    count.textContent = `Showing ${matched} of ${episodeList.length} episodes`;
  });
}

// Runs setup when window loads
window.onload = setup;
