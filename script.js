const orbCanvas = document.getElementById("rainbow-orb");
const orbContext = orbCanvas?.getContext("2d");
const orbShell = document.getElementById("orb-shell");
const visualStage = document.getElementById("motion");
const toolSelector = document.querySelector(".tool-selector");
const toolSelectorIcon = document.querySelector(".tool-selector img");
const toolConnector = document.querySelector(".tool-connector");
const toolSelectorGlow = toolSelector;

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
let orbCanvasSize = 0;
let orbDevicePixelRatio = 1;

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

function resizeOrbCanvas() {
    if (!orbCanvas || !orbContext) {
        return;
    }

    const rect = orbCanvas.getBoundingClientRect();
    const nextSize = Math.max(1, rect.width);
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    if (nextSize === orbCanvasSize && nextPixelRatio === orbDevicePixelRatio) {
        return;
    }

    orbCanvasSize = nextSize;
    orbDevicePixelRatio = nextPixelRatio;
    orbCanvas.width = Math.round(nextSize * nextPixelRatio);
    orbCanvas.height = Math.round(nextSize * nextPixelRatio);
    orbContext.setTransform(nextPixelRatio, 0, 0, nextPixelRatio, 0, 0);
}

function buildOrb() {
    cells = [];

    for (let y = 0; y < ORB_SIZE; y += 1) {
        for (let x = 0; x < ORB_SIZE; x += 1) {
            const distance = Math.hypot(x - ORB_CENTER, y - ORB_CENTER);
            const isInsideOrb = distance <= ORB_RADIUS;

            if (isInsideOrb) {
                const edgeFade = Math.max(0.34, 1 - Math.max(0, distance - ORB_RADIUS * 0.74) * 0.12);
                const latitude = Math.cos((y / (ORB_SIZE - 1)) * Math.PI);
                const dotLeft = 50 + (x - ORB_CENTER) * 3.15;
                const dotTop = 50 + (y - ORB_CENTER) * 3.15;

                cells.push({
                    x,
                    y,
                    distance,
                    edgeFade,
                    latitude,
                    dotLeft: dotLeft / 100,
                    dotTop: dotTop / 100,
                    color: getStaticRainbowColor(x, y)
                });
            }
        }
    }
}

