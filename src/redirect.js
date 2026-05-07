// Season-aware landing redirect.
// April–May → siika · June–August → pohjaonki · otherwise → rantakalastus.
(function () {
  var m = new Date().getMonth() + 1;
  var target;
  if (m === 4 || m === 5)       target = "siika.html";
  else if (m >= 6 && m <= 8)    target = "pohjaonki.html";
  else                          target = "rantakalastus.html";
  location.replace(target);
})();
