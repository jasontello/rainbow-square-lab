const orbCanvas = document.getElementById("rainbow-orb");
const orbContext = orbCanvas?.getContext("2d");
const siteIntro = document.getElementById("site-intro");
const colorWheel = document.getElementById("color-wheel");
const colorWheelSurface = document.querySelector(".color-wheel-surface");
const orbShell = document.getElementById("orb-shell");
const visualStage = document.getElementById("motion");
const toolSelectors = Array.from(document.querySelectorAll(".tool-selector"));
const colorToolSelector = document.querySelector(".tool-selector--color");
const toolSelectorIcons = Array.from(document.querySelectorAll(".tool-selector img"));
const toolConnectors = Array.from(document.querySelectorAll(".tool-connector"));
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
const colorWheelRadiusLine = document.getElementById("color-wheel-radius-line");
const colorWheelValue = document.getElementById("color-wheel-value");
const colorWheelReset = document.getElementById("color-wheel-reset");
const colorWheelValueControl = document.querySelector(".color-wheel-value-control");
const colorDropperAudio = new Audio("assets/icondropperclick.wav");
const colorPickerPopover = document.getElementById("color-picker-popover");
const colorPickerField = document.getElementById("color-picker-field");
const colorPickerHue = document.getElementById("color-picker-hue");
const colorPickerLight = document.getElementById("color-picker-light");
const colorPickerLightValue = document.getElementById("color-picker-light-value");
const colorPickerPreview = document.getElementById("color-picker-preview");
const colorPickerRed = document.getElementById("color-picker-red");
const colorPickerGreen = document.getElementById("color-picker-green");
const colorPickerBlue = document.getElementById("color-picker-blue");
const colorPickerEyedropper = document.getElementById("color-picker-eyedropper");
const paletteTitle = document.getElementById("palette-title");
const monochromePairings = document.getElementById("monochrome-pairings");
const paletteStripViewport = document.querySelector(".palette-strip-viewport");
const paletteDots = document.getElementById("palette-dots");
const palettePrev = document.getElementById("palette-prev");
const paletteNext = document.getElementById("palette-next");
const paletteLibrary = document.getElementById("palette-library");
const paletteLibraryGrid = document.getElementById("palette-library-grid");
const paletteLibraryClose = document.getElementById("palette-library-close");
const paletteLibraryBackdrop = document.getElementById("palette-library-backdrop");

const ORB_SIZE = 31;
const ORB_CENTER = (ORB_SIZE - 1) / 2;
const ORB_RADIUS = 14.4;
const CONNECTOR_ICON_GAP = 8;
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
const COLOR_WHEEL_STOPS = [
    { angle: 0, color: "#ff2a16" },
    { angle: 45, color: "#ff9d14" },
    { angle: 90, color: "#ffe500" },
    { angle: 135, color: "#22ee35" },
    { angle: 180, color: "#20ebdb" },
    { angle: 225, color: "#0078e8" },
    { angle: 270, color: "#6a35ff" },
    { angle: 315, color: "#ff3fd2" },
    { angle: 360, color: "#ff2a16" }
];
const WHEEL_TONE_SCROLL_STEP = 4;
const PALETTE_EDGE_FADE_THRESHOLD = 36;
const COMPACT_TOOL_ORBIT_QUERY = "(max-width: 680px)";
const COLOR_RELATIONSHIPS = [
    { title: "Monochromatic", buildPalettes: buildMonochromaticPalettes },
    { title: "Complementary", buildPalettes: buildComplementaryPalettes },
    { title: "Split Complementary", buildPalettes: buildSplitComplementaryPalettes },
    { title: "Analogous", buildPalettes: buildAnalogousPalettes },
    { title: "Primary", buildPalettes: buildPrimaryPalettes },
    { title: "Secondary", buildPalettes: buildSecondaryPalettes },
    { title: "Tertiary", buildPalettes: buildTertiaryPalettes },
    { title: "Neutral", buildPalettes: buildNeutralPalettes },
    { title: "Clash", buildPalettes: buildClashPalettes }
];

let animationFrame = null;
let cells = [];
let orbCanvasSize = 0;
let orbDevicePixelRatio = 1;
let colorToolPreviewTarget = 0;
let colorToolPreviewProgress = 0;
let colorToolPreviewExitTimeout = null;
let toolViewExitTimeout = null;
let activeToolConnectorResetTimeout = null;
let selectedColor = null;
let isDraggingColorWheel = false;
let lockAudioContext = null;
let lightSliderAudioContext = null;
let lightSliderOscillator = null;
let lightSliderGain = null;
let lightSliderReleaseTimeout = null;
let isInteractingWithLightSlider = false;
let wheelTone = 50;
let lastWheelSelection = null;
let selectedColorState = {
    angle: 210,
    saturation: 0.35,
    tone: 50
};
let pickerHue = 210;
let pickerSaturation = 35;
let pickerValue = 50;
let isDraggingPickerField = false;
let monochromeHexColors = [];
let activeRelationshipIndex = 0;
let activePaletteRgb = [115, 144, 176];
let lastFocusedElement = null;
let isDraggingPalette = false;
let paletteDragStartX = 0;
let paletteDragDeltaX = 0;
let suppressPaletteClickUntil = 0;

colorDropperAudio.preload = "auto";

function wrapIndex(index, length) {
    return ((index % length) + length) % length;
}

function playIntroAnimation() {
    if (!siteIntro) {
        return;
    }

    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introTiles = Array.from(siteIntro.querySelectorAll(".site-intro__tile"));
    const introLetters = Array.from(siteIntro.querySelectorAll(".site-intro__word span:not(.site-intro__space)"));
    const homeElements = [document.querySelector(".site-nav"), document.querySelector(".visual-stage")].filter(Boolean);

    document.body.classList.add("intro-active");

    if (!window.gsap || shouldReduceMotion) {
        siteIntro.remove();
        document.body.classList.remove("intro-active");
        return;
    }

    window.gsap.set(homeElements, {
        y: 12,
        opacity: 0
    });

    window.gsap.timeline({
        defaults: {
            ease: "power3.out"
        },
        onComplete: () => {
            siteIntro.remove();
            document.body.classList.remove("intro-active");
        }
    })
        .fromTo(introTiles, {
            x: (index) => [-34, 4, -12][index] || 0,
            y: (index) => [-18, -32, 28][index] || 0,
            rotate: (index) => [-10, 8, 7][index] || 0,
            scale: 0.68,
            opacity: 0
        }, {
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
            duration: 0.58,
            stagger: 0.08
        })
        .fromTo(introLetters, {
            y: 10,
            opacity: 0
        }, {
            y: 0,
            opacity: 1,
            duration: 0.34,
            stagger: 0.035
        }, "-=0.18")
        .to(".site-intro__brand", {
            y: -8,
            scale: 0.96,
            opacity: 0,
            duration: 0.32,
            ease: "power2.in"
        }, "+=0.42")
        .to(siteIntro, {
            yPercent: -100,
            duration: 0.72,
            ease: "power4.inOut"
        }, "-=0.06")
        .to(homeElements, {
            y: 0,
            opacity: 1,
            duration: 0.62,
            stagger: 0.08
        }, "-=0.42");
}

