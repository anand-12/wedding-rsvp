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
