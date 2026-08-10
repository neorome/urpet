import {
  SEARCH_RADIUS_METERS,
  buildGeocodeUrl,
  buildShelterSearchUrl,
  normalizeCoordinates,
  parseGeocodeResults,
  parseRescueResults
} from "./rescue-search.js?v=20260810h";

const LEAFLET_STYLESHEET = "/vendor/leaflet/leaflet.css?v=1.9.4";
const LEAFLET_SCRIPT = "/vendor/leaflet/leaflet.js?v=1.9.4";
const DISPLAY_LIMIT = 30;

let leafletPromise;

function loadLeaflet() {
  if (!document.querySelector(`link[href="${LEAFLET_STYLESHEET}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_STYLESHEET;
    document.head.append(link);
  }
  leafletPromise ||= new Promise((resolveLeaflet, rejectLeaflet) => {
    if (window.L) {
      resolveLeaflet(window.L);
      return;
    }
    const existing = document.querySelector(`script[src="${LEAFLET_SCRIPT}"]`);
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => resolveLeaflet(window.L), { once: true });
    script.addEventListener("error", () => rejectLeaflet(new Error("The local map library did not load.")), { once: true });
    if (!existing) {
      script.src = LEAFLET_SCRIPT;
      document.head.append(script);
    }
  }).then((leaflet) => {
    if (!leaflet) throw new Error("The local map library did not initialize.");
    leaflet.Icon.Default.imagePath = "/vendor/leaflet/images/";
    return leaflet;
  });
  return leafletPromise;
}

function button(label, className = "") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function textLine(label, value) {
  const paragraph = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  paragraph.append(strong, document.createTextNode(value));
  return paragraph;
}

async function responseJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Map service returned ${response.status}`);
  return response.json();
}

function abortableDelay(milliseconds, signal) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolveDelay, rejectDelay) => {
    const timeout = setTimeout(resolveDelay, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      rejectDelay(new DOMException("The request was cancelled.", "AbortError"));
    }, { once: true });
  });
}