function mixColor(colorA, colorB, amount) {
    const a = colorA.match(/\w\w/g).map((channel) => parseInt(channel, 16));
    const b = colorB.match(/\w\w/g).map((channel) => parseInt(channel, 16));
    const mixed = a.map((channel, index) => {
        return Math.round(channel + (b[index] - channel) * amount);
    });

    return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function mixRgbColor(colorA, colorB, amount) {
    const rgbPattern = /\d+(?:\.\d+)?/g;
    const a = colorA.match(rgbPattern)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    const b = colorB.match(rgbPattern)?.slice(0, 3).map(Number) ?? [0, 0, 0];
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

function mixRgbChannels(colorA, colorB, amount) {
    return colorA.map((channel, index) => {
        return Math.round(channel + (colorB[index] - channel) * amount);
    });
}

function getColorWheelBaseRgb(angle) {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    let startStop = COLOR_WHEEL_STOPS[0];
    let endStop = COLOR_WHEEL_STOPS[COLOR_WHEEL_STOPS.length - 1];

    for (let index = 0; index < COLOR_WHEEL_STOPS.length - 1; index += 1) {
        const currentStop = COLOR_WHEEL_STOPS[index];
        const nextStop = COLOR_WHEEL_STOPS[index + 1];

        if (normalizedAngle >= currentStop.angle && normalizedAngle <= nextStop.angle) {
            startStop = currentStop;
            endStop = nextStop;
            break;
        }
    }

    const span = endStop.angle - startStop.angle || 1;
    const amount = (normalizedAngle - startStop.angle) / span;

    return mixRgbChannels(
        hexToRgb(startStop.color),
        hexToRgb(endStop.color),
        amount
    );
}

function getColorWheelRgb(angle, saturation) {
    const baseColor = getColorWheelBaseRgb(angle);
    const whiteAmount = getWheelWhiteOverlayAmount(saturation);

    return baseColor.map((channel) => {
        return Math.round(channel + (255 - channel) * whiteAmount);
    });
}

function applyWheelTone(rgbChannels, tone) {
    if (tone < 50) {
        const darknessAmount = tone / 50;

        return rgbChannels.map((channel) => {
            return Math.round(channel * darknessAmount);
        });
    }

    const lightnessAmount = (tone - 50) / 50;

    return rgbChannels.map((channel) => {
        return Math.round(channel + (255 - channel) * lightnessAmount);
    });
}

function getRgbDistance(firstRgb, secondRgb) {
    return firstRgb.reduce((total, channel, index) => {
        return total + ((channel - secondRgb[index]) ** 2);
    }, 0);
}

function getBestToneForBaseRgb(baseRgb, targetRgb) {
    const darkScale = clamp(
        targetRgb.reduce((total, channel, index) => total + channel * baseRgb[index], 0)
        / Math.max(baseRgb.reduce((total, channel) => total + channel ** 2, 0), 1),
        0,
        1
    );
    const darkTone = darkScale * 50;
    const darkRgb = applyWheelTone(baseRgb, darkTone);
    const lightVector = baseRgb.map((channel) => 255 - channel);
    const lightScale = clamp(
        targetRgb.reduce((total, channel, index) => total + (channel - baseRgb[index]) * lightVector[index], 0)
        / Math.max(lightVector.reduce((total, channel) => total + channel ** 2, 0), 1),
        0,
        1
    );
    const lightTone = 50 + lightScale * 50;
    const lightRgb = applyWheelTone(baseRgb, lightTone);

    return getRgbDistance(darkRgb, targetRgb) <= getRgbDistance(lightRgb, targetRgb) ? darkTone : lightTone;
}

function getClosestWheelSelectionForRgb(targetRgb) {
    const hsv = rgbToHsv(...targetRgb);
    const baseAngle = normalizeHue(hsv.hue);
    let bestSelection = {
        angle: baseAngle,
        saturation: clamp(hsv.saturation / 100, 0, 1),
        tone: hsv.value,
        error: Number.POSITIVE_INFINITY
    };

    for (let angleOffset = -10; angleOffset <= 10; angleOffset += 2) {
        const angle = normalizeHue(baseAngle + angleOffset);

        for (let saturationStep = 0; saturationStep <= 100; saturationStep += 1) {
            const saturation = saturationStep / 100;
            const baseRgb = getColorWheelRgb(angle, saturation);
            const tone = getBestToneForBaseRgb(baseRgb, targetRgb);
            const tonedRgb = applyWheelTone(baseRgb, tone);
            const error = getRgbDistance(tonedRgb, targetRgb);

            if (error < bestSelection.error) {
                bestSelection = {
                    angle,
                    saturation,
                    tone,
                    error
                };
            }
        }
    }

    return bestSelection;
}

function getColorStateRgb() {
    return applyWheelTone(
        getColorWheelRgb(selectedColorState.angle, selectedColorState.saturation),
        selectedColorState.tone
    );
}

function moveColorWheelMarkerFromState() {
    if (!colorWheel || !orbShell) {
        return;
    }

    const wheelRect = colorWheel.getBoundingClientRect();
    const shellRect = orbShell.getBoundingClientRect();
    const center = wheelRect.width / 2;
    const markerAngle = (selectedColorState.angle - 90) * Math.PI / 180;
    const markerDistance = center * selectedColorState.saturation;
    const markerX = (wheelRect.left - shellRect.left) + center + Math.cos(markerAngle) * markerDistance;
    const markerY = (wheelRect.top - shellRect.top) + center + Math.sin(markerAngle) * markerDistance;

    moveColorWheelMarker(markerX, markerY);
}

function setSelectedColorState(nextState, options = {}) {
    const { moveMarker = true, updateColor = true } = options;

    selectedColorState = {
        angle: normalizeHue(nextState.angle ?? selectedColorState.angle),
        saturation: clamp(nextState.saturation ?? selectedColorState.saturation, 0, 1),
        tone: clamp(nextState.tone ?? selectedColorState.tone, 0, 100)
    };
    wheelTone = Math.round(selectedColorState.tone);
    lastWheelSelection = {
        angle: selectedColorState.angle,
        saturation: selectedColorState.saturation
    };

    if (colorWheelValue) {
        colorWheelValue.value = String(wheelTone);
    }

    updateWheelToneOverlay();

    if (moveMarker) {
        moveColorWheelMarkerFromState();
    }

    if (updateColor) {
        const rgbChannels = getColorStateRgb();

        updateSelectedColor(rgbToHex(...rgbChannels), rgbChannels);
    }
}

function updateWheelToneOverlay() {
    const darkness = wheelTone < 50 ? (50 - wheelTone) / 50 : 0;
    const lightness = wheelTone > 50 ? (wheelTone - 50) / 50 : 0;

    colorWheelSurface?.style.setProperty("--wheel-darkness", darkness.toFixed(2));
    colorWheelSurface?.style.setProperty("--wheel-lightness", lightness.toFixed(2));
}

function setWheelTone(value, options = {}) {
    const { updateColor = true } = options;
    const hasWheelSelection = Boolean(selectedColor || lastWheelSelection);

    setSelectedColorState({ tone: value }, {
        moveMarker: hasWheelSelection,
        updateColor: updateColor && hasWheelSelection
    });
}

function rgbToHex(red, green, blue) {
    return `#${[red, green, blue].map((channel) => {
        return channel.toString(16).padStart(2, "0");
    }).join("")}`.toUpperCase();
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function showCopiedState(element, label = "Copied") {
    if (!element) {
        return;
    }

    window.clearTimeout(element.copyStateTimeout);
    element.dataset.copyLabel = label;
    element.classList.add("is-copied");
    element.copyStateTimeout = window.setTimeout(() => {
        element.classList.remove("is-copied");
        element.dataset.copyLabel = element.dataset.defaultCopyLabel || "";
    }, 1100);
}

async function copyTextToClipboard(text) {
    if (!text) {
        return false;
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const textArea = document.createElement("textarea");

    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();

    const copied = document.execCommand("copy");

    textArea.remove();
    return copied;
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

function rgbToHsv(red, green, blue) {
    const normalizedRed = red / 255;
    const normalizedGreen = green / 255;
    const normalizedBlue = blue / 255;
    const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
    const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
    const delta = max - min;
    let hue = 0;

    if (delta !== 0) {
        if (max === normalizedRed) {
            hue = 60 * (((normalizedGreen - normalizedBlue) / delta) % 6);
        } else if (max === normalizedGreen) {
            hue = 60 * ((normalizedBlue - normalizedRed) / delta + 2);
        } else {
            hue = 60 * ((normalizedRed - normalizedGreen) / delta + 4);
        }
    }

    if (hue < 0) {
        hue += 360;
    }

    return {
        hue,
        saturation: max === 0 ? 0 : (delta / max) * 100,
        value: max * 100
    };
}

function hsvToRgb(hue, saturation, value) {
    const normalizedSaturation = saturation / 100;
    const normalizedValue = value / 100;
    const chroma = normalizedValue * normalizedSaturation;
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

    const match = normalizedValue - chroma;

    return [
        Math.round((red + match) * 255),
        Math.round((green + match) * 255),
        Math.round((blue + match) * 255)
    ];
}

function normalizeHue(hue) {
    return ((hue % 360) + 360) % 360;
}

function paletteBaseFromHsv(baseHsv) {
    return {
        hue: baseHsv.hue,
        saturation: clamp(baseHsv.saturation, 38, 82),
        value: 72
    };
}

function colorFromRelationship(baseHsv, hueOffset = 0, saturationOffset = 0, valueOffset = 0) {
    const hue = normalizeHue(baseHsv.hue + hueOffset);
    const saturation = clamp((baseHsv.saturationValue ?? baseHsv.saturation) + saturationOffset, 8, 100);
    const value = clamp(baseHsv.fixedValue ?? baseHsv.value + valueOffset, 12, 98);

    return rgbToHex(...hsvToRgb(hue, saturation, value));
}

function buildPalette(baseHsv, variants) {
    const paletteBase = paletteBaseFromHsv(baseHsv);

    return variants.map((variant) => {
        return colorFromRelationship(
            {
                hue: paletteBase.hue,
                saturationValue: variant.saturation ?? paletteBase.saturation,
                fixedValue: variant.value ?? paletteBase.value
            },
            variant.hueOffset || 0,
            variant.saturationOffset || 0,
            0
        );
    });
}

function buildMonochromaticPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ value: 34 }, { value: 72 }]),
        buildPalette(baseHsv, [{ saturationOffset: -10, value: 86 }, { saturationOffset: 8, value: 48 }]),
        buildPalette(baseHsv, [{ saturationOffset: 10, value: 26 }, { saturationOffset: -4, value: 62 }, { saturationOffset: -18, value: 90 }]),
        buildPalette(baseHsv, [{ saturationOffset: -24, value: 94 }, { saturationOffset: 12, value: 56 }])
    ];
}

function buildComplementaryPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ value: 42 }, { hueOffset: 180, value: 82 }]),
        buildPalette(baseHsv, [{ saturationOffset: -12, value: 88 }, { hueOffset: 180, saturationOffset: 12, value: 44 }]),
        buildPalette(baseHsv, [{ value: 32 }, { hueOffset: 180, value: 66 }, { saturationOffset: -22, value: 92 }]),
        buildPalette(baseHsv, [{ saturationOffset: 10, value: 70 }, { hueOffset: 180, saturationOffset: -18, value: 54 }])
    ];
}

function buildSplitComplementaryPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ value: 48 }, { hueOffset: 150, value: 78 }, { hueOffset: 210, value: 64 }]),
        buildPalette(baseHsv, [{ value: 34 }, { hueOffset: 150, value: 84 }, { hueOffset: 210, saturationOffset: -12, value: 92 }]),
        buildPalette(baseHsv, [{ saturationOffset: -16, value: 90 }, { hueOffset: 150, saturationOffset: 12, value: 56 }, { hueOffset: 210, value: 40 }]),
        buildPalette(baseHsv, [{ value: 28 }, { hueOffset: 150, value: 68 }, { hueOffset: 210, value: 86 }])
    ];
}

function buildAnalogousPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ hueOffset: -30, value: 50 }, { value: 74 }, { hueOffset: 30, value: 88 }]),
        buildPalette(baseHsv, [{ hueOffset: -45, value: 34 }, { hueOffset: -15, value: 82 }, { hueOffset: 30, value: 62 }]),
        buildPalette(baseHsv, [{ hueOffset: -30, saturationOffset: -18, value: 90 }, { value: 58 }, { hueOffset: 45, saturationOffset: 8, value: 42 }]),
        buildPalette(baseHsv, [{ hueOffset: -60, value: 36 }, { hueOffset: -25, value: 66 }, { hueOffset: 25, value: 84 }, { hueOffset: 60, value: 54 }])
    ];
}

function buildPrimaryPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ value: 50 }, { hueOffset: 120, value: 78 }, { hueOffset: 240, value: 66 }]),
        buildPalette(baseHsv, [{ saturationOffset: -12, value: 88 }, { hueOffset: 120, value: 46 }, { hueOffset: 240, value: 74 }]),
        buildPalette(baseHsv, [{ value: 32 }, { hueOffset: 120, saturationOffset: -8, value: 68 }, { hueOffset: 240, saturationOffset: 10, value: 86 }]),
        buildPalette(baseHsv, [{ value: 82 }, { hueOffset: 120, value: 56 }, { hueOffset: 240, value: 38 }])
    ];
}

function buildSecondaryPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ hueOffset: 60, value: 82 }, { hueOffset: 180, value: 48 }, { hueOffset: 300, value: 68 }]),
        buildPalette(baseHsv, [{ hueOffset: 60, value: 90 }, { hueOffset: 180, value: 40 }, { hueOffset: 300, saturationOffset: -12, value: 72 }]),
        buildPalette(baseHsv, [{ hueOffset: 60, saturationOffset: -18, value: 88 }, { hueOffset: 180, value: 60 }, { hueOffset: 300, value: 34 }]),
        buildPalette(baseHsv, [{ hueOffset: 60, value: 38 }, { hueOffset: 180, saturationOffset: -10, value: 84 }, { hueOffset: 300, saturationOffset: 10, value: 58 }])
    ];
}

function buildTertiaryPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ hueOffset: 30, value: 86 }, { hueOffset: 90, value: 56 }, { hueOffset: 150, value: 74 }]),
        buildPalette(baseHsv, [{ hueOffset: 210, value: 42 }, { hueOffset: 270, value: 82 }, { hueOffset: 330, value: 62 }]),
        buildPalette(baseHsv, [{ hueOffset: 30, saturationOffset: -12, value: 92 }, { hueOffset: 150, value: 48 }, { hueOffset: 270, saturationOffset: 10, value: 70 }]),
        buildPalette(baseHsv, [{ hueOffset: 90, value: 34 }, { hueOffset: 210, saturationOffset: -10, value: 78 }, { hueOffset: 330, value: 88 }])
    ];
}

function buildNeutralPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ saturation: 16, value: 92 }, { saturation: 18, value: 66 }, { saturation: 20, value: 38 }]),
        buildPalette(baseHsv, [{ saturation: 8, value: 96 }, { saturation: 12, value: 74 }, { saturation: 18, value: 48 }]),
        buildPalette(baseHsv, [{ saturation: 22, value: 84 }, { saturation: 24, value: 58 }, { saturation: 26, value: 30 }]),
        buildPalette(baseHsv, [{ saturation: 10, value: 94 }, { saturation: 16, value: 72 }, { saturation: 22, value: 50 }, { saturation: 28, value: 34 }])
    ];
}

function buildClashPalettes(baseHsv) {
    return [
        buildPalette(baseHsv, [{ value: 46 }, { hueOffset: 90, value: 86 }]),
        buildPalette(baseHsv, [{ value: 34 }, { hueOffset: 90, value: 82 }, { hueOffset: 180, saturationOffset: -18, value: 92 }]),
        buildPalette(baseHsv, [{ hueOffset: -90, value: 76 }, { value: 42 }, { hueOffset: 90, value: 88 }]),
        buildPalette(baseHsv, [{ saturationOffset: 12, value: 32 }, { hueOffset: 90, saturationOffset: 8, value: 70 }, { hueOffset: 270, saturationOffset: -10, value: 90 }])
    ];
}