function animateOrb(time = 0) {
    if (!orbCanvas || !orbContext) {
        animationFrame = null;
        return;
    }

    orbCanvas.style.setProperty("--orb-rotate", `${Math.sin(time * 0.00025) * 5}deg`);
    orbContext.clearRect(0, 0, orbCanvasSize, orbCanvasSize);

    cells.forEach((cell) => {
        const longitudeWave = Math.sin(time * 0.0016 + cell.x * 0.6);
        const cloudBand = Math.sin(time * 0.001 + cell.x * 0.32 + cell.y * 0.52);
        const sparkle = Math.sin(time * 0.0022 + cell.distance * 0.9);
        const opacity = Math.max(0.18, Math.min(1, cell.edgeFade * (0.56 + cloudBand * 0.26 + sparkle * 0.12)));
        const scale = 0.72 + Math.max(0, longitudeWave) * 0.42 + Math.abs(cell.latitude) * 0.1;
        const cellSize = orbCanvasSize * 0.0245 * scale;
        const cellCenterX = orbCanvasSize * cell.dotLeft;
        const cellCenterY = orbCanvasSize * cell.dotTop;

        orbContext.save();
        orbContext.translate(cellCenterX, cellCenterY);
        orbContext.rotate(Math.PI / 4);
        orbContext.globalAlpha = opacity;
        orbContext.fillStyle = cell.color;
        orbContext.fillRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize);
        orbContext.globalAlpha = opacity * 0.32;
        orbContext.strokeStyle = "rgba(24, 23, 19, 0.28)";
        orbContext.lineWidth = 1;
        orbContext.strokeRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize);
        orbContext.restore();
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

function updateToolConnector() {
    if (!visualStage || !orbShell || !toolSelector || !toolConnector) {
        return;
    }

    const stageRect = visualStage.getBoundingClientRect();
    const orbRect = orbShell.getBoundingClientRect();
    const selectorRect = toolSelector.getBoundingClientRect();
    const startX = orbRect.left + orbRect.width * 0.29 - stageRect.left;
    const startY = orbRect.top + orbRect.height * 0.32 - stageRect.top;
    const endX = selectorRect.left + selectorRect.width * 0.72 - stageRect.left;
    const endY = selectorRect.top + selectorRect.height * 0.72 - stageRect.top;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

    toolConnector.style.setProperty("--connector-left", `${startX}px`);
    toolConnector.style.setProperty("--connector-top", `${startY}px`);
    toolConnector.style.setProperty("--connector-length", `${length}px`);
    toolConnector.style.setProperty("--connector-angle", `${angle}deg`);
}

function startToolSelectorMotion() {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.gsap || !toolSelector || shouldReduceMotion) {
        updateToolConnector();
        return;
    }

    const random = window.gsap.utils.random;
    const activeToolAnimations = new Set();
    let toolMotionScale = 1;

    function setToolMotionScale(scale) {
        toolMotionScale = scale;
        activeToolAnimations.forEach((animation) => {
            animation.timeScale(toolMotionScale);
        });
    }

    function toolTo(target, vars) {
        const originalOnComplete = vars.onComplete;
        let tween;

        tween = window.gsap.to(target, {
            ...vars,
            onComplete: () => {
                activeToolAnimations.delete(tween);
                originalOnComplete?.();
            }
        });
        tween.timeScale(toolMotionScale);
        activeToolAnimations.add(tween);

        return tween;
    }

    function toolDelay(delay, callback) {
        let delayedCall;

        delayedCall = window.gsap.delayedCall(delay, () => {
            activeToolAnimations.delete(delayedCall);
            callback();
        });
        delayedCall.timeScale(toolMotionScale);
        activeToolAnimations.add(delayedCall);

        return delayedCall;
    }

    function driftSelector() {
        toolTo(toolSelector, {
            x: random(-52, 34),
            y: random(-42, 28),
            duration: random(3.2, 6.2),
            ease: "sine.inOut",
            onUpdate: updateToolConnector,
            onComplete: driftSelector
        });
    }

    function driftIcon() {
        if (!toolSelectorIcon) {
            return;
        }

        toolTo(toolSelectorIcon, {
            rotation: random(-7, 7),
            duration: random(2.2, 4.2),
            ease: "sine.inOut",
            onUpdate: updateToolConnector,
            onComplete: driftIcon
        });
    }

    function pulseIconSize() {
        if (!toolSelectorIcon) {
            return;
        }

        toolTo(toolSelectorIcon, {
            scale: random(1.06, 1.14),
            duration: random(0.34, 0.72),
            repeat: 1,
            yoyo: true,
            ease: "sine.inOut",
            onUpdate: updateToolConnector,
            onComplete: () => {
                toolDelay(random(1.4, 4.4), pulseIconSize);
            }
        });
    }

    function pulseGlow() {
        if (!toolSelectorGlow) {
            return;
        }

        toolTo(toolSelectorGlow, {
            "--selector-glow-opacity": random(0.12, 0.3),
            duration: random(1.1, 2.4),
            repeat: 1,
            yoyo: true,
            repeatDelay: random(0.05, 0.28),
            ease: "sine.inOut",
            onComplete: () => {
                toolDelay(random(0.35, 1.8), pulseGlow);
            }
        });
    }

    function spinIcon() {
        if (!toolSelectorIcon) {
            return;
        }

        toolTo(toolSelectorIcon, {
            rotation: `+=${random([-360, 360, 540, -540])}`,
            duration: random(0.85, 1.55),
            ease: "power2.inOut",
            onUpdate: updateToolConnector,
            onComplete: () => {
                toolDelay(random(2.2, 6), spinIcon);
            }
        });
    }

    if (toolConnector) {
        toolTo(toolConnector, {
            opacity: 0.82,
            backgroundPosition: "100% 50%",
            duration: 3.4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    driftSelector();
    driftIcon();
    toolDelay(random(0.8, 2.6), pulseIconSize);
    pulseGlow();
    toolDelay(random(1.2, 3.8), spinIcon);
    updateToolConnector();

    toolSelector.addEventListener("pointerenter", () => setToolMotionScale(0.16));
    toolSelector.addEventListener("pointerleave", () => setToolMotionScale(1));
    toolSelector.addEventListener("focus", () => setToolMotionScale(0.16));
    toolSelector.addEventListener("blur", () => setToolMotionScale(1));
}

buildOrb();
resizeOrbCanvas();
startOrbAnimation();
startToolSelectorMotion();

if (orbShell) {
    orbShell.addEventListener("pointermove", handlePointerMove);
    orbShell.addEventListener("pointerleave", resetTilt);
}

window.addEventListener("pagehide", () => {
    stopOrbAnimation();
});

window.addEventListener("resize", () => {
    resizeOrbCanvas();
    updateToolConnector();
});
