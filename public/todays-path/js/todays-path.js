
const parts = window.location.pathname.split("/").filter(Boolean);
const token = parts[1];
const day = parseInt(parts[2], 10);

if (!token || !day) {
  showError("Invalid link");
}

fetch(`/api/todays-path?token=${token}&day=${day}`)
  .then(res => res.json())
  .then(data => {
    if (!data.ok) {
      showError(data.message);
      return;
    }

    renderContent(data);

    setupNav(day, data.canGoNext);
  })
  .catch(() => showError("Something went wrong"));

function renderContent(data) {
  document.getElementById("gurbani").innerHTML  = data.snippet;
  document.getElementById("pb").innerHTML  = data.meaning_pb;
  document.getElementById("en").innerHTML  = data.meaning_en;
  document.getElementById("reflection").innerHTML  = data.reflection;
}

function setupNav(day, canGoNext) {
  if (day > 1) {
    document.getElementById("prev").href = `/todays-path/${token}/${day - 1}`;
  }
  if (canGoNext) {
    document.getElementById("next").href = `/todays-path/${token}/${day + 1}`;
  }
}

function showError(msg) {
  document.getElementById("error").innerText = msg;
}
