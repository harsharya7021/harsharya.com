    // currently reading: spine → note
    (function () {
      var spines = document.querySelectorAll(".rspine[data-card]");
      var cards = document.querySelectorAll(".reading-card");
      spines.forEach(function (s) {
        s.addEventListener("click", function () {
          var open = document.getElementById(s.getAttribute("data-card"));
          var already = open && open.classList.contains("is-open");
          cards.forEach(function (c) { c.classList.remove("is-open"); });
          if (open && !already) open.classList.add("is-open");
        });
      });
    })();

    // books: cover → note flip
    (function () {
      var covers = document.querySelectorAll(".pbook");
      covers.forEach(function (cv) {
        cv.addEventListener("click", function () {
          var isOpen = cv.classList.contains("is-open");
          covers.forEach(function (c) { c.classList.remove("is-open"); });
          if (!isOpen) cv.classList.add("is-open");
        });
      });
    })();

    // films: row → screen
    (function () {
      var film = document.getElementById("screenFilm");
      var meta = document.getElementById("screenMeta");
      var q = document.getElementById("screenQ");
      document.querySelectorAll("#filmList .film-row").forEach(function (r) {
        r.addEventListener("click", function () {
          film.textContent = r.getAttribute("data-title");
          var rate = r.getAttribute("data-rate");
          meta.innerHTML = r.getAttribute("data-meta") + (rate ? " <strong>" + rate + "</strong>" : "");
          q.textContent = r.getAttribute("data-q") || "";
          document.getElementById("screen").scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    })();
