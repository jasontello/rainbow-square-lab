const scene = document.getElementById("scene");
const grid = document.getElementById("rainbow-grid");
const gridStage = document.getElementById("rainbow-grid-stage");
const spawnButton = document.getElementById("spawn-circle-btn");
const darkModeButton = document.getElementById("dark-mode-btn");
const gravityButton = document.getElementById("gravity-btn");
const jellyButton = document.getElementById("jelly-btn");
const resetButton = document.getElementById("reset-btn");
const backButton = document.getElementById("back-button");
const introOverlay = document.getElementById("book-intro");
const introImage = document.getElementById("book-intro-image");
const glossaryTab = document.getElementById("glossary-tab");
const glossaryPage = document.getElementById("glossary-page");
const glossaryClose = document.getElementById("glossary-close");
const glossaryWheelShell = document.querySelector(".glossary-wheel-shell");
const glossaryOptions = Array.from(document.querySelectorAll("[data-glossary-index]"));
const glossaryNumber = document.getElementById("glossary-number");
const glossaryTitle = document.getElementById("glossary-title");
const glossaryDescription = document.getElementById("glossary-description");
const toolbox = document.querySelector(".toolbox");
let audioContext = null;

const BOOK_COVER_GRID_WIDTH_RATIO = 0.625;
const INTRO_START_SCALE_MULTIPLIER = 0.634;
const GLOSSARY_WHEEL_SCROLL_COOLDOWN_MS = 35;
const GLOSSARY_VERTICAL_STEP_PX = 66;

const GLOSSARY_TERMS = [
    {
        title: "Saturation",
        description: "Saturation describes how intense or pure a color feels. A highly saturated color feels vivid, while a less saturated color feels muted or gray."
    },
    {
        title: "Secondary colors",
        description: "Secondary colors are made by mixing two primary colors. Orange, green, and violet are the classic secondary colors in painting and color theory."
    },
    {
        title: "Shade or tone",
        description: "A shade is made by adding black to a color. A tone is made by adding gray, which softens the color without pushing it fully toward black."
    },
    {
        title: "Tertiary colors",
        description: "Tertiary colors are made by mixing a primary color with a neighboring secondary color, creating in-between colors like red-orange or blue-green."
    },
    {
        title: "Tint",
        description: "A tint is made by adding white to a color. Tints feel lighter, softer, and often more delicate than the original hue."
    },
    {
        title: "Value or lightness",
        description: "Value, also called lightness, describes how light or dark a color is. It helps create contrast, hierarchy, and depth even without changing hue."
    },
    {
        title: "CMYK",
        description: "CMYK is a print color system based on cyan, magenta, yellow, and black. Printed color is built through layered ink and tiny halftone dots."
    },
    {
        title: "Hue",
        description: "Hue is the name or identity of a color, like red, green, yellow, or blue. It describes where a color lives on the visible spectrum."
    },
    {
        title: "PMS",
        description: "PMS stands for Pantone Matching System. It is a standardized print color system used to reproduce specific colors consistently."
    },
    {
        title: "Primary colors",
        description: "Primary colors are base colors that can be mixed to create other colors. In traditional color theory, red, yellow, and blue are the primaries."
    },
    {
        title: "Purity",
        description: "Purity describes how much a color has been mixed with another color. A pure color feels clear and intense; added color reduces that purity."
    },
    {
        title: "RGB",
        description: "RGB is a screen color system based on red, green, and blue light. Digital displays combine these light channels to create color."
    }
];

const DEFAULT_JELLY = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    vx: 0,
    vy: 0,
    vRotation: 0,
    vScaleX: 0,
    vScaleY: 0
};

