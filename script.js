const orbCanvas = document.getElementById("rainbow-orb");
const orbContext = orbCanvas?.getContext("2d");
const colorWheel = document.getElementById("color-wheel");
const orbShell = document.getElementById("orb-shell");
const visualStage = document.getElementById("motion");
const toolSelectors = Array.from(document.querySelectorAll(".tool-selector"));
const colorToolSelector = document.querySelector(".tool-selector--color");
const toolSelectorIcons = Array.from(document.querySelectorAll(".tool-selector img"));
const toolConnectors = Array.from(document.querySelectorAll(".tool-connector"));
const toolIntro = document.getElementById("tool-intro");
const startExploringButton = document.getElementById("start-exploring-btn");
const toolBackButton = document.getElementById("tool-back-btn");
const selectedColorSphere = document.getElementById("selected-color-sphere");
const selectedColorLabel = document.getElementById("selected-color-label");
const selectedRed = document.getElementById("selected-r");
const selectedGreen = document.getElementById("selected-g");
const selectedBlue = document.getElementById("selected-b");
const selectedAlpha = document.getElementById("selected-a");
const selectedCyan = document.getElementById("selected-c");
const selectedMagenta = document.getElementById("selected-m");
const selectedYellow = document.getElementById("selected-y");
const selectedBlack = document.getElementById("selected-k");
const colorWheelMarker = document.getElementById("color-wheel-marker");

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
let selectedColor = null;
let isDraggingColorWheel = false;
let markerHideTimeout = null;
let hasSeenToolIntro = false;

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

function hslToRgb(hue, saturation, lightness) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
    let red = 0;
    let green = 0;
    let blue = 0;

    if (huePrime >= 0 && huePrime < 1) {
        red = chroma;
        green = x;
    } else if (huePrime >= 1 && huePrime < 2) {
        red = x;
        green = chroma;
    } else if (huePrime >= 2 && huePrime < 3) {
        green = chroma;
        blue = x;
    } else if (huePrime >= 3 && huePrime < 4) {
        green = x;
        blue = chroma;
    } else if (huePrime >= 4 && huePrime < 5) {
        red = x;
        blue = chroma;
    } else {
        red = chroma;
        blue = x;
    }

    const match = lightness - chroma / 2;

    return [
        Math.round((red + match) * 255),
        Math.round((green + match) * 255),
        Math.round((blue + match) * 255)
    ];
}

function getWheelWhiteOverlayAmount(saturation) {
    if (saturation <= 0.04) {
        return 1;
    }

    if (saturation <= 0.1) {
        return 1 - ((saturation - 0.04) / 0.06) * 0.1;
    }

    if (saturation <= 0.56) {
        return 0.9 - ((saturation - 0.1) / 0.46) * 0.85;
    }

    if (saturation <= 0.72) {
        return 0.05 - ((saturation - 0.56) / 0.16) * 0.05;
    }

    return 0;
}

function getColorWheelRgb(hue, saturation) {
    const baseColor = hslToRgb(hue, 1, 0.5);
    const whiteAmount = getWheelWhiteOverlayAmount(saturation);

    return baseColor.map((channel) => {
        return Math.round(channel + (255 - channel) * whiteAmount);
    });
}

function rgbToHex(red, green, blue) {
    return `#${[red, green, blue].map((channel) => {
        return channel.toString(16).padStart(2, "0");
    }).join("")}`.toUpperCase();
}

function hexToRgb(hexColor) {
    const cleanHex = hexColor.replace("#", "");

    return [
        parseInt(cleanHex.slice(0, 2), 16),
        parseInt(cleanHex.slice(2, 4), 16),
        parseInt(cleanHex.slice(4, 6), 16)
    ];
}

