function setup() {
  const allEpisodes = getAllEpisodes(); // provided by episodes.js
  makePageForEpisodes(allEpisodes);
}

function formatEpisodeCode(season, number) {
  // Format like S01E01
  const s = String(season).padStart(2, "0");
  const e = String(number).padStart(2, "0");
  return `S${s}E${e}`;
}

function makeEpisodeCard(episode) {
  // Destructure the values we need
  const { name, season, number, image, summary, runtime, airdate } = episode;

  // Create article (semantic)
  const article = document.createElement("article");
  article.className = "episode";
  article.setAttribute("tabindex", "0"); // make focusable for keyboard users
  article.setAttribute("aria-labelledby", `title-${season}-${number}`);

  // Header with title and meta
  const header = document.createElement("header");
  header.className = "episode-header";

  const h2 = document.createElement("h2");
  h2.id = `title-${season}-${number}`;
  h2.textContent = `${formatEpisodeCode(season, number)} - ${name}`;
  header.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "episode-meta";
  meta.textContent = `Airdate: ${airdate || "Unknown"} • Runtime: ${
    runtime ? runtime + " min" : "Unknown"
  }`;
  header.appendChild(meta);

  article.appendChild(header);

  // Image (if provided) with accessible alt text
  if (image && image.medium) {
    const img = document.createElement("img");
    img.src = image.medium;
    img.alt = `${name} (Season ${season} Episode ${number})`;
    img.loading = "lazy";
    img.className = "episode-image";
    article.appendChild(img);
  }

  // Summary: the API summary contains HTML; preserve it but ensure it's safe

  const summarySection = document.createElement("section");
  summarySection.className = "episode-summary";
  summarySection.innerHTML = summary || "<p>No summary available.</p>";
  article.appendChild(summarySection);

  return article;
}

function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  // clear previous content
  rootElem.innerHTML = "";

  // Top heading and count (semantic)
  const main = document.createElement("main");
  main.className = "site-main";

  const heading = document.createElement("h1");
  heading.textContent = "TV Show Episodes";
  main.appendChild(heading);

  const count = document.createElement("p");
  count.className = "episode-count";
  count.textContent = `Showing ${episodeList.length} episode(s)`;
  main.appendChild(count);

  // Container for episodes
  const list = document.createElement("section");
  list.className = "episode-grid";
  list.setAttribute("aria-label", "Episodes list");

  // Create and append each episode card
  episodeList.forEach((ep) => {
    const card = makeEpisodeCard(ep);
    list.appendChild(card);
  });

  main.appendChild(list);
  rootElem.appendChild(main);
}

window.onload = setup;