const state = {
    time: 0,
    nextBallId: 1,
    balls: [],
    drag: null,
    darkMode: false,
    heavyGravity: false,
    jellyEnabled: true,
    resetInProgress: false,
    glossaryOpen: false,
    glossarySelectedIndex: 0,
    lastGlossaryScrollTime: 0,
    introStarted: false,
    intro: {
        startScale: 1.0,
        startX: 3,
        startY: 95,
        progress: 0,
        durationMs: 1600,
        revealing: false
    },
    jelly: { ...DEFAULT_JELLY }
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function round(value) {
    return Math.round(value * 100) / 100;
}

function easeInOutCubic(value) {
    if (value < 0.5) {
        return 4 * value * value * value;
    }

    return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function wait(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function completeIntro() {
    document.body.classList.add("is-intro-complete");
    document.body.classList.remove("is-intro-playing");
    document.body.classList.remove("is-intro-active");
    document.body.classList.remove("is-intro-background-light");
}

function markIntroFinished() {
    document.body.classList.add("is-intro-finished");
}

function getIntroScale() {
    const intro = state.intro;
    const easedProgress = easeInOutCubic(intro.progress);

    return intro.startScale + (1 - intro.startScale) * easedProgress;
}

function getIntroOffsetY() {
    const easedProgress = easeInOutCubic(state.intro.progress);

    return state.intro.startY * (1 - easedProgress);
}

function getIntroOffsetX() {
    const easedProgress = easeInOutCubic(state.intro.progress);

    return state.intro.startX * (1 - easedProgress);
}

function measureIntroScale() {
    if (!introImage || !gridStage) {
        return 1;
    }

    const previousTransform = gridStage.style.transform;

    gridStage.style.transform = "none";
    const imageRect = introImage.getBoundingClientRect();
    const stageRect = gridStage.getBoundingClientRect();
    gridStage.style.transform = previousTransform;

    if (!imageRect.width || !stageRect.width) {
        return 1;
    }

    const coverGridWidth = imageRect.width * BOOK_COVER_GRID_WIDTH_RATIO;
    const measuredScale = (coverGridWidth / stageRect.width) * INTRO_START_SCALE_MULTIPLIER;

    return clamp(measuredScale, 0.38, 0.84);
}

function syncIntroScale() {
    state.intro.startScale = measureIntroScale();
}

function startIntroReveal(durationMs) {
    state.intro.durationMs = durationMs;
    state.intro.progress = 0;
    document.body.classList.remove("is-intro-returning");
    document.body.classList.remove("is-intro-finished");
    completeIntro();

    if (window.gsap) {
        state.intro.revealing = false;
        window.gsap.to(state.intro, {
            progress: 1,
            duration: durationMs / 1000,
            ease: "power3.inOut",
            onUpdate: render,
            onComplete: markIntroFinished
        });
        return;
    }

    state.intro.revealing = true;
}

function resetIntroToBook() {
    if (document.body.classList.contains("is-intro-returning")) {
        return;
    }

    const tabs = document.querySelector(".book-tabs");
    const fadingElements = [introImage, tabs].filter(Boolean);

    if (window.gsap) {
        window.gsap.killTweensOf(state.intro);
        window.gsap.killTweensOf(fadingElements);
        window.gsap.set(fadingElements, { opacity: 0 });
    } else {
        fadingElements.forEach((element) => {
            element.style.opacity = "0";
        });
    }

    state.balls.forEach((ball) => {
        if (ball.element) {
            ball.element.remove();
        }
    });

    state.balls = [];
    state.drag = null;
    state.resetInProgress = false;
    state.introStarted = true;
    state.intro.progress = 1;
    state.intro.revealing = false;
    resetJellyState();

    document.body.classList.add("is-intro-playing");
    document.body.classList.add("is-intro-returning");
    document.body.classList.add("is-intro-image-fading");
    document.body.classList.remove("is-intro-active");
    document.body.classList.remove("is-intro-complete");
    document.body.classList.remove("is-intro-finished");
    document.body.classList.remove("is-intro-background-light");

    syncIntroScale();
    render();

    const finishReturn = () => {
        if (window.gsap) {
            window.gsap.set(fadingElements, { clearProps: "opacity" });
        }

        state.introStarted = false;
        state.intro.progress = 0;
        state.intro.revealing = false;

        document.body.classList.add("is-intro-playing");
        document.body.classList.remove("is-intro-returning");
        document.body.classList.remove("is-intro-active");
        document.body.classList.remove("is-intro-complete");
        document.body.classList.remove("is-intro-finished");
        document.body.classList.remove("is-intro-background-light");
        document.body.classList.remove("is-intro-image-fading");

        enableGridIntroTrigger();
        syncIntroScale();
        render();
    };

    if (!window.gsap) {
        finishReturn();
        return;
    }

    const returnDelaySeconds = 0.24;
    const returnMoveDurationSeconds = 0.95;

    window.gsap.timeline({ onComplete: finishReturn })
        .to(state.intro, {
            progress: 0,
            duration: returnMoveDurationSeconds,
            ease: "power3.inOut",
            onUpdate: render
        }, returnDelaySeconds)
        .to(fadingElements, {
            opacity: (index, element) => element === introImage ? 0.82 : 1,
            duration: 0.42,
            ease: "power2.out"
        }, returnDelaySeconds + returnMoveDurationSeconds);
}

function runIntroTransition() {
    if (!introOverlay || !introImage) {
        state.intro.progress = 1;
        completeIntro();
        return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const backgroundFadeDuration = prefersReducedMotion ? 120 : 240;
    const revealDuration = prefersReducedMotion ? 180 : 1800;

    const playIntroWithGsap = () => {
        const tabs = document.querySelector(".book-tabs");
        const fadingElements = [introImage, tabs].filter(Boolean);

        window.gsap.timeline()
            .to(fadingElements, {
                opacity: 0,
                duration: 0.42,
                ease: "power2.out"
            }, backgroundFadeDuration / 1000)
            .call(() => {
                document.body.classList.add("is-intro-image-fading");
                startIntroReveal(revealDuration);
            }, null, backgroundFadeDuration / 1000);
    };

    const startRevealTimer = () => {
        if (state.introStarted || state.glossaryOpen) {
            return;
        }

        state.introStarted = true;
        disableGridIntroTrigger();
        document.body.classList.add("is-intro-active");
        syncIntroScale();
        render();

        if (window.gsap) {
            playIntroWithGsap();
            return;
        }

        window.setTimeout(() => {
            document.body.classList.add("is-intro-image-fading");
            startIntroReveal(revealDuration);
        }, backgroundFadeDuration);
        document.body.classList.add("is-intro-background-light");
    };

    const prepareIntro = () => {
        enableGridIntroTrigger();
        syncIntroScale();
        render();
    };

    const handleIntroKeydown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        startRevealTimer();
    };

    if (introImage.complete) {
        prepareIntro();
    } else {
        introImage.addEventListener("load", prepareIntro, { once: true });
        introImage.addEventListener("error", prepareIntro, { once: true });
    }

    const triggerElement = gridStage || introImage;

    triggerElement.addEventListener("click", startRevealTimer);
    triggerElement.addEventListener("keydown", handleIntroKeydown);
}

function enableGridIntroTrigger() {
    if (!gridStage || state.introStarted) {
        return;
    }

    gridStage.setAttribute("role", "button");
    gridStage.setAttribute("tabindex", "0");
    gridStage.setAttribute("aria-label", "Enter Rainbow Grid");
}

function disableGridIntroTrigger() {
    if (!gridStage) {
        return;
    }

    gridStage.removeAttribute("role");
    gridStage.removeAttribute("tabindex");
    gridStage.removeAttribute("aria-label");
}

function getGlossaryTransformOrigin() {
    if (!glossaryTab) {
        return "78% 18%";
    }

    const rect = glossaryTab.getBoundingClientRect();
    const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;

    return `${originX.toFixed(2)}% ${originY.toFixed(2)}%`;
}

function updateGlossarySelector(selectedIndex = state.glossarySelectedIndex) {
    const selectedTerm = GLOSSARY_TERMS[selectedIndex];

    if (!selectedTerm) {
        return;
    }

    state.glossarySelectedIndex = selectedIndex;

    if (glossaryNumber) {
        glossaryNumber.textContent = String(selectedIndex + 1).padStart(2, "0");
    }

    if (glossaryTitle) {
        glossaryTitle.textContent = selectedTerm.title;
    }

    if (glossaryDescription) {
        glossaryDescription.textContent = selectedTerm.description;
    }

    glossaryOptions.forEach((option, optionIndex) => {
        const offset = optionIndex - selectedIndex;
        const distance = Math.abs(offset);
        const y = offset * GLOSSARY_VERTICAL_STEP_PX;
        const scale = Math.max(0.72, 1 - distance * 0.035);
        const opacity = Math.max(0.12, 1 - distance * 0.11);

        option.classList.toggle("is-active", optionIndex === selectedIndex);
        option.style.transform = `translateY(calc(-50% + ${y}px)) scale(${scale})`;
        option.style.opacity = opacity.toFixed(2);
        option.setAttribute("aria-pressed", String(optionIndex === selectedIndex));
    });
}

function selectGlossaryTerm(index) {
    updateGlossarySelector(index);

    if (!window.gsap || !glossaryTitle || !glossaryDescription) {
        return;
    }

    window.gsap.fromTo([glossaryTitle, glossaryDescription], {
        opacity: 0,
        y: 14
    }, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        ease: "power2.out",
        stagger: 0.04
    });
}

function stepGlossarySelection(direction) {
    const nextIndex = clamp(
        state.glossarySelectedIndex + direction,
        0,
        GLOSSARY_TERMS.length - 1
    );

    if (nextIndex === state.glossarySelectedIndex) {
        return;
    }

    selectGlossaryTerm(nextIndex);
}

function handleGlossaryWheel(event) {
    if (!state.glossaryOpen) {
        return;
    }

    event.preventDefault();

    const now = performance.now();

    if (now - state.lastGlossaryScrollTime < GLOSSARY_WHEEL_SCROLL_COOLDOWN_MS) {
        return;
    }

    if (Math.abs(event.deltaY) < 8) {
        return;
    }

    state.lastGlossaryScrollTime = now;
    stepGlossarySelection(event.deltaY > 0 ? 1 : -1);
}

function openGlossaryPage(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!glossaryPage || state.glossaryOpen) {
        return;
    }

    state.glossaryOpen = true;
    disableGridIntroTrigger();
    updateGlossarySelector();
    glossaryPage.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-glossary-open");

    const transformOrigin = getGlossaryTransformOrigin();

    if (!window.gsap) {
        glossaryPage.style.opacity = "1";
        glossaryPage.style.transform = "scale(1)";
        glossaryPage.style.transformOrigin = transformOrigin;
        return;
    }

    window.gsap.killTweensOf(glossaryPage);
    window.gsap.fromTo(glossaryPage, {
        opacity: 0,
        scale: 0.72,
        transformOrigin
    }, {
        opacity: 1,
        scale: 1,
        duration: 0.82,
        ease: "power3.inOut"
    });
}

function closeGlossaryPage() {
    if (!glossaryPage || !state.glossaryOpen) {
        return;
    }

    const finishClose = () => {
        state.glossaryOpen = false;
        glossaryPage.setAttribute("aria-hidden", "true");
        document.body.classList.remove("is-glossary-open");

        if (window.gsap) {
            window.gsap.set(glossaryPage, { clearProps: "opacity,scale,transform,transformOrigin" });
        } else {
            glossaryPage.style.opacity = "";
            glossaryPage.style.transform = "";
            glossaryPage.style.transformOrigin = "";
        }

        enableGridIntroTrigger();
    };

    if (!window.gsap) {
        finishClose();
        return;
    }

    window.gsap.killTweensOf(glossaryPage);
    window.gsap.to(glossaryPage, {
        opacity: 0,
        scale: 0.72,
        transformOrigin: getGlossaryTransformOrigin(),
        duration: 0.52,
        ease: "power2.inOut",
        onComplete: finishClose
    });
}

function getAudioContext() {
    if (typeof window.AudioContext !== "function" && typeof window.webkitAudioContext !== "function") {
        return null;
    }

    if (!audioContext) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextCtor();
    }

    return audioContext;
}

