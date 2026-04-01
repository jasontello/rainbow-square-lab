const scene = document.getElementById("scene");
const grid = document.getElementById("rainbow-grid");
const spawnButton = document.getElementById("spawn-circle-btn");
const toolbox = document.querySelector(".toolbox");

const state = {
    time: 0,
    nextBallId: 1,
    balls: [],
    drag: null,
    jelly: {
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
    }
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function round(value) {
    return Math.round(value * 100) / 100;
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

function spawnBall() {
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

function update(dt) {
    state.time += dt;

    const rect = getSceneRect();
    const bounds = getGridBounds();

    for (const ball of state.balls) {
        if (!ball.dragging) {
            const driftX = Math.cos(state.time * 0.75 + ball.id * 0.6) * 10;
            const driftY = Math.sin(state.time * 0.62 + ball.id * 0.8) * 8;

            ball.vx += driftX * dt;
            ball.vy += (12 + driftY) * dt;
            ball.vx *= Math.pow(0.9965, dt * 60);
            ball.vy *= Math.pow(0.9965, dt * 60);
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
        controls: "Use the button on the right to spawn a black circle, then drag and throw it into the square."
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
window.addEventListener("resize", render);
spawnButton.addEventListener("click", spawnBall);

render();
window.requestAnimationFrame(animate);