function renderPaletteDots() {
    if (!paletteDots) {
        return;
    }

    paletteDots.replaceChildren(...COLOR_RELATIONSHIPS.map((relationship, index) => {
        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = `palette-dot${index === activeRelationshipIndex ? " is-active" : ""}`;
        dot.setAttribute("aria-label", `Show ${relationship.title}`);
        dot.setAttribute("aria-current", index === activeRelationshipIndex ? "true" : "false");
        dot.addEventListener("click", () => {
            showRelationshipAt(index);
        });

        return dot;
    }));
}

function renderColorRelationshipPalettes(red, green, blue, options = {}) {
    if (!monochromePairings) {
        return;
    }

    const { animate = false, direction = 1 } = options;
    activePaletteRgb = [red, green, blue];
    const baseHsv = rgbToHsv(red, green, blue);
    const relationship = COLOR_RELATIONSHIPS[activeRelationshipIndex];
    const palettes = relationship.buildPalettes(baseHsv);

    const applyRender = () => {
        const cappedPalettes = palettes.map((palette) => palette.slice(0, 3));

        monochromeHexColors = cappedPalettes.flat();
        monochromePairings.replaceChildren(...cappedPalettes.map((palette) => {
            const pairing = document.createElement("div");
            const stack = document.createElement("div");

            pairing.className = "monochrome-pairing";
            stack.className = "monochrome-stack";
            stack.dataset.colorCount = String(palette.length);
            stack.style.setProperty("--palette-color-count", palette.length);

            stack.replaceChildren(...palette.map((hexColor) => {
                const swatch = createPaletteSwatch(hexColor, "", "--mono-swatch");

                swatch.dataset.monoSwatch = "";
                return swatch;
            }));
            pairing.append(stack);

            return pairing;
        }));

        if (paletteTitle) {
            paletteTitle.textContent = relationship.title;
        }

        renderPaletteDots();
    };

    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animationTargets = [paletteTitle, monochromePairings].filter(Boolean);

    if (!animate || !window.gsap || shouldReduceMotion || animationTargets.length === 0) {
        applyRender();
        return;
    }

    window.gsap.killTweensOf(animationTargets);
    window.gsap.timeline()
        .to(animationTargets, {
            x: direction * -18,
            opacity: 0,
            duration: 0.16,
            ease: "power2.in",
            stagger: 0.015,
            onComplete: applyRender
        })
        .fromTo(animationTargets, {
            x: direction * 18,
            opacity: 0
        }, {
            x: 0,
            opacity: 1,
            duration: 0.28,
            ease: "power3.out",
            stagger: 0.025
        });
}

function createPaletteSwatch(hexColor, className, cssProperty) {
    const swatch = document.createElement("button");

    swatch.type = "button";
    swatch.className = className;
    swatch.dataset.hexLabel = hexColor;
    swatch.dataset.copyValue = hexColor;
    swatch.title = hexColor;
    swatch.setAttribute("aria-label", `Copy ${hexColor}`);
    swatch.style.setProperty(cssProperty, hexColor);

    return swatch;
}

function copyPaletteSwatch(swatch) {
    return copyTextToClipboard(swatch.dataset.copyValue).then((copied) => {
        if (!copied) {
            return;
        }

        swatch.dataset.hexLabel = "Copied";
        showCopiedState(swatch, "Copied");
        window.setTimeout(() => {
            swatch.dataset.hexLabel = swatch.dataset.copyValue;
        }, 1100);
    });
}

function getCappedRelationshipPalettes(relationship, rgbChannels) {
    const baseHsv = rgbToHsv(...rgbChannels);

    return relationship.buildPalettes(baseHsv).map((palette) => palette.slice(0, 3));
}

function renderPaletteLibrary() {
    if (!paletteLibraryGrid) {
        return;
    }

    paletteLibraryGrid.replaceChildren(...COLOR_RELATIONSHIPS.map((relationship) => {
        const column = document.createElement("section");
        const heading = document.createElement("h3");
        const palettes = getCappedRelationshipPalettes(relationship, activePaletteRgb);

        column.className = "palette-library-column";
        heading.textContent = relationship.title;
        column.append(heading);

        palettes.forEach((palette) => {
            const stack = document.createElement("div");

            stack.className = "palette-library-stack";
            stack.dataset.colorCount = String(palette.length);
            stack.style.setProperty("--palette-color-count", palette.length);
            stack.replaceChildren(...palette.map((hexColor) => {
                return createPaletteSwatch(hexColor, "palette-library-swatch", "--library-swatch");
            }));
            column.append(stack);
        });

        return column;
    }));
}

function setPaletteLibraryOpen(isOpen) {
    if (!paletteLibrary) {
        return;
    }

    if (isOpen) {
        lastFocusedElement = document.activeElement;
        renderPaletteLibrary();
        paletteLibrary.classList.add("is-open");
        paletteLibrary.setAttribute("aria-hidden", "false");
        document.body.classList.add("palette-library-open");
        paletteLibraryClose?.focus();
        return;
    }

    paletteLibrary.classList.remove("is-open");
    paletteLibrary.setAttribute("aria-hidden", "true");
    document.body.classList.remove("palette-library-open");

    if (lastFocusedElement?.focus) {
        lastFocusedElement.focus();
    }
}

function getPaletteAnimationTargets() {
    return [paletteTitle, monochromePairings].filter(Boolean);
}

function resetPaletteDragPosition() {
    const targets = getPaletteAnimationTargets();

    if (!targets.length || !window.gsap) {
        return;
    }

    window.gsap.to(targets, {
        x: 0,
        opacity: 1,
        duration: 0.22,
        ease: "power3.out"
    });
}

function startPaletteDrag(event) {
    if (!monochromePairings || event.button !== 0) {
        return;
    }

    isDraggingPalette = true;
    paletteDragStartX = event.clientX;
    paletteDragDeltaX = 0;
    monochromePairings.classList.add("is-dragging");
    paletteStripViewport?.classList.add("is-dragging");
    paletteStripViewport?.classList.remove("is-fading-left", "is-fading-right");
    monochromePairings.setPointerCapture?.(event.pointerId);
}

function dragPalette(event) {
    if (!isDraggingPalette) {
        return;
    }

    paletteDragDeltaX = event.clientX - paletteDragStartX;
    paletteStripViewport?.classList.toggle("is-fading-left", paletteDragDeltaX < -PALETTE_EDGE_FADE_THRESHOLD);
    paletteStripViewport?.classList.toggle("is-fading-right", paletteDragDeltaX > PALETTE_EDGE_FADE_THRESHOLD);

    if (window.gsap) {
        window.gsap.set(getPaletteAnimationTargets(), {
            x: paletteDragDeltaX * 0.32,
            opacity: clamp(1 - Math.abs(paletteDragDeltaX) / 260, 0.58, 1)
        });
    }
}

function endPaletteDrag(event) {
    if (!isDraggingPalette) {
        return;
    }

    const dragDistance = paletteDragDeltaX;
    const didDrag = Math.abs(dragDistance) > 8;

    isDraggingPalette = false;
    monochromePairings?.classList.remove("is-dragging");
    paletteStripViewport?.classList.remove("is-dragging", "is-fading-left", "is-fading-right");
    monochromePairings?.releasePointerCapture?.(event.pointerId);

    if (didDrag) {
        suppressPaletteClickUntil = Date.now() + 450;
    }

    if (Math.abs(dragDistance) < 46) {
        resetPaletteDragPosition();
        return;
    }

    showRelationshipAt(activeRelationshipIndex + (dragDistance < 0 ? 1 : -1));
}