function playPopSound(timeOffset = 0) {
    const context = getAudioContext();

    if (!context) {
        return;
    }

    if (context.state === "suspended") {
        context.resume().catch(() => {});
    }

    const startTime = context.currentTime + timeOffset;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(320, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, startTime + 0.08);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.12);
}

function getSceneRect() {
    return scene.getBoundingClientRect();
}

function getGridBounds() {
    const sceneRect = getSceneRect();
    const gridRect = grid.getBoundingClientRect();

    return {
        left: gridRect.left - sceneRect.left,
        right: gridRect.right - sceneRect.left,
        top: gridRect.top - sceneRect.top,
        bottom: gridRect.bottom - sceneRect.top,
        centerX: gridRect.left - sceneRect.left + gridRect.width / 2,
        centerY: gridRect.top - sceneRect.top + gridRect.height / 2,
        width: gridRect.width,
        height: gridRect.height
    };
}

function getToolboxBounds() {
    if (!toolbox) {
        return null;
    }

    const sceneRect = getSceneRect();
    const toolboxRect = toolbox.getBoundingClientRect();

    return {
        left: toolboxRect.left - sceneRect.left,
        right: toolboxRect.right - sceneRect.left,
        top: toolboxRect.top - sceneRect.top,
        bottom: toolboxRect.bottom - sceneRect.top
    };
}

