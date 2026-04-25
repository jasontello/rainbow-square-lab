const orb = document.getElementById("rainbow-orb");
const orbShell = document.getElementById("orb-shell");
const toolSelector = document.querySelector(".tool-selector");
const toolSelectorIcon = document.querySelector(".tool-selector img");
const toolSelectorLine = document.querySelector(".tool-selector__line");

const ORB_SIZE = 31;
const ORB_CENTER = (ORB_SIZE - 1) / 2;
const ORB_RADIUS = 14.4;
const BASE_COLORS = [
    "#36abe1",
    "#2fa8d4",
    "#8a2387",
    "#d4148e",
    "#e6161e",
    "#f7a42b",
    "#ffe500",
    "#f8cf24",
    "#93c01f",
    "#36abe1",
    "#931c80",
    "#d4148e",
    "#e6161e",
    "#f7a42b"
];

let animationFrame = null;
let cells = [];

function wrapIndex(index, length) {
    return ((index % length) + length) % length;
}

function mixColor(colorA, colorB, amount) {
    const a = colorA.match(/\w\w/g).map((channel) => parseInt(channel, 16));
    const b = colorB.match(/\w\w/g).map((channel) => parseInt(channel, 16));
    const mixed = a.map((channel, index) => {
        return Math.round(channel + (b[index] - channel) * amount);
    });

    return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function getRainbowColor(x, y, time) {
    const angle = Math.atan2(y - ORB_CENTER, x - ORB_CENTER);
    const wave = Math.sin(time * 0.0012 + x * 0.42 + y * 0.24) * 1.8;
    const orbit = ((angle + Math.PI) / (Math.PI * 2)) * BASE_COLORS.length;
    const colorPosition = orbit + wave;
    const colorIndex = Math.floor(colorPosition);
    const nextIndex = colorIndex + 1;
    const amount = colorPosition - colorIndex;

    return mixColor(
        BASE_COLORS[wrapIndex(colorIndex, BASE_COLORS.length)],
        BASE_COLORS[wrapIndex(nextIndex, BASE_COLORS.length)],
        amount
    );
}

function getStaticRainbowColor(x, y) {
    return getRainbowColor(x, y, 0);
}

function buildOrb() {
    if (!orb) {
        return;
    }

    const fragment = document.createDocumentFragment();
    cells = [];

    for (let y = 0; y < ORB_SIZE; y += 1) {
        for (let x = 0; x < ORB_SIZE; x += 1) {
            const cell = document.createElement("span");
            const distance = Math.hypot(x - ORB_CENTER, y - ORB_CENTER);
            const isInsideOrb = distance <= ORB_RADIUS;

            cell.className = isInsideOrb ? "orb-cell" : "orb-cell is-empty";

            if (isInsideOrb) {
                const edgeFade = Math.max(0.34, 1 - Math.max(0, distance - ORB_RADIUS * 0.74) * 0.12);
                const latitude = Math.cos((y / (ORB_SIZE - 1)) * Math.PI);
                const dotLeft = 50 + (x - ORB_CENTER) * 3.15;
                const dotTop = 50 + (y - ORB_CENTER) * 3.15;

                cell.style.setProperty("--cell-color", getStaticRainbowColor(x, y));
                cell.style.setProperty("--cell-opacity", edgeFade.toFixed(3));
                cell.style.setProperty("--cell-scale", "0.9");
                cell.style.setProperty("--dot-left", `${dotLeft}%`);
                cell.style.setProperty("--dot-top", `${dotTop}%`);

                cells.push({
                    element: cell,
                    x,
                    y,
                    distance,
                    edgeFade,
                    latitude
                });
            }

            fragment.appendChild(cell);
        }
    }

    orb.appendChild(fragment);
}

function animateOrb(time = 0) {
    if (!orb) {
        animationFrame = null;
        return;
    }

    orb.style.setProperty("--orb-rotate", `${Math.sin(time * 0.00025) * 5}deg`);

    cells.forEach((cell) => {
        const longitudeWave = Math.sin(time * 0.0016 + cell.x * 0.6);
        const cloudBand = Math.sin(time * 0.001 + cell.x * 0.32 + cell.y * 0.52);
        const sparkle = Math.sin(time * 0.0022 + cell.distance * 0.9);
        const opacity = Math.max(0.18, Math.min(1, cell.edgeFade * (0.56 + cloudBand * 0.26 + sparkle * 0.12)));
        const scale = 0.72 + Math.max(0, longitudeWave) * 0.42 + Math.abs(cell.latitude) * 0.1;

        cell.element.style.setProperty("--cell-opacity", opacity.toFixed(3));
        cell.element.style.setProperty("--cell-scale", scale.toFixed(3));
    });

    animationFrame = window.requestAnimationFrame(animateOrb);
}

function startOrbAnimation() {
    if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animateOrb);
    }
}

function stopOrbAnimation() {
    if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

function handlePointerMove(event) {
    if (!orbShell) {
        return;
    }

    const rect = orbShell.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    orbShell.style.setProperty("--tilt-y", `${x * 12}deg`);
    orbShell.style.setProperty("--tilt-x", `${y * -12}deg`);
}

function resetTilt() {
    if (!orbShell) {
        return;
    }

    orbShell.style.setProperty("--tilt-x", "0deg");
    orbShell.style.setProperty("--tilt-y", "0deg");
}

function startToolSelectorMotion() {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.gsap || !toolSelector || shouldReduceMotion) {
        return;
    }

    const random = window.gsap.utils.random;

    function driftSelector() {
        window.gsap.to(toolSelector, {
            x: random(-8, 9),
            y: random(-10, 8),
            duration: random(2.4, 4.8),
            ease: "sine.inOut",
            onComplete: driftSelector
        });
    }

    function driftIcon() {
        if (!toolSelectorIcon) {
            return;
        }

        window.gsap.to(toolSelectorIcon, {
            rotation: random(-7, 7),
            scale: random(0.96, 1.06),
            duration: random(2.2, 4.2),
            ease: "sine.inOut",
            onComplete: driftIcon
        });
    }

    if (toolSelectorLine) {
        window.gsap.to(toolSelectorLine, {
            opacity: 0.82,
            backgroundPosition: "100% 50%",
            "--line-scale": 1.08,
            duration: 2.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    driftSelector();
    driftIcon();
}

buildOrb();
startOrbAnimation();
startToolSelectorMotion();

if (orbShell) {
    orbShell.addEventListener("pointermove", handlePointerMove);
    orbShell.addEventListener("pointerleave", resetTilt);
}

window.addEventListener("pagehide", () => {
    stopOrbAnimation();
});
