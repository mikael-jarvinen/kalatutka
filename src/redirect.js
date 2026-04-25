// Season-aware landing redirect.
// April–May → siika; otherwise → rantakalastus.
(function () {
  var m = new Date().getMonth() + 1;
  var target = (m === 4 || m === 5) ? "siika.html" : "rantakalastus.html";
  location.replace(target);
})();