function getPointerPosition(event) {
    const rect = getSceneRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function updateBallElement(ball) {
    ball.element.style.setProperty("--x", ball.x.toFixed(2));
    ball.element.style.setProperty("--y", ball.y.toFixed(2));
    ball.element.style.setProperty("--size", ball.size.toFixed(2));
}

function createBallElement(ball) {
    const element = document.createElement("div");

    element.className = "orb";
    element.dataset.ballId = String(ball.id);
    scene.appendChild(element);

    ball.element = element;
    updateBallElement(ball);

    element.addEventListener("pointerdown", (event) => {
        startDrag(event, ball);
    });
}

function resetJellyState() {
    Object.assign(state.jelly, DEFAULT_JELLY);
}

function animateBallPop(ball, index) {
    if (!ball.element) {
        return Promise.resolve();
    }

    const element = ball.element;
    const baseTransform = `translate3d(${ball.x.toFixed(2)}px, ${ball.y.toFixed(2)}px, 0)`;
    const jitter = 4;
    const startDelay = index * 0.04;

    element.classList.add("is-popping");
    playPopSound(startDelay);

    const animation = element.animate(
        [
            { transform: baseTransform, opacity: 1, offset: 0 },
            { transform: `translate3d(${(ball.x - jitter).toFixed(2)}px, ${(ball.y - 1).toFixed(2)}px, 0) scale(1.03)`, opacity: 1, offset: 0.18 },
            { transform: `translate3d(${(ball.x + jitter).toFixed(2)}px, ${(ball.y + 1).toFixed(2)}px, 0) scale(0.98)`, opacity: 1, offset: 0.36 },
            { transform: `translate3d(${(ball.x - jitter * 0.6).toFixed(2)}px, ${(ball.y - 1.5).toFixed(2)}px, 0) scale(1.02)`, opacity: 1, offset: 0.52 },
            { transform: `translate3d(${ball.x.toFixed(2)}px, ${ball.y.toFixed(2)}px, 0) scale(1.08)`, opacity: 1, offset: 0.68 },
            { transform: `translate3d(${ball.x.toFixed(2)}px, ${ball.y.toFixed(2)}px, 0) scale(0.1)`, opacity: 0, offset: 1 }
        ],
        {
            duration: 280,
            delay: startDelay * 1000,
            easing: "cubic-bezier(0.22, 0.9, 0.36, 1)",
            fill: "forwards"
        }
    );

    return animation.finished
        .catch(() => {})
        .then(() => {
            element.remove();
        });
}

function spawnBall() {
    if (state.resetInProgress) {
        return null;
    }

    const rect = getSceneRect();
    const toolboxBounds = getToolboxBounds();
    const size = clamp(rect.width * 0.05, 28, 44);
    const fallbackX = rect.width - Math.min(130, rect.width * 0.16);
    const spawnX = toolboxBounds
        ? clamp(toolboxBounds.left - size - 30, size, rect.width - size)
        : fallbackX;
    const centerY = toolboxBounds
        ? (toolboxBounds.top + toolboxBounds.bottom) / 2
        : rect.height * 0.5;
    const spawnY = centerY + (Math.random() - 0.5) * Math.min(160, rect.height * 0.28);
    const driftAngle = Math.random() * Math.PI * 2;
    const driftSpeed = 24 + Math.random() * 28;

    const ball = {
        id: state.nextBallId++,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(driftAngle) * driftSpeed,
        vy: Math.sin(driftAngle) * driftSpeed,
        size,
        radius: size / 2,
        dragging: false,
        touchingGrid: false,
        element: null
    };

    state.balls.push(ball);
    createBallElement(ball);

    return ball;
}

function startDrag(event, ball) {
    if (state.drag && state.drag.pointerId !== event.pointerId) {
        return;
    }

    event.preventDefault();
    ball.dragging = true;
    ball.touchingGrid = false;
    ball.element.classList.add("is-dragging");

    const pointer = getPointerPosition(event);

    state.drag = {
        pointerId: event.pointerId,
        ball,
        lastX: pointer.x,
        lastY: pointer.y,
        lastTime: performance.now()
    };

    if (ball.element.setPointerCapture) {
        ball.element.setPointerCapture(event.pointerId);
    }
}

function stopDrag(pointerId) {
    if (!state.drag || state.drag.pointerId !== pointerId) {
        return;
    }

    const { ball } = state.drag;
    ball.dragging = false;
    ball.element.classList.remove("is-dragging");
    state.drag = null;
}

function handlePointerMove(event) {
    if (!state.drag || state.drag.pointerId !== event.pointerId) {
        return;
    }

    const pointer = getPointerPosition(event);
    const rect = getSceneRect();
    const now = performance.now();
    const dt = Math.max((now - state.drag.lastTime) / 1000, 1 / 240);
    const ball = state.drag.ball;

    ball.x = clamp(pointer.x, ball.radius, rect.width - ball.radius);
    ball.y = clamp(pointer.y, ball.radius, rect.height - ball.radius);
    ball.vx = clamp((pointer.x - state.drag.lastX) / dt, -900, 2900);
    ball.vy = clamp((pointer.y - state.drag.lastY) / dt, -900, 2900);

    state.drag.lastX = pointer.x;
    state.drag.lastY = pointer.y;
    state.drag.lastTime = now;

    updateBallElement(ball);
}

function handleWallCollision(ball, width, height) {
    const bounce = 0.92;

    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * bounce;
    } else if (ball.x + ball.radius > width) {
        ball.x = width - ball.radius;
        ball.vx = -Math.abs(ball.vx) * bounce;
    }

    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy) * bounce;
    } else if (ball.y + ball.radius > height) {
        ball.y = height - ball.radius;
        ball.vy = -Math.abs(ball.vy) * bounce;
    }
}