function showRelationshipAt(index) {
    const nextIndex = wrapIndex(index, COLOR_RELATIONSHIPS.length);

    if (nextIndex === activeRelationshipIndex) {
        return;
    }

    const direction = index > activeRelationshipIndex ? 1 : -1;

    activeRelationshipIndex = nextIndex;
    renderColorRelationshipPalettes(...activePaletteRgb, { animate: true, direction });
}

function syncPickerUiFromRgb(red, green, blue) {
    if (!colorPickerPopover) {
        return;
    }

    pickerHue = selectedColorState.angle;
    pickerSaturation = selectedColorState.saturation * 100;
    pickerValue = selectedColorState.tone;
    colorPickerPopover.style.setProperty("--picker-hue", pickerHue);
    colorPickerPopover.style.setProperty("--picker-saturation", pickerSaturation);
    colorPickerPopover.style.setProperty("--picker-value", pickerValue);
    colorPickerPopover.style.setProperty("--picker-color", rgbToHex(red, green, blue));

    if (colorPickerHue) {
        colorPickerHue.value = Math.round(pickerHue);
    }

    updatePickerToneControl(wheelTone);

    if (colorPickerPreview) {
        colorPickerPreview.style.setProperty("--picker-color", rgbToHex(red, green, blue));
    }

    if (colorPickerRed) {
        colorPickerRed.value = red;
    }

    if (colorPickerGreen) {
        colorPickerGreen.value = green;
    }

    if (colorPickerBlue) {
        colorPickerBlue.value = blue;
    }
}

function updatePickerToneControl(value) {
    const nextValue = Math.round(value);

    if (colorPickerLight) {
        colorPickerLight.value = nextValue;
    }

    if (colorPickerLightValue) {
        colorPickerLightValue.textContent = String(nextValue);
    }
}

function setColorPickerOpen(isOpen) {
    colorPickerPopover?.classList.toggle("is-open", isOpen);
    colorPickerPopover?.setAttribute("aria-hidden", String(!isOpen));
    selectedColorSphere?.setAttribute("aria-expanded", String(isOpen));
}

function applyPickerColor() {
    setSelectedColorState({
        angle: pickerHue,
        saturation: pickerSaturation / 100,
        tone: pickerValue
    });
}

function updatePickerFromFieldEvent(event) {
    if (!colorPickerField) {
        return;
    }

    const rect = colorPickerField.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

    pickerSaturation = (x / rect.width) * 100;
    pickerValue = 100 - (y / rect.height) * 100;
    applyPickerColor();
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

function getColorWheelPreviewColor(cell) {
    const angle = (Math.atan2(cell.y - ORB_CENTER, cell.x - ORB_CENTER) * 180 / Math.PI + 360) % 360;
    const radius = clamp(cell.distance / ORB_RADIUS, 0, 1);
    const saturation = clamp(1 - radius * 0.08, 0.82, 1);
    const lightness = clamp(0.55 + (1 - radius) * 0.18, 0.5, 0.76);
    const [red, green, blue] = hslToRgb(angle, saturation, lightness);

    return `rgb(${red}, ${green}, ${blue})`;
}

function setColorToolPreview(isPreviewing) {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.clearTimeout(colorToolPreviewExitTimeout);
    colorToolPreviewTarget = isPreviewing ? 1 : 0;
    colorToolPreviewProgress = shouldReduceMotion ? colorToolPreviewTarget : colorToolPreviewProgress;

    if (isPreviewing) {
        document.body.classList.remove("color-tool-preview-exiting");
        document.body.classList.add("color-tool-preview");
        return;
    }

    document.body.classList.remove("color-tool-preview");
    document.body.classList.add("color-tool-preview-exiting");

    colorToolPreviewExitTimeout = window.setTimeout(() => {
        document.body.classList.remove("color-tool-preview-exiting");
    }, shouldReduceMotion ? 0 : 260);
}

function smoothStep(edgeStart, edgeEnd, value) {
    const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);

    return progress * progress * (3 - 2 * progress);
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
                    color: getStaticRainbowColor(x, y),
                    previewColor: null
                });
            }
        }
    }

    cells.forEach((cell) => {
        cell.previewColor = getColorWheelPreviewColor(cell);
    });
}

function animateOrb(time = 0) {
    if (!orbCanvas || !orbContext) {
        animationFrame = null;
        return;
    }

    orbCanvas.style.setProperty("--orb-rotate", `${Math.sin(time * 0.00025) * 5}deg`);
    orbContext.clearRect(0, 0, orbCanvasSize, orbCanvasSize);

    colorToolPreviewProgress += (colorToolPreviewTarget - colorToolPreviewProgress) * 0.075;

    if (Math.abs(colorToolPreviewTarget - colorToolPreviewProgress) < 0.004) {
        colorToolPreviewProgress = colorToolPreviewTarget;
    }

    const previewProgress = colorToolPreviewProgress;
    const previewTileOpacity = colorToolPreviewTarget === 0
        ? 1 - smoothStep(0.78, 0.98, previewProgress)
        : 1 - smoothStep(0.42, 0.86, previewProgress);
    const previewStrokeOpacity = (1 - previewProgress) ** 3;

    cells.forEach((cell) => {
        const longitudeWave = Math.sin(time * 0.0016 + cell.x * 0.6);
        const cloudBand = Math.sin(time * 0.001 + cell.x * 0.32 + cell.y * 0.52);
        const sparkle = Math.sin(time * 0.0022 + cell.distance * 0.9);
        const previewGather = Math.sin(previewProgress * Math.PI);
        const previewOpacity = 0.86 + (1 - cell.distance / ORB_RADIUS) * 0.1;
        const opacity = (Math.max(0.18, Math.min(1, cell.edgeFade * (0.56 + cloudBand * 0.26 + sparkle * 0.12)))
            * (1 - previewProgress)
            + previewOpacity * previewProgress) * previewTileOpacity;
        const scale = (0.72 + Math.max(0, longitudeWave) * 0.42 + Math.abs(cell.latitude) * 0.1) * (1 - previewProgress)
            + (1.42 + (1 - cell.distance / ORB_RADIUS) * 0.08) * previewProgress;
        const cellSize = orbCanvasSize * 0.0245 * scale;
        const originalCenterX = orbCanvasSize * cell.dotLeft;
        const originalCenterY = orbCanvasSize * cell.dotTop;
        const centerX = orbCanvasSize * 0.5;
        const centerY = orbCanvasSize * 0.5;
        const compactRadius = orbCanvasSize * 0.36;
        const normalizedX = (cell.x - ORB_CENTER) / ORB_RADIUS;
        const normalizedY = (cell.y - ORB_CENTER) / ORB_RADIUS;
        const previewCenterX = centerX + normalizedX * compactRadius;
        const previewCenterY = centerY + normalizedY * compactRadius;
        const cellCenterX = originalCenterX * (1 - previewProgress) + previewCenterX * previewProgress;
        const cellCenterY = originalCenterY * (1 - previewProgress) + previewCenterY * previewProgress - previewGather * orbCanvasSize * 0.012;
        const cellColor = previewProgress > 0.02
            ? mixRgbColor(cell.color, cell.previewColor, previewProgress)
            : cell.color;
        const cellRotation = Math.PI / 4 * (1 - previewProgress);

        orbContext.save();
        orbContext.translate(cellCenterX, cellCenterY);
        orbContext.rotate(cellRotation);
        orbContext.globalAlpha = opacity;
        orbContext.fillStyle = cellColor;
        orbContext.fillRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize);
        orbContext.globalAlpha = opacity * 0.32;
        orbContext.strokeStyle = `rgba(24, 23, 19, ${0.28 * previewStrokeOpacity})`;
        orbContext.lineWidth = 1;
        orbContext.strokeRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize);
        orbContext.restore();
    });

    updateToolConnector();
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
    updateToolConnector();
}

