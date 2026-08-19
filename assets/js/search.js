(function () {
  "use strict";

  var thisScript = document.currentScript;
  var root = thisScript.src.replace(/\/assets\/js\/search\.js.*$/, "");

  function blogUrl(q) {
    return root + "/blog.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  }

  // Every page has a .search form in the sidebar. Submitting it always
  // redirects to the Writing page with the query, regardless of which
  // page you searched from.
  document.querySelectorAll(".search").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="search"]');
      var q = (input.value || "").trim();
      if (q) window.location.href = blogUrl(q);
    });
  });

  // Only blog.html has these; on every other page this is a no-op.
  var resultsEl = document.getElementById("search-results");
  var statusEl = document.getElementById("search-status");
  var defaultEl = document.getElementById("post-list-default");
  var q = new URLSearchParams(window.location.search).get("q");
  if (!q || !resultsEl) return;

  var input = document.querySelector('.search input[type="search"]');
  if (input) input.value = q;
  if (defaultEl) defaultEl.hidden = true;

  fetch(root + "/search.json")
    .then(function (res) { return res.json(); })
    .then(function (posts) {
      var needle = q.toLowerCase();
      var matches = posts.filter(function (p) {
        return (p.title + " " + p.content).toLowerCase().indexOf(needle) !== -1;
      });
      render(matches);
    })
    .catch(function () {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Search is unavailable right now.";
      }
    });

  function render(matches) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = matches.length
        ? "Results for “" + q + "” (" + matches.length + ")"
        : "No results for “" + q + "”.";
    }
    if (!matches.length) return;

    var posts = matches.filter(function (p) { return p.type !== "project"; });
    var projects = matches.filter(function (p) { return p.type === "project"; });

    var html = "";
    if (posts.length) html += group("Writing", posts);
    if (projects.length) html += group("Projects", projects);
    resultsEl.innerHTML = html;
  }

  function group(label, items) {
    var html = '<h2 class="page-h1">' + label + '</h2><ul class="post-list">';
    items.forEach(function (p) {
      var isProject = p.type === "project";
      var href = isProject ? p.url : root + p.url;
      var target = isProject ? ' target="_blank" rel="noopener"' : "";
      var kind = isProject ? "Project" : "Post";
      html += "<li><a href=\"" + href + "\"" + target + ">" + escapeHtml(p.title) + "</a>" +
        '<span class="post-date">' + kind + " &middot; " + p.date + "</span></li>";
    });
    html += "</ul>";
    return html;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