function applyJellyImpact(ball, normalX, normalY, bounds) {
    if (!state.jellyEnabled) {
        return;
    }

    const impactSpeed = clamp(Math.hypot(ball.vx, ball.vy), 45, 260);
    const offsetX = (ball.x - bounds.centerX) / (bounds.width / 2 || 1);
    const offsetY = (ball.y - bounds.centerY) / (bounds.height / 2 || 1);
    const jelly = state.jelly;

    jelly.vx += ball.vx * 0.02;
    jelly.vy += ball.vy * 0.02;
    jelly.vRotation += (offsetY * normalX - offsetX * normalY) * impactSpeed * 0.004;

    if (Math.abs(normalX) > Math.abs(normalY)) {
        jelly.vScaleX -= impactSpeed * 0.0009;
        jelly.vScaleY += impactSpeed * 0.0011;
    } else {
        jelly.vScaleX += impactSpeed * 0.0011;
        jelly.vScaleY -= impactSpeed * 0.0009;
    }
}

function handleGridCollision(ball, bounds) {
    const nearestX = clamp(ball.x, bounds.left, bounds.right);
    const nearestY = clamp(ball.y, bounds.top, bounds.bottom);
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared >= ball.radius * ball.radius) {
        ball.touchingGrid = false;
        return;
    }

    let normalX = 0;
    let normalY = 0;
    let distance = Math.sqrt(distanceSquared);

    if (distance > 0.0001) {
        normalX = dx / distance;
        normalY = dy / distance;
    } else {
        const leftGap = Math.abs(ball.x - bounds.left);
        const rightGap = Math.abs(bounds.right - ball.x);
        const topGap = Math.abs(ball.y - bounds.top);
        const bottomGap = Math.abs(bounds.bottom - ball.y);
        const smallestGap = Math.min(leftGap, rightGap, topGap, bottomGap);

        if (smallestGap === leftGap) {
            normalX = -1;
        } else if (smallestGap === rightGap) {
            normalX = 1;
        } else if (smallestGap === topGap) {
            normalY = -1;
        } else {
            normalY = 1;
        }

        distance = 0;
    }

    const overlap = ball.radius - distance;
    ball.x += normalX * overlap;
    ball.y += normalY * overlap;

    const velocityAlongNormal = ball.vx * normalX + ball.vy * normalY;

    if (velocityAlongNormal < 0) {
        const bounceStrength = 1.08;
        ball.vx -= (1 + bounceStrength) * velocityAlongNormal * normalX;
        ball.vy -= (1 + bounceStrength) * velocityAlongNormal * normalY;
    }

    ball.vx *= 0.985;
    ball.vy *= 0.985;

    if (!ball.touchingGrid) {
        applyJellyImpact(ball, normalX, normalY, bounds);
    }

    ball.touchingGrid = true;
}

