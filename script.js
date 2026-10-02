let movies = [];

document.addEventListener("DOMContentLoaded", async function () {
  const $ = id => document.getElementById(id);
  const grid = $("movieGrid");
  const latest = $("latestGrid");

  function movieCard(m) {
    return `<article class="movie-card" onclick="openMovie(${m.id})">
      <div class="poster">
        <img src="${m.poster}" alt="${m.title}" loading="lazy">
        <span class="rating">★ ${m.rating}</span>
        <span class="lang">${m.language}</span>
      </div>
      <div class="card-body">
        <h3>${m.title}</h3>
        <p>${m.year} • ${m.genre}</p>
      </div>
    </article>`;
  }

  function render(list, target) {
    if (!target) return;
    target.innerHTML = list.map(movieCard).join("");
    target.querySelectorAll(".movie-card").forEach((c, i) => {
      setTimeout(() => c.classList.add("show"), i * 45);
    });
  }

  function setupChips(id, key) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = "";
    [...new Set(movies.map(m => m[key]))].forEach(v => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = v;
      b.onclick = () => {
        render(movies.filter(m => m[key] === v), grid);
        $("empty").style.display = "none";
        location.hash = "trending";
        $("trending")?.scrollIntoView({ behavior: "smooth" });
      };
      el.appendChild(b);
    });
  }

  function modal(id, open) {
    const m = $(id);
    if (m) m.classList.toggle("active", open);
  }

  function showHero(i) {
    const m = movies[i];
    if (!m || !$("heroTitle")) return;
    $("heroTitle").textContent = m.title;
    $("heroMeta").innerHTML =
      `<b>★ ${m.rating}</b><span>•</span>${m.year}<span>•</span>${m.genre}<span>•</span>${m.language}`;
    $("heroDesc").textContent = m.description;
    $("heroBackdrop").style.backgroundImage = `url("${m.backdrop}")`;
    document.querySelectorAll(".dot").forEach((d, n) => d.classList.toggle("active", n === i));
    $("heroInfo").onclick = () => openMovie(m.id);
  }

  try {
    const response = await fetch("/.netlify/functions/movies");
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    movies = await response.json();

    if (!Array.isArray(movies)) throw new Error("Invalid movie data");

    if (grid) {
      render(movies, grid);
      $("count").textContent = movies.length + " titles";
    }

    if (latest) {
      render([...movies].sort((a, b) => b.year - a.year).slice(0, 8), latest);
    }

    setupChips("languagesList", "language");
    setupChips("genresList", "genre");

    let featured = 0;
    if ($("heroDots") && movies.length) {
      movies.slice(0, Math.min(5, movies.length)).forEach((_, i) => {
        const d = document.createElement("button");
        d.className = "dot";
        d.onclick = () => {
          featured = i;
          showHero(i);
        };
        $("heroDots").appendChild(d);
      });
      showHero(0);
      setInterval(() => {
        featured = (featured + 1) % Math.min(5, movies.length);
        showHero(featured);
      }, 6000);
    }

    $("menuBtn")?.addEventListener("click", () => $("nav").classList.toggle("open"));
    $("searchBtn")?.addEventListener("click", () => {
      $("searchPanel").classList.toggle("open");
      $("searchInput").focus();
    });

    $("clearSearch")?.addEventListener("click", () => {
      $("searchInput").value = "";
      render(movies, grid);
      $("empty").style.display = "none";
      $("count").textContent = movies.length + " titles";
    });

    $("searchInput")?.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      const found = movies.filter(m =>
        (m.title + " " + m.genre + " " + m.language).toLowerCase().includes(q)
      );
      render(found, grid);
      $("empty").style.display = found.length ? "none" : "block";
      $("count").textContent = found.length + " results";
    });

    $("heroTrailer")?.addEventListener("click", () => modal("trailerModal", true));
    $("closeTrailer")?.addEventListener("click", () => modal("trailerModal", false));
    $("detailTrailer")?.addEventListener("click", () => modal("detailModal", true));
    $("closeDetail")?.addEventListener("click", () => modal("detailModal", false));

    document.querySelectorAll(".modal").forEach(m =>
      m.addEventListener("click", e => {
        if (e.target === m) m.classList.remove("active");
      })
    );

    // Movie detail page
    const id = Number(new URLSearchParams(location.search).get("id"));
    const movie = movies.find(m => m.id === id);

    if (movie && $("title")) {
      document.title = movie.title + " | CineWeb";
      $("title").textContent = movie.title;
      $("poster").src = movie.poster;
      $("poster").alt = movie.title;
      $("meta").innerHTML =
        `<b>★ ${movie.rating}</b><span>•</span>${movie.year}<span>•</span>${movie.genre}<span>•</span>${movie.language}`;
      $("description").textContent = movie.description;
      $("facts").innerHTML =
        `<p><strong>Director</strong> ${movie.director}</p>
         <p><strong>Cast</strong> ${movie.cast}</p>
         <p><strong>Genre</strong> ${movie.genre}</p>
         <p><strong>Language</strong> ${movie.language}</p>`;
      $("detailBackdrop").style.backgroundImage = `url("${movie.backdrop}")`;

      const rel = movies
        .filter(m => m.id !== movie.id && (m.genre === movie.genre || m.language === movie.language))
        .slice(0, 4);
      render(rel, $("related"));

      const key = "cineweb-watchlist";
      let list = JSON.parse(localStorage.getItem(key) || "[]");
      if (list.includes(movie.id)) $("watchlist").textContent = "♥ In Watchlist";

      $("watchlist").onclick = () => {
        list = JSON.parse(localStorage.getItem(key) || "[]");
        if (list.includes(movie.id)) {
          list = list.filter(x => x !== movie.id);
          $("watchlist").textContent = "♡ Add to Watchlist";
        } else {
          list.push(movie.id);
          $("watchlist").textContent = "♥ In Watchlist";
        }
        localStorage.setItem(key, JSON.stringify(list));
      };
    }
  } catch (error) {
    console.error("CineWeb backend error:", error);
    if ($("empty")) {
      $("empty").style.display = "block";
      $("empty").textContent = "Unable to load movies. Please check the backend configuration.";
    }
    if ($("count")) $("count").textContent = "";
  }
});

function openMovie(id) {
  location.href = "movie-details.html?id=" + id;
}