function resetTilt() {
    if (!orbShell) {
        return;
    }

    orbShell.style.setProperty("--tilt-x", "0deg");
    orbShell.style.setProperty("--tilt-y", "0deg");
    updateToolConnector();
}

function updateToolConnectorFor(selector, connector) {
    if (!visualStage || !orbShell || !selector || !connector) {
        return;
    }

    const toolId = connector.dataset.toolLine;
    const anchor = orbShell.querySelector(`[data-tool-anchor="${toolId}"]`);

    if (!anchor) {
        return;
    }

    const stageRect = visualStage.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const selectorRect = selector.getBoundingClientRect();
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const selectorCenterX = selectorRect.left + selectorRect.width / 2;
    const selectorCenterY = selectorRect.top + selectorRect.height / 2;
    const centerEndX = selectorCenterX - stageRect.left;
    const centerEndY = selectorCenterY - stageRect.top;
    const isColorCirclePreview = document.body.classList.contains("color-tool-preview")
        && !document.body.classList.contains("tool-view-active")
        && colorWheelSurface;
    let startX = anchorCenterX - stageRect.left;
    let startY = anchorCenterY - stageRect.top;

    if (isColorCirclePreview) {
        const wheelRect = colorWheelSurface.getBoundingClientRect();
        const wheelCenterX = wheelRect.left + wheelRect.width / 2 - stageRect.left;
        const wheelCenterY = wheelRect.top + wheelRect.height / 2 - stageRect.top;
        const wheelDeltaX = centerEndX - wheelCenterX;
        const wheelDeltaY = centerEndY - wheelCenterY;
        const wheelDistance = Math.hypot(wheelDeltaX, wheelDeltaY) || 1;
        const wheelRadius = Math.min(wheelRect.width, wheelRect.height) / 2;

        startX = wheelCenterX + (wheelDeltaX / wheelDistance) * wheelRadius;
        startY = wheelCenterY + (wheelDeltaY / wheelDistance) * wheelRadius;
    }

    const centerDeltaX = centerEndX - startX;
    const centerDeltaY = centerEndY - startY;
    const centerDistance = Math.hypot(centerDeltaX, centerDeltaY) || 1;
    const iconRadius = Math.min(selectorRect.width, selectorRect.height) / 2;
    const endPullback = iconRadius + CONNECTOR_ICON_GAP;
    const endX = centerEndX - (centerDeltaX / centerDistance) * endPullback;
    const endY = centerEndY - (centerDeltaY / centerDistance) * endPullback;
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

function setActiveToolConnector(toolId) {
    if (!toolId) {
        return;
    }

    window.clearTimeout(activeToolConnectorResetTimeout);
    document.body.classList.add("has-active-tool-line");
    toolSelectors.forEach((selector) => {
        selector.classList.toggle("is-active", selector.dataset.toolId === toolId);
    });
    toolConnectors.forEach((connector) => {
        connector.classList.toggle("is-active", connector.dataset.toolLine === toolId);
    });
}

function clearActiveToolConnector() {
    window.clearTimeout(activeToolConnectorResetTimeout);

    activeToolConnectorResetTimeout = window.setTimeout(() => {
        const activeSelector = toolSelectors.find((selector) => {
            return selector.matches(":hover") || document.activeElement === selector;
        });

        if (activeSelector) {
            setActiveToolConnector(activeSelector.dataset.toolId);
            return;
        }

        document.body.classList.remove("has-active-tool-line");
        toolSelectors.forEach((selector) => {
            selector.classList.remove("is-active");
        });
        toolConnectors.forEach((connector) => {
            connector.classList.remove("is-active");
        });
    }, 55);
}

function updateSelectedColor(hexColor, rgbChannels = hexToRgb(hexColor)) {
    selectedColor = hexColor;
    const [red, green, blue] = rgbChannels;
    const [cyan, magenta, yellow, black] = rgbToCmyk(red, green, blue);

    if (selectedColorSphere) {
        selectedColorSphere.style.setProperty("--selected-color", selectedColor);
    }

    if (colorWheelMarker) {
        colorWheelMarker.style.setProperty("--marker-color", selectedColor);
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

    renderColorRelationshipPalettes(red, green, blue);
    syncPickerUiFromRgb(red, green, blue);
}

function playLockSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    lockAudioContext ??= new AudioContext();
    lockAudioContext.resume?.();

    const startTime = lockAudioContext.currentTime;
    const gain = lockAudioContext.createGain();
    const click = lockAudioContext.createOscillator();
    const thunk = lockAudioContext.createOscillator();

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.13);
    gain.connect(lockAudioContext.destination);

    click.type = "square";
    click.frequency.setValueAtTime(880, startTime);
    click.frequency.exponentialRampToValueAtTime(340, startTime + 0.055);
    click.connect(gain);
    click.start(startTime);
    click.stop(startTime + 0.07);

    thunk.type = "triangle";
    thunk.frequency.setValueAtTime(180, startTime + 0.035);
    thunk.frequency.exponentialRampToValueAtTime(90, startTime + 0.13);
    thunk.connect(gain);
    thunk.start(startTime + 0.035);
    thunk.stop(startTime + 0.14);
}

function playColorDropperSound() {
    colorDropperAudio.currentTime = 0;
    colorDropperAudio.play().catch(() => {});
}

function playBackButtonSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return;
    }

    lockAudioContext ??= new AudioContext();
    lockAudioContext.resume?.();

    const startTime = lockAudioContext.currentTime;
    const gain = lockAudioContext.createGain();
    const tone = lockAudioContext.createOscillator();
    const lowTap = lockAudioContext.createOscillator();

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.11, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);
    gain.connect(lockAudioContext.destination);

    tone.type = "triangle";
    tone.frequency.setValueAtTime(520, startTime);
    tone.frequency.exponentialRampToValueAtTime(260, startTime + 0.12);
    tone.connect(gain);
    tone.start(startTime);
    tone.stop(startTime + 0.14);

    lowTap.type = "sine";
    lowTap.frequency.setValueAtTime(165, startTime + 0.045);
    lowTap.frequency.exponentialRampToValueAtTime(110, startTime + 0.16);
    lowTap.connect(gain);
    lowTap.start(startTime + 0.045);
    lowTap.stop(startTime + 0.17);
}

function getLightSliderFrequency(value) {
    const minFrequency = 130;
    const maxFrequency = 1040;
    const normalizedValue = clamp(Number(value) / 100, 0, 1);

    return minFrequency * (maxFrequency / minFrequency) ** normalizedValue;
}

function ensureLightSliderTone() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
        return false;
    }

    lightSliderAudioContext ??= new AudioContext();
    lightSliderAudioContext.resume?.();

    if (lightSliderOscillator && lightSliderGain) {
        return true;
    }

    const startTime = lightSliderAudioContext.currentTime;

    lightSliderOscillator = lightSliderAudioContext.createOscillator();
    lightSliderGain = lightSliderAudioContext.createGain();

    lightSliderOscillator.type = "sine";
    lightSliderOscillator.frequency.setValueAtTime(getLightSliderFrequency(wheelTone), startTime);
    lightSliderGain.gain.setValueAtTime(0.0001, startTime);

    lightSliderOscillator.connect(lightSliderGain);
    lightSliderGain.connect(lightSliderAudioContext.destination);
    lightSliderOscillator.start(startTime);

    return true;
}

function updateLightSliderTone(value) {
    if (!ensureLightSliderTone() || !lightSliderAudioContext || !lightSliderOscillator || !lightSliderGain) {
        return;
    }

    window.clearTimeout(lightSliderReleaseTimeout);

    const now = lightSliderAudioContext.currentTime;
    const frequency = getLightSliderFrequency(value);

    lightSliderOscillator.frequency.cancelScheduledValues(now);
    lightSliderOscillator.frequency.setTargetAtTime(frequency, now, 0.018);
    lightSliderGain.gain.cancelScheduledValues(now);
    lightSliderGain.gain.setTargetAtTime(0.042, now, 0.012);
}