function stepSpring(current, velocity, target, stiffness, damping, dt) {
    velocity += (target - current) * stiffness * dt;
    velocity *= Math.exp(-damping * dt);
    current += velocity * dt;

    return [current, velocity];
}

function updateJelly(dt) {
    const jelly = state.jelly;

    [jelly.x, jelly.vx] = stepSpring(jelly.x, jelly.vx, 0, 25, 8.5, dt);
    [jelly.y, jelly.vy] = stepSpring(jelly.y, jelly.vy, 0, 25, 8.5, dt);
    [jelly.rotation, jelly.vRotation] = stepSpring(jelly.rotation, jelly.vRotation, 0, 24, 8.4, dt);
    [jelly.scaleX, jelly.vScaleX] = stepSpring(jelly.scaleX, jelly.vScaleX, 1, 28, 10.5, dt);
    [jelly.scaleY, jelly.vScaleY] = stepSpring(jelly.scaleY, jelly.vScaleY, 1, 28, 10.5, dt);

    jelly.x = clamp(jelly.x, -24, 24);
    jelly.y = clamp(jelly.y, -24, 24);
    jelly.rotation = clamp(jelly.rotation, -5, 5);
    jelly.scaleX = clamp(jelly.scaleX, 0.88, 1.18);
    jelly.scaleY = clamp(jelly.scaleY, 0.88, 1.18);
    jelly.vScaleX = clamp(jelly.vScaleX, -2.5, 2.5);
    jelly.vScaleY = clamp(jelly.vScaleY, -2.5, 2.5);
}

