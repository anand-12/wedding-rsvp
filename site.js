"use strict";

const flightLane = document.querySelector(".flight-lane");
const flamingos = flightLane.querySelector(".flamingo-flight");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let flight;

function canFly() {
  return !reducedMotion.matches && !document.hidden && flightLane.getBoundingClientRect().bottom > 0;
}

function scheduleFlight(delay) {
  setTimeout(() => {
    if (!canFly()) {
      scheduleFlight(6000);
      return;
    }

    const direction = Math.random() < .5 ? 1 : -1;
    const width = flightLane.clientWidth;
    const y = 3 + Math.random() * 13;
    flamingos.removeAttribute("hidden");
    const edge = flamingos.clientWidth + 16;
    const start = direction === 1 ? -edge : width + 16;
    const end = direction === 1 ? width + 16 : -edge;
    const middle = (start + end) / 2;
    flight = flamingos.animate([
      { transform: `translate(${start}px, ${y}px) scaleX(${direction})` },
      { transform: `translate(${middle}px, ${Math.max(0, y - 8)}px) scaleX(${direction})` },
      { transform: `translate(${end}px, ${y + 1}px) scaleX(${direction})` },
    ], { duration: Math.min(6500, 3300 + width * 1.8), easing: "linear" });
    const finish = () => {
      flamingos.setAttribute("hidden", "");
      flight = undefined;
      scheduleFlight(9000 + Math.random() * 16000);
    };
    flight.onfinish = finish;
    flight.oncancel = finish;
  }, delay);
}

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) flight?.cancel();
});
scheduleFlight(1200 + Math.random() * 2200);

const form = document.querySelector("#reply");
const status = document.querySelector("#reply-status");
const endpoint = document.querySelector('meta[name="rsvp-api"]').content.trim();
const requestURL = endpoint ? new URL("/api/rsvp", endpoint).href : "/api/rsvp";

const attendanceFields = form.querySelectorAll("fieldset[data-event]");
function syncGuestDetails(fieldset) {
  const details = fieldset.querySelector(".guest-details");
  const attending = fieldset.querySelector('input[type="radio"]:checked')?.value === "yes";
  details.hidden = !attending;
  for (const input of details.querySelectorAll("input, textarea")) {
    input.disabled = !attending;
    input.required = attending;
  }
}

attendanceFields.forEach(syncGuestDetails);
form.addEventListener("change", event => {
  if (event.target.type === "radio") syncGuestDetails(event.target.closest("fieldset"));
});

function showReplyError(message) {
  status.dataset.error = "";
  status.textContent = message;
  status.focus();
}

let submission = null;
form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  if (button.disabled) return;
  const data = Object.fromEntries(new FormData(form));
  data.household = data.household.trim();
  if (!data.household) {
    showReplyError("Please enter your household name.");
    return;
  }
  for (const [name, label] of [["ceremony", "Kolkata ceremony"], ["reception", "Navi Mumbai reception"]]) {
    const attending = data[name] === "yes";
    const count = attending ? Number(data[name + "Count"]) : 0;
    const guests = attending ? (data[name + "Guests"] || "").trim() : "";
    if (attending && (!Number.isInteger(count) || count < 1 ||
        guests.split("\n").filter(guest => guest.trim()).length !== count)) {
      showReplyError(`For the ${label}, enter one guest name per line so the list matches your headcount.`);
      return;
    }
    data[name + "Count"] = count;
    data[name + "Guests"] = guests;
  }
  data.dietary = data.dietary.trim();
  data.accommodations = data.accommodations.trim();

  const signature = JSON.stringify(data);
  if (submission?.signature !== signature) {
    submission = { signature, id: crypto.randomUUID() };
  }
  button.disabled = true;
  status.removeAttribute("data-error");
  status.textContent = "Sending your reply…";
  try {
    const response = await fetch(requestURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: submission.id }),
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json();
    if (!response.ok || result.saved !== true) {
      throw new Error(result.message || "Your reply didn’t go through. Please try again.");
    }
    form.querySelectorAll("input, textarea, button").forEach(input => { input.disabled = true; });
    status.textContent = "Thank you! We’ve received your RSVP.";
  } catch (error) {
    button.disabled = false;
    status.dataset.error = "";
    status.textContent = error.message === "Failed to fetch" || error instanceof SyntaxError
      ? "We couldn’t reach the RSVP service. Please try again in a moment."
      : error.message;
  }
  status.focus();
});