function stopLightSliderTone(delay = 90) {
    if (!lightSliderAudioContext || !lightSliderOscillator || !lightSliderGain) {
        return;
    }

    window.clearTimeout(lightSliderReleaseTimeout);

    const oscillator = lightSliderOscillator;
    const gain = lightSliderGain;
    const now = lightSliderAudioContext.currentTime;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.0001, now, 0.03);

    lightSliderReleaseTimeout = window.setTimeout(() => {
        try {
            oscillator.stop();
        } catch (error) {
            // The oscillator may already be stopped if the user moves the slider again quickly.
        }

        oscillator.disconnect();
        gain.disconnect();

        if (lightSliderOscillator === oscillator) {
            lightSliderOscillator = null;
            lightSliderGain = null;
        }
    }, delay);
}

function pulseLightSliderTone(value) {
    updateLightSliderTone(value);
    stopLightSliderTone(160);
}

function shakeLockedTool(selector) {
    const shakeTarget = selector.querySelector(".tool-selector__shake");

    if (!window.gsap || !shakeTarget) {
        return;
    }

    window.gsap.killTweensOf(shakeTarget);
    window.gsap.fromTo(shakeTarget, {
        x: 0,
        rotation: 0
    }, {
        x: 0,
        rotation: 0,
        duration: 0.4,
        ease: "power1.out",
        keyframes: [
            { x: -7, rotation: -7, duration: 0.05 },
            { x: 7, rotation: 6, duration: 0.06 },
            { x: -6, rotation: -5, duration: 0.06 },
            { x: 5, rotation: 4, duration: 0.06 },
            { x: -3, rotation: -2, duration: 0.05 },
            { x: 0, rotation: 0, duration: 0.08 }
        ],
        onUpdate: updateToolConnector
    });
}