function updateIntro(dt) {
    const intro = state.intro;

    if (!intro.revealing) {
        return;
    }

    intro.progress = clamp(intro.progress + (dt * 1000) / intro.durationMs, 0, 1);

    if (intro.progress >= 1) {
        intro.revealing = false;
        markIntroFinished();
    }
}

function update(dt) {
    state.time += dt;
    updateIntro(dt);

    const rect = getSceneRect();
    const bounds = getGridBounds();
    const gravityStrength = state.heavyGravity ? 72 : 12;
    const driftStrength = state.heavyGravity ? 3 : 10;
    const floatStrength = state.heavyGravity ? 2.5 : 8;
    const dragFactor = state.heavyGravity ? 0.992 : 0.9965;

    for (const ball of state.balls) {
        if (!ball.dragging) {
            const driftX = Math.cos(state.time * 0.75 + ball.id * 0.6) * driftStrength;
            const driftY = Math.sin(state.time * 0.62 + ball.id * 0.8) * floatStrength;

            ball.vx += driftX * dt;
            ball.vy += (gravityStrength + driftY) * dt;
            ball.vx *= Math.pow(dragFactor, dt * 60);
            ball.vy *= Math.pow(dragFactor, dt * 60);
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            handleWallCollision(ball, rect.width, rect.height);
            handleGridCollision(ball, bounds);
        }

        updateBallElement(ball);
    }

    updateJelly(dt);
    render();
}

function render() {
    const jelly = state.jelly;
    const introScale = getIntroScale();
    const introOffsetX = getIntroOffsetX();
    const introOffsetY = getIntroOffsetY();

    if (gridStage) {
        gridStage.style.transform = `translate(${introOffsetX.toFixed(2)}px, ${introOffsetY.toFixed(2)}px) scale(${introScale.toFixed(3)})`;
    }

    grid.style.transform = [
        `translate(${jelly.x.toFixed(2)}px, ${jelly.y.toFixed(2)}px)`,
        `rotate(${jelly.rotation.toFixed(2)}deg)`,
        `scale(${jelly.scaleX.toFixed(3)}, ${jelly.scaleY.toFixed(3)})`
    ].join(" ");
}

function renderGameToText() {
    const sceneRect = getSceneRect();
    const bounds = getGridBounds();

    return JSON.stringify({
        mode: "interactive-art",
        coordinates: "origin at top-left of the scene, x grows right, y grows down",
        scene: {
            width: round(sceneRect.width),
            height: round(sceneRect.height)
        },
        grid: {
            left: round(bounds.left),
            top: round(bounds.top),
            width: round(bounds.width),
            height: round(bounds.height),
            jelly: {
                x: round(state.jelly.x),
                y: round(state.jelly.y),
                rotation: round(state.jelly.rotation),
                scaleX: round(state.jelly.scaleX),
                scaleY: round(state.jelly.scaleY)
            }
        },
        balls: state.balls.map((ball) => ({
            id: ball.id,
            x: round(ball.x),
            y: round(ball.y),
            vx: round(ball.vx),
            vy: round(ball.vy),
            radius: round(ball.radius),
            dragging: ball.dragging
        })),
        darkMode: state.darkMode,
        heavyGravity: state.heavyGravity,
        jellyEnabled: state.jellyEnabled,
        controls: "Use the button on the right to spawn a black circle, then drag and throw it into the square."
    });
}