function initRescueFinder() {
  const finder = document.querySelector("#rescue-finder");
  if (!finder) return;

  const useLocation = finder.querySelector("#rescue-use-location");
  const form = finder.querySelector("#rescue-search");
  const locationInput = finder.querySelector("#rescue-location");
  const status = finder.querySelector("#rescue-search-status");
  const choices = finder.querySelector("#rescue-place-choices");
  const results = finder.querySelector("#rescue-results");
  const mapElement = finder.querySelector("#rescue-map");
  const list = finder.querySelector("#rescue-list");
  const count = finder.querySelector("#rescue-result-count");
  const area = finder.querySelector("#rescue-result-area");
  const changeLocation = finder.querySelector("#rescue-change-location");
  let map = null;
  let activeController = null;
  let markerById = new Map();
  let lastProviderRequestAt = 0;

  async function providerJson(url, signal) {
    await abortableDelay(Math.max(0, 1_050 - (Date.now() - lastProviderRequestAt)), signal);
    lastProviderRequestAt = Date.now();
    return responseJson(url, signal);
  }

  function setBusy(isBusy) {
    useLocation.disabled = isBusy;
    form.querySelector("button[type=submit]").disabled = isBusy;
    finder.toggleAttribute("aria-busy", isBusy);
  }

  function clearMap() {
    activeController?.abort();
    activeController = null;
    markerById = new Map();
    if (map) {
      map.remove();
      map = null;
    }
    mapElement.replaceChildren();
    list.replaceChildren();
    results.hidden = true;
  }

  function showChoices(places) {
    choices.replaceChildren();
    const heading = document.createElement("p");
    heading.textContent = "Which place did u mean?";
    const options = document.createElement("div");
    options.className = "rescue-place-options";
    for (const place of places) {
      const choice = button(place.label, "rescue-place-choice");
      choice.addEventListener("click", () => {
        choices.hidden = true;
        searchCoordinates(place, place.label);
      });
      options.append(choice);
    }
    choices.append(heading, options);
    choices.hidden = false;
    options.querySelector("button")?.focus();
  }

  function focusShelter(shelter, row) {
    const marker = markerById.get(shelter.id);
    if (marker && map) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: reduceMotion ? 0 : 0.45 });
      marker.openPopup();
    }
    for (const item of list.children) item.removeAttribute("data-active");
    row.setAttribute("data-active", "");
  }

  function shelterRow(shelter, index) {
    const row = document.createElement("li");
    row.className = "rescue-result-card";
    const heading = document.createElement("div");
    const number = document.createElement("span");
    const name = document.createElement("h4");
    number.textContent = String(index + 1).padStart(2, "0");
    name.textContent = shelter.name;
    heading.append(number, name);
    row.append(heading, textLine("distance", `${shelter.distanceKm.toFixed(1)} km / ${(shelter.distanceKm * 0.621371).toFixed(1)} mi`));
    row.append(textLine("address", shelter.address || "not listed in OpenStreetMap—call before visiting"));
    if (shelter.phone) {
      const phone = document.createElement("a");
      phone.href = `tel:${shelter.phone.replace(/[^+\d]/g, "")}`;
      phone.textContent = shelter.phone;
      const paragraph = document.createElement("p");
      paragraph.append("phone: ", phone);
      row.append(paragraph);
    }
    if (shelter.openingHours) row.append(textLine("mapped hours", shelter.openingHours));
    const actions = document.createElement("div");
    actions.className = "rescue-result-actions";
    const show = button("show on map", "rescue-show-map");
    show.addEventListener("click", () => focusShelter(shelter, row));
    actions.append(show);
    if (shelter.website) {
      const website = document.createElement("a");
      website.href = shelter.website;
      website.target = "_blank";
      website.rel = "noopener noreferrer external";
      website.textContent = "shelter website ↗";
      actions.append(website);
    }
    const osm = document.createElement("a");
    osm.href = shelter.osmUrl;
    osm.target = "_blank";
    osm.rel = "noopener noreferrer external";
    osm.textContent = "map record ↗";
    actions.append(osm);
    row.append(actions);
    return row;
  }

  async function renderMap(origin, shelters) {
    const L = await loadLeaflet();
    map = L.map(mapElement, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([origin.latitude, origin.longitude], 10);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    L.circle([origin.latitude, origin.longitude], {
      radius: SEARCH_RADIUS_METERS,
      color: "#171514",
      weight: 2,
      opacity: 0.55,
      fillColor: "#a9ddff",
      fillOpacity: 0.08
    }).addTo(map);
    L.circleMarker([origin.latitude, origin.longitude], {
      radius: 8,
      color: "#171514",
      weight: 3,
      fillColor: "#ff5b4d",
      fillOpacity: 1
    }).addTo(map).bindTooltip("search center");

    for (const [index, shelter] of shelters.entries()) {
      const marker = L.marker([shelter.latitude, shelter.longitude])
        .addTo(map)
        .bindPopup(`<strong>${String(index + 1).padStart(2, "0")}</strong> ${shelter.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}`);
      marker.on("click", () => {
        const row = list.children[index];
        if (row) {
          for (const item of list.children) item.removeAttribute("data-active");
          row.setAttribute("data-active", "");
          row.scrollIntoView({
            block: "nearest",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
          });
        }
      });
      markerById.set(shelter.id, marker);
    }

    if (shelters.length) {
      const points = [[origin.latitude, origin.longitude], ...shelters.map(({ latitude, longitude }) => [latitude, longitude])];
      map.fitBounds(points, { padding: [28, 28], maxZoom: 12 });
    }
    requestAnimationFrame(() => map.invalidateSize());
  }

  async function searchCoordinates(rawCoordinates, label) {
    const origin = normalizeCoordinates(rawCoordinates.latitude, rawCoordinates.longitude);
    if (!origin) {
      status.textContent = "That location could not be used. Try a town or postal code.";
      return;
    }
    clearMap();
    setBusy(true);
    choices.hidden = true;
    status.textContent = "Checking OpenStreetMap for animal shelters within 50 km (31 mi)…";
    activeController = new AbortController();

    try {
      const providerUrl = buildShelterSearchUrl(origin.latitude, origin.longitude);
      if (!providerUrl) throw new Error("The rounded search area could not be built.");
      const payload = await providerJson(providerUrl, activeController.signal);
      const shelters = parseRescueResults(payload, origin).slice(0, DISPLAY_LIMIT);
      area.textContent = label || "your selected area";
      count.textContent = shelters.length
        ? `${shelters.length} mapped shelter${shelters.length === 1 ? "" : "s"}`
        : "no mapped shelters found";
      for (const [index, shelter] of shelters.entries()) list.append(shelterRow(shelter, index));
      results.hidden = false;
      await renderMap(origin, shelters);
      status.textContent = shelters.length
        ? `Found ${shelters.length} mapped shelter${shelters.length === 1 ? "" : "s"}. Select a list result or marker to compare.`
        : "No animal shelters are mapped here yet. Try another place or use the Petfinder link below.";
      results.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } catch (error) {
      if (error.name === "AbortError") return;
      clearMap();
      status.textContent = "The community map service did not answer. Your location was not saved—please try again in a moment.";
    } finally {
      setBusy(false);
      activeController = null;
    }
  }

  useLocation.addEventListener("click", () => {
    if (!navigator.geolocation) {
      status.textContent = "This browser cannot share a location. Search a town or postal code instead.";
      locationInput.focus();
      return;
    }
    setBusy(true);
    status.textContent = "Waiting for your browser’s location permission…";
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBusy(false);
        searchCoordinates({ latitude: coords.latitude, longitude: coords.longitude }, "near your location");
      },
      (error) => {
        setBusy(false);
        status.textContent = error.code === 1
          ? "Location wasn’t shared. Search a town or postal code instead."
          : "Your browser could not find a location. Search a town or postal code instead.";
        locationInput.focus();
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const url = buildGeocodeUrl(locationInput.value);
    if (!url) {
      status.textContent = "Enter a town, region, or postal code.";
      locationInput.focus();
      return;
    }
    clearMap();
    setBusy(true);
    choices.hidden = true;
    status.textContent = "Finding that place on OpenStreetMap…";
    activeController = new AbortController();
    try {
      const places = parseGeocodeResults(await providerJson(url, activeController.signal));
      if (!places.length) {
        status.textContent = "That place was not found. Add a city, state or region and try again.";
        return;
      }
      if (places.length === 1) {
        await searchCoordinates(places[0], places[0].label);
      } else {
        status.textContent = "Choose the matching place, then ur dog will look for shelters.";
        showChoices(places);
      }
    } catch (error) {
      if (error.name !== "AbortError") status.textContent = "The place search did not answer. Nothing was saved—please try again.";
    } finally {
      setBusy(false);
      activeController = null;
    }
  });

  changeLocation.addEventListener("click", () => {
    resetFinder({ focus: true });
  });

  function resetFinder({ focus = false } = {}) {
    clearMap();
    form.reset();
    choices.replaceChildren();
    choices.hidden = true;
    status.textContent = "Choose a location method when u are ready. ur dog does not save searches.";
    setBusy(false);
    if (focus) locationInput.focus();
  }

  return { reset: resetFinder };
}

export { initRescueFinder, loadLeaflet };