function moveColorWheelMarker(x, y) {
    if (!colorWheelMarker) {
        return;
    }

    colorWheelMarker.style.setProperty("--marker-x", `${x}px`);
    colorWheelMarker.style.setProperty("--marker-y", `${y}px`);
    colorWheelMarker.classList.add("is-visible");

    if (colorWheelRadiusLine && orbShell) {
        const shellRect = orbShell.getBoundingClientRect();
        const centerX = shellRect.width / 2;
        const centerY = shellRect.height / 2;
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        const length = Math.hypot(deltaX, deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        colorWheelRadiusLine.style.setProperty("--wheel-line-length", `${length}px`);
        colorWheelRadiusLine.style.setProperty("--wheel-line-angle", `${angle}deg`);
        colorWheelRadiusLine.classList.add("is-visible");
    }
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

    const wheelAngle = (Math.atan2(deltaY, deltaX) * 180 / Math.PI + 450) % 360;
    const saturation = Math.min(distance / center, 1);
    const shellRect = orbShell?.getBoundingClientRect();

    if (shellRect) {
        moveColorWheelMarker(event.clientX - shellRect.left, event.clientY - shellRect.top);
    }

    setSelectedColorState({
        angle: wheelAngle,
        saturation,
        tone: wheelTone
    }, {
        moveMarker: false
    });
}

function updateSelectedColorFromWheelValue() {
    setSelectedColorState({ tone: wheelTone });
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
}

function startPickerFieldDrag(event) {
    isDraggingPickerField = true;
    colorPickerField?.setPointerCapture?.(event.pointerId);
    updatePickerFromFieldEvent(event);
}

function dragPickerField(event) {
    if (!isDraggingPickerField) {
        return;
    }

    updatePickerFromFieldEvent(event);
}

function endPickerFieldDrag(event) {
    if (!isDraggingPickerField) {
        return;
    }

    isDraggingPickerField = false;
    colorPickerField?.releasePointerCapture?.(event.pointerId);
}

function updatePickerFromRgbInputs() {
    const red = Math.min(Math.max(Number(colorPickerRed?.value) || 0, 0), 255);
    const green = Math.min(Math.max(Number(colorPickerGreen?.value) || 0, 0), 255);
    const blue = Math.min(Math.max(Number(colorPickerBlue?.value) || 0, 0), 255);
    const wheelSelection = getClosestWheelSelectionForRgb([red, green, blue]);

    setSelectedColorState(wheelSelection);
}

function applyPickedColor(hexColor) {
    const normalizedHex = hexColor.toUpperCase();
    const rgbChannels = hexToRgb(normalizedHex);
    const wheelSelection = getClosestWheelSelectionForRgb(rgbChannels);

    setSelectedColorState(wheelSelection);
}

async function pickColorFromScreen(event) {
    event.preventDefault();

    if ("EyeDropper" in window) {
        try {
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();

            applyPickedColor(result.sRGBHex);
        } catch (error) {
            // The browser throws if the user cancels the eyedropper.
        }

        return;
    }

    const fallbackPicker = document.createElement("input");

    fallbackPicker.type = "color";
    fallbackPicker.value = selectedColor || "#FF3908";
    fallbackPicker.style.position = "fixed";
    fallbackPicker.style.opacity = "0";
    fallbackPicker.style.pointerEvents = "none";
    document.body.append(fallbackPicker);
    fallbackPicker.addEventListener("input", () => applyPickedColor(fallbackPicker.value), { once: true });
    fallbackPicker.addEventListener("blur", () => fallbackPicker.remove(), { once: true });
    fallbackPicker.click();
}

function enterColorTool(event) {
    event?.preventDefault();
    setColorToolPreview(false);
    window.clearTimeout(toolViewExitTimeout);
    document.body.classList.remove("tool-view-exiting");
    playColorDropperSound();
    document.body.classList.add("tool-view-active");

    window.requestAnimationFrame(() => {
        resizeColorWheelCanvas();
        updateToolConnector();
    });
}

function exitColorTool() {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.clearTimeout(toolViewExitTimeout);
    document.body.classList.add("tool-view-exiting");
    document.body.classList.remove("tool-view-active");
    updateToolConnector();

    toolViewExitTimeout = window.setTimeout(() => {
        document.body.classList.remove("tool-view-exiting");
    }, shouldReduceMotion ? 0 : 260);
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

    function getCompactToolOrbitOffset(selector, options = {}) {
        const { advance = true } = options;
        const orbitAngles = {
            color: 205,
            "top-right": 328,
            "bottom-right": 38,
            "bottom-left": 152
        };
        const toolId = selector.dataset.toolId;
        const baseAngle = orbitAngles[toolId] ?? 0;
        const currentAngle = Number(selector.dataset.orbitAngle ?? baseAngle);
        const nextAngle = advance ? currentAngle + random(7, 13) : currentAngle;
        const radians = nextAngle * Math.PI / 180;
        const orbRect = orbShell?.getBoundingClientRect();
        const radiusSource = Math.min(orbRect?.width ?? 320, orbRect?.height ?? 320);
        const radiusX = radiusSource * 0.48;
        const radiusY = radiusSource * 0.39;

        selector.dataset.orbitAngle = String(nextAngle);

        return {
            x: Math.cos(radians) * radiusX,
            y: Math.sin(radians) * radiusY
        };
    }

    function driftSelector(selector) {
        const compactOrbit = window.matchMedia(COMPACT_TOOL_ORBIT_QUERY).matches;

        if (compactOrbit && selector.dataset.compactOrbitReady !== "true") {
            const initialOffset = getCompactToolOrbitOffset(selector, { advance: false });

            window.gsap.set(selector, {
                x: initialOffset.x,
                y: initialOffset.y
            });
            selector.dataset.compactOrbitReady = "true";
        } else if (!compactOrbit) {
            selector.dataset.compactOrbitReady = "false";
        }

        const nextOffset = compactOrbit
            ? getCompactToolOrbitOffset(selector)
            : {
                x: random(-52, 34),
                y: random(-42, 28)
            };

        toolTo(selector, {
            x: nextOffset.x,
            y: nextOffset.y,
            duration: compactOrbit ? random(3.8, 6.4) : random(3.2, 6.2),
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

    function setToolIconScale(selector, scale) {
        const icon = selector.querySelector("img");

        if (!icon) {
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
            "--connector-idle-opacity": 0.82,
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
            setActiveToolConnector(selector.dataset.toolId);
            setToolMotionScale(0.72);
            setToolIconScale(selector, 1.35);
        });
        selector.addEventListener("pointerleave", () => {
            setToolMotionScale(1);
            setToolIconScale(selector, 1);
        });
        selector.addEventListener("focus", () => {
            setActiveToolConnector(selector.dataset.toolId);
            setToolMotionScale(0.72);
            setToolIconScale(selector, 1.35);
        });
        selector.addEventListener("blur", () => {
            setToolMotionScale(1);
            setToolIconScale(selector, 1);
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
syncPickerUiFromRgb(115, 144, 176);
startOrbAnimation();
startToolSelectorMotion();

if (orbShell) {
    orbShell.addEventListener("pointermove", handlePointerMove);
    orbShell.addEventListener("pointerleave", resetTilt);
}

colorToolSelector?.addEventListener("click", enterColorTool);
colorToolSelector?.addEventListener("pointerenter", () => {
    setActiveToolConnector(colorToolSelector.dataset.toolId);
    setColorToolPreview(true);
});
colorToolSelector?.addEventListener("pointerleave", () => {
    setColorToolPreview(false);
    clearActiveToolConnector();
});
colorToolSelector?.addEventListener("focus", () => {
    setActiveToolConnector(colorToolSelector.dataset.toolId);
    setColorToolPreview(true);
});
colorToolSelector?.addEventListener("blur", () => {
    setColorToolPreview(false);
    clearActiveToolConnector();
});
toolSelectors.forEach((selector) => {
    selector.addEventListener("pointerenter", () => setActiveToolConnector(selector.dataset.toolId));
    selector.addEventListener("pointerleave", clearActiveToolConnector);
    selector.addEventListener("focus", () => setActiveToolConnector(selector.dataset.toolId));
    selector.addEventListener("blur", clearActiveToolConnector);
});
toolSelectors.forEach((selector) => {
    if (selector === colorToolSelector) {
        return;
    }

    selector.addEventListener("click", (event) => {
        event.preventDefault();
        playLockSound();
        shakeLockedTool(selector);
    });
});
toolBackButton?.addEventListener("click", () => {
    playBackButtonSound();
    exitColorTool();
});
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
});
colorWheelValue?.addEventListener("input", () => {
    setWheelTone(Number(colorWheelValue.value));

    if (isInteractingWithLightSlider) {
        updateLightSliderTone(colorWheelValue.value);
    } else {
        pulseLightSliderTone(colorWheelValue.value);
    }
});

colorWheelValue?.addEventListener("pointerdown", () => {
    isInteractingWithLightSlider = true;
    updateLightSliderTone(colorWheelValue.value);
});

colorWheelValue?.addEventListener("pointerup", () => {
    isInteractingWithLightSlider = false;
    stopLightSliderTone();
});

colorWheelValue?.addEventListener("pointercancel", () => {
    isInteractingWithLightSlider = false;
    stopLightSliderTone();
});

colorWheelValue?.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
        return;
    }

    isInteractingWithLightSlider = true;
    updateLightSliderTone(colorWheelValue.value);
});

colorWheelValue?.addEventListener("keyup", () => {
    isInteractingWithLightSlider = false;
    stopLightSliderTone();
});

colorWheelValue?.addEventListener("blur", () => {
    isInteractingWithLightSlider = false;
    stopLightSliderTone();
});

window.addEventListener("pointerup", () => {
    if (!isInteractingWithLightSlider) {
        return;
    }

    isInteractingWithLightSlider = false;
    stopLightSliderTone();
});

colorWheelReset?.addEventListener("click", () => {
    setWheelTone(50);
    pulseLightSliderTone(50);
});

colorWheelValueControl?.addEventListener("wheel", (event) => {
    if (!document.body.classList.contains("tool-view-active") || event.deltaY === 0) {
        return;
    }

    event.preventDefault();

    const direction = event.deltaY < 0 ? 1 : -1;
    setWheelTone(wheelTone + direction * WHEEL_TONE_SCROLL_STEP);
    pulseLightSliderTone(wheelTone);
}, { passive: false });

selectedColorSphere?.addEventListener("click", () => {
    const isOpen = colorPickerPopover?.classList.contains("is-open") ?? false;

    setColorPickerOpen(!isOpen);
});
colorPickerField?.addEventListener("pointerdown", startPickerFieldDrag);
colorPickerField?.addEventListener("pointermove", dragPickerField);
colorPickerField?.addEventListener("pointerup", endPickerFieldDrag);
colorPickerField?.addEventListener("pointercancel", endPickerFieldDrag);
colorPickerField?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();
    applyPickerColor();
});
colorPickerHue?.addEventListener("input", () => {
    pickerHue = Number(colorPickerHue.value);
    applyPickerColor();
});
colorPickerLight?.addEventListener("input", () => {
    setWheelTone(Number(colorPickerLight.value));
});
[colorPickerRed, colorPickerGreen, colorPickerBlue].forEach((input) => {
    input?.addEventListener("input", updatePickerFromRgbInputs);
});
colorPickerEyedropper?.addEventListener("click", pickColorFromScreen);
monochromePairings?.addEventListener("click", async (event) => {
    const swatch = event.target.closest("[data-mono-swatch]");

    if (!swatch || Date.now() < suppressPaletteClickUntil) {
        return;
    }

    await copyPaletteSwatch(swatch);
});
monochromePairings?.addEventListener("pointerdown", startPaletteDrag);
monochromePairings?.addEventListener("pointermove", dragPalette);
monochromePairings?.addEventListener("pointerup", endPaletteDrag);
monochromePairings?.addEventListener("pointercancel", endPaletteDrag);
paletteTitle?.addEventListener("click", () => {
    playColorDropperSound();
    setPaletteLibraryOpen(true);
});
palettePrev?.addEventListener("click", () => showRelationshipAt(activeRelationshipIndex - 1));
paletteNext?.addEventListener("click", () => showRelationshipAt(activeRelationshipIndex + 1));
paletteLibraryClose?.addEventListener("click", () => setPaletteLibraryOpen(false));
paletteLibraryBackdrop?.addEventListener("click", () => setPaletteLibraryOpen(false));
paletteLibraryGrid?.addEventListener("click", async (event) => {
    const swatch = event.target.closest(".palette-library-swatch");

    if (!swatch) {
        return;
    }

    await copyPaletteSwatch(swatch);
});
document.addEventListener("pointerdown", (event) => {
    if (
        !colorPickerPopover?.classList.contains("is-open")
        || colorPickerPopover.contains(event.target)
        || selectedColorSphere?.contains(event.target)
    ) {
        return;
    }

    setColorPickerOpen(false);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (paletteLibrary?.classList.contains("is-open")) {
            setPaletteLibraryOpen(false);
            return;
        }

        setColorPickerOpen(false);
    }
});

window.addEventListener("pagehide", () => {
    stopOrbAnimation();
});

window.addEventListener("resize", () => {
    resizeOrbCanvas();
    resizeColorWheelCanvas();
    updateToolConnector();
});

renderColorRelationshipPalettes(...hexToRgb("#7390b0"));
playIntroAnimation();