function rgbToCmyk(red, green, blue) {
    const normalizedRed = red / 255;
    const normalizedGreen = green / 255;
    const normalizedBlue = blue / 255;
    const black = 1 - Math.max(normalizedRed, normalizedGreen, normalizedBlue);

    if (black === 1) {
        return [0, 0, 0, 100];
    }

    const cyan = (1 - normalizedRed - black) / (1 - black);
    const magenta = (1 - normalizedGreen - black) / (1 - black);
    const yellow = (1 - normalizedBlue - black) / (1 - black);

    return [cyan, magenta, yellow, black].map((channel) => {
        return Math.round(channel * 100);
    });
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

function resizeColorWheelCanvas() {
    if (!colorWheel) {
        return;
    }

    const rect = colorWheel.getBoundingClientRect();
    const nextSize = Math.max(1, Math.round(rect.width));

    colorWheel.width = nextSize;
    colorWheel.height = nextSize;
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

    if (document.body.classList.contains("tool-view-active")) {
        resetTilt();
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

function updateToolConnectorFor(selector, connector) {
    if (!visualStage || !orbShell || !selector || !connector) {
        return;
    }

    const stageRect = visualStage.getBoundingClientRect();
    const orbRect = orbShell.getBoundingClientRect();
    const selectorRect = selector.getBoundingClientRect();
    const orbCenterX = orbRect.left + orbRect.width / 2;
    const orbCenterY = orbRect.top + orbRect.height / 2;
    const selectorCenterX = selectorRect.left + selectorRect.width / 2;
    const selectorCenterY = selectorRect.top + selectorRect.height / 2;
    const directionX = selectorCenterX - orbCenterX;
    const directionY = selectorCenterY - orbCenterY;
    const directionLength = Math.hypot(directionX, directionY) || 1;
    const orbConnectionRadius = orbRect.width * 0.42;
    const startX = orbCenterX + (directionX / directionLength) * orbConnectionRadius - stageRect.left;
    const startY = orbCenterY + (directionY / directionLength) * orbConnectionRadius - stageRect.top;
    const endX = selectorCenterX - stageRect.left;
    const endY = selectorCenterY - stageRect.top;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

    connector.style.setProperty("--connector-left", `${startX}px`);
    connector.style.setProperty("--connector-top", `${startY}px`);
    connector.style.setProperty("--connector-length", `${length}px`);
    connector.style.setProperty("--connector-angle", `${angle}deg`);
}

function updateToolConnector() {
    toolConnectors.forEach((connector) => {
        const toolId = connector.dataset.toolLine;
        const selector = document.querySelector(`[data-tool-id="${toolId}"]`);

        updateToolConnectorFor(selector, connector);
    });
}

function updateSelectedColor(hexColor, rgbChannels = hexToRgb(hexColor)) {
    selectedColor = hexColor;
    const [red, green, blue] = rgbChannels;
    const [cyan, magenta, yellow, black] = rgbToCmyk(red, green, blue);

    if (selectedColorSphere) {
        selectedColorSphere.style.setProperty("--selected-color", selectedColor);
    }

    if (selectedColorLabel) {
        selectedColorLabel.textContent = selectedColor;
        selectedColorLabel.classList.remove("is-empty");
    }

    if (selectedRed) {
        selectedRed.textContent = red;
    }

    if (selectedGreen) {
        selectedGreen.textContent = green;
    }

    if (selectedBlue) {
        selectedBlue.textContent = blue;
    }

    if (selectedAlpha) {
        selectedAlpha.textContent = "1";
    }

    if (selectedCyan) {
        selectedCyan.textContent = cyan;
    }

    if (selectedMagenta) {
        selectedMagenta.textContent = magenta;
    }

    if (selectedYellow) {
        selectedYellow.textContent = yellow;
    }

    if (selectedBlack) {
        selectedBlack.textContent = black;
    }
}

function moveColorWheelMarker(x, y) {
    if (!colorWheelMarker) {
        return;
    }

    window.clearTimeout(markerHideTimeout);
    colorWheelMarker.style.setProperty("--marker-x", `${x}px`);
    colorWheelMarker.style.setProperty("--marker-y", `${y}px`);
    colorWheelMarker.classList.add("is-visible");
}

function scheduleColorWheelMarkerHide() {
    window.clearTimeout(markerHideTimeout);
    markerHideTimeout = window.setTimeout(() => {
        colorWheelMarker?.classList.remove("is-visible");
    }, 5000);
}

function selectColorFromWheel(event) {
    if (!colorWheel) {
        return;
    }

    const rect = colorWheel.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const center = rect.width / 2;
    const deltaX = x - center;
    const deltaY = y - center;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > center) {
        return;
    }

    const hue = (Math.atan2(deltaY, deltaX) * 180 / Math.PI + 360) % 360;
    const saturation = Math.min(distance / center, 1);
    const [red, green, blue] = getColorWheelRgb(hue, saturation);
    const shellRect = orbShell?.getBoundingClientRect();

    if (shellRect) {
        moveColorWheelMarker(event.clientX - shellRect.left, event.clientY - shellRect.top);
    }

    updateSelectedColor(rgbToHex(red, green, blue), [red, green, blue]);
}

function startColorWheelDrag(event) {
    if (!colorWheel) {
        return;
    }

    isDraggingColorWheel = true;
    colorWheel.setPointerCapture?.(event.pointerId);
    selectColorFromWheel(event);
}

function dragColorWheel(event) {
    if (!isDraggingColorWheel) {
        return;
    }

    selectColorFromWheel(event);
}

function endColorWheelDrag(event) {
    if (!isDraggingColorWheel) {
        return;
    }

    isDraggingColorWheel = false;
    colorWheel?.releasePointerCapture?.(event.pointerId);
    scheduleColorWheelMarkerHide();
}

function enterColorTool(event) {
    event?.preventDefault();
    document.body.classList.add("tool-view-active");

    if (toolIntro && !hasSeenToolIntro) {
        toolIntro.setAttribute("aria-hidden", "false");
    }

    window.requestAnimationFrame(() => {
        resizeColorWheelCanvas();

        if (!hasSeenToolIntro) {
            document.body.classList.add("tool-intro-visible");
        }

        updateToolConnector();
    });
}

function dismissToolIntro() {
    hasSeenToolIntro = true;
    document.body.classList.remove("tool-intro-visible");

    window.setTimeout(() => {
        toolIntro?.setAttribute("aria-hidden", "true");
    }, 380);
}

function exitColorTool() {
    document.body.classList.remove("tool-view-active", "tool-intro-visible");
    toolIntro?.setAttribute("aria-hidden", "true");
    updateToolConnector();
}

function startToolSelectorMotion() {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.gsap || toolSelectors.length === 0 || shouldReduceMotion) {
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

    function driftSelector(selector) {
        toolTo(selector, {
            x: random(-52, 34),
            y: random(-42, 28),
            duration: random(3.2, 6.2),
            ease: "sine.inOut",
            onUpdate: updateToolConnector,
            onComplete: () => driftSelector(selector)
        });
    }

    function driftIcon(icon) {
        if (!icon) {
            return;
        }

        toolTo(icon, {
            rotation: random(-7, 7),
            duration: random(2.2, 4.2),
            ease: "sine.inOut",
            onUpdate: updateToolConnector,
            onComplete: () => driftIcon(icon)
        });
    }

    function pulseIconSize(icon) {
        if (!icon) {
            return;
        }

        if (icon.closest(".tool-selector--locked")) {
            return;
        }

        toolTo(icon, {
            scale: random(1.06, 1.14),
            duration: random(0.34, 0.72),
            repeat: 1,
            yoyo: true,
            ease: "sine.inOut",
            onUpdate: updateToolConnector,
            onComplete: () => {
                toolDelay(random(1.4, 4.4), () => pulseIconSize(icon));
            }
        });
    }

    function setLockedIconScale(selector, scale) {
        const icon = selector.querySelector("img");

        if (!icon || !selector.classList.contains("tool-selector--locked")) {
            return;
        }

        window.gsap.to(icon, {
            scale,
            duration: 0.12,
            ease: scale > 1 ? "power2.out" : "power2.inOut",
            overwrite: "auto"
        });
    }

    function pulseGlow(selector) {
        if (!selector) {
            return;
        }

        toolTo(selector, {
            "--selector-glow-opacity": random(0.12, 0.3),
            duration: random(1.1, 2.4),
            repeat: 1,
            yoyo: true,
            repeatDelay: random(0.05, 0.28),
            ease: "sine.inOut",
            onComplete: () => {
                toolDelay(random(0.35, 1.8), () => pulseGlow(selector));
            }
        });
    }

    toolConnectors.forEach((connector) => {
        toolTo(connector, {
            opacity: 0.82,
            backgroundPosition: "100% 50%",
            duration: 3.4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    });

    toolSelectors.forEach((selector) => {
        driftSelector(selector);
        pulseGlow(selector);
        selector.addEventListener("pointerenter", () => {
            setToolMotionScale(0.72);
            setLockedIconScale(selector, 1.35);
        });
        selector.addEventListener("pointerleave", () => {
            setToolMotionScale(1);
            setLockedIconScale(selector, 1);
        });
        selector.addEventListener("focus", () => {
            setToolMotionScale(0.72);
            setLockedIconScale(selector, 1.35);
        });
        selector.addEventListener("blur", () => {
            setToolMotionScale(1);
            setLockedIconScale(selector, 1);
        });
    });

    toolSelectorIcons.forEach((icon) => {
        driftIcon(icon);
        toolDelay(random(0.8, 2.6), () => pulseIconSize(icon));
    });

    updateToolConnector();
}

buildOrb();
resizeOrbCanvas();
resizeColorWheelCanvas();
startOrbAnimation();
startToolSelectorMotion();

if (orbShell) {
    orbShell.addEventListener("pointermove", handlePointerMove);
    orbShell.addEventListener("pointerleave", resetTilt);
}

colorToolSelector?.addEventListener("click", enterColorTool);
toolSelectors.forEach((selector) => {
    if (selector === colorToolSelector) {
        return;
    }

    selector.addEventListener("click", (event) => event.preventDefault());
});
startExploringButton?.addEventListener("click", dismissToolIntro);
toolBackButton?.addEventListener("click", exitColorTool);
colorWheel?.addEventListener("pointerdown", startColorWheelDrag);
colorWheel?.addEventListener("pointermove", dragColorWheel);
colorWheel?.addEventListener("pointerup", endColorWheelDrag);
colorWheel?.addEventListener("pointercancel", endColorWheelDrag);
colorWheel?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();

    const rect = colorWheel.getBoundingClientRect();
    selectColorFromWheel({
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
    });
    scheduleColorWheelMarkerHide();
});

window.addEventListener("pagehide", () => {
    stopOrbAnimation();
});

window.addEventListener("resize", () => {
    resizeOrbCanvas();
    resizeColorWheelCanvas();
    updateToolConnector();
});