function syncDarkModeButton() {
    if (!darkModeButton) {
        return;
    }

    const label = state.darkMode ? "Disable dark mode" : "Enable dark mode";

    darkModeButton.setAttribute("aria-label", label);
    darkModeButton.setAttribute("title", label);
    darkModeButton.classList.toggle("is-active", state.darkMode);
}

function syncGravityButton() {
    if (!gravityButton) {
        return;
    }

    const label = state.heavyGravity ? "Disable heavy gravity" : "Enable heavy gravity";

    gravityButton.setAttribute("aria-label", label);
    gravityButton.setAttribute("title", label);
    gravityButton.classList.toggle("is-active", state.heavyGravity);
}

function syncJellyButton() {
    if (!jellyButton) {
        return;
    }

    const label = state.jellyEnabled ? "Disable jelly motion" : "Enable jelly motion";

    jellyButton.setAttribute("aria-label", label);
    jellyButton.setAttribute("title", label);
    jellyButton.classList.toggle("is-active", state.jellyEnabled);
}

function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle("is-dark-mode", state.darkMode);
    syncDarkModeButton();
}

function toggleGravity() {
    state.heavyGravity = !state.heavyGravity;
    syncGravityButton();
}

function toggleJelly() {
    state.jellyEnabled = !state.jellyEnabled;
    if (!state.jellyEnabled) {
        resetJellyState();
        render();
    }
    syncJellyButton();
}

function resetScene() {
    if (state.resetInProgress) {
        return;
    }

    const ballsToPop = [...state.balls];

    state.resetInProgress = true;
    state.drag = null;
    state.balls = [];
    resetJellyState();
    render();

    if (ballsToPop.length === 0) {
        state.resetInProgress = false;
        return;
    }

    Promise.all(ballsToPop.map((ball, index) => animateBallPop(ball, index)))
        .finally(async () => {
            await wait(20);
            state.resetInProgress = false;
        });
}

let lastFrameTime = performance.now();

function animate(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 1 / 30);
    lastFrameTime = now;
    update(dt);
    window.requestAnimationFrame(animate);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));

    for (let index = 0; index < steps; index += 1) {
        update(1 / 60);
    }

    return renderGameToText();
};

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", (event) => stopDrag(event.pointerId));
window.addEventListener("pointercancel", (event) => stopDrag(event.pointerId));
window.addEventListener("resize", () => {
    syncIntroScale();
    render();
});
window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeGlossaryPage();
        return;
    }

    if (!state.glossaryOpen) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        stepGlossarySelection(1);
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        stepGlossarySelection(-1);
    }
});
spawnButton.addEventListener("click", spawnBall);
if (darkModeButton) {
    darkModeButton.addEventListener("click", toggleDarkMode);
}
if (gravityButton) {
    gravityButton.addEventListener("click", toggleGravity);
}
if (jellyButton) {
    jellyButton.addEventListener("click", toggleJelly);
}
if (resetButton) {
    resetButton.addEventListener("click", resetScene);
}
if (backButton) {
    backButton.addEventListener("click", resetIntroToBook);
}
if (glossaryTab) {
    glossaryTab.addEventListener("click", openGlossaryPage);
}
if (glossaryClose) {
    glossaryClose.addEventListener("click", closeGlossaryPage);
}
if (glossaryWheelShell) {
    glossaryWheelShell.addEventListener("wheel", handleGlossaryWheel, { passive: false });
}
glossaryOptions.forEach((option) => {
    option.addEventListener("click", () => {
        selectGlossaryTerm(Number(option.dataset.glossaryIndex));
    });
});

syncDarkModeButton();
syncGravityButton();
syncJellyButton();
updateGlossarySelector();
syncIntroScale();
runIntroTransition();
render();
window.requestAnimationFrame(animate);
