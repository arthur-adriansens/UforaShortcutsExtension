// content.js

/* 1. UI SHORTCUTS */

let showShortcuts = false;
const shortcutButtons = [];

const coursesBtnWrapper = document.querySelector("d2l-labs-navigation-main-header .d2l-navigation-s-course-menu");
const coursesBtn = coursesBtnWrapper?.children?.[0]?.shadowRoot?.querySelector("button");

const notificationsBtnWrapper = document.querySelector("d2l-labs-navigation-main-header .d2l-navigation-s-notification:last-child");
const notificationsBtn = notificationsBtnWrapper?.children?.[0]?.shadowRoot?.querySelector("button");
const buttonsWithShortcuts = [coursesBtnWrapper, notificationsBtn];

function changeShortcut(e) {
    console.log(e.target.dataset.courseId);
}

function createShortcutButton(letter, wrapper, styleExtra = "") {
    const btn = document.createElement("div");
    btn.classList.add("shortcutButton");
    btn.textContent = letter;

    if (styleExtra) btn.style.cssText += styleExtra;
    btn.onclick = changeShortcut;

    shortcutButtons.push(btn);
    wrapper.parentNode.insertBefore(btn, wrapper);
}

let buttonsAdded = false;
let courseButtonsRetries = 0;
const maxCourseButtonsRetries = 50; // 5 seconds

function createCourseShortcutButtons() {
    if (buttonsAdded) return;

    const courses = document.querySelectorAll(".d2l-courseselector-wrapper .d2l-datalist-item");

    // If courses are not loaded yet, retry after a short delay (up to max retries)
    if (courses.length === 0) {
        if (courseButtonsRetries < maxCourseButtonsRetries) {
            courseButtonsRetries++;
            setTimeout(createCourseShortcutButtons, 100);
        }
        return;
    }

    // Add shortcut buttons to each course item
    for (let course of courses) {
        const course_id = course.querySelector("[data-org-unit-id]")?.getAttribute("data-org-unit-id");
        if (course_id === undefined) continue;
        buttonsAdded = true;

        const btn = document.createElement("div");
        btn.classList.add("shortcutButton");
        btn.style.cssText += `position: relative; display: ${showShortcuts ? "flex" : "none"}; opacity: 1; margin-right: .5rem; font-size: 1.1rem;`;

        btn.textContent = "+";
        btn.dataset.courseId = course_id;

        btn.onclick = changeShortcut;

        shortcutButtons.push(btn);
        const pinButton = course.querySelector("d2l-button-toggle");
        pinButton.parentNode.insertBefore(btn, pinButton);
    }
}

function toggleShowShortcuts(e, state = true) {
    if (e.key !== "Alt") return;

    e.preventDefault();
    showShortcuts = state;

    shortcutButtons.forEach((btn) => {
        if (!btn) return;

        btn.style.pointerEvents = showShortcuts ? "auto" : "none";

        if (!btn.style.display) btn.style.opacity = showShortcuts ? "1" : "0";
        else btn.style.display = showShortcuts ? "flex" : "none";
    });
}

function uiShortcuts(e) {
    // Do not intercept keystrokes if the user is typing inside an input field or text area.
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";

    if (["input", "textarea"].includes(activeTag) || document.activeElement.isContentEditable) return;

    switch (e.key) {
        case "Alt":
            toggleShowShortcuts(e, true);
            break;

        case "c":
            // simulate full interaction instead of just .click() (realistic event)
            if (!coursesBtn) return;
            createCourseShortcutButtons();

            // ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
            // uses mouseup instead of click (click doesn't trigger the menu because of event listeners)
            coursesBtn.dispatchEvent(
                new MouseEvent("mouseup", {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                }),
            );

            break;

        case "u":
            if (!notificationsBtn) return;

            notificationsBtn.dispatchEvent(
                new MouseEvent("mouseup", {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                }),
            );

            break;
    }
}

/* 2. VIDEO SHORTCUTS */

// Adds keyboard shortcuts to d2l-labs-media-player

const skipInterval = 5; // seconds
let mouseInVideoPlayer = false;
let videoWrapper, video, muteButton;

function videoShortcuts(e) {
    // Do not intercept keystrokes if the user is typing inside an input field or text area.
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";

    if (["input", "textarea"].includes(activeTag) || document.activeElement.isContentEditable) return;
    if (!videoWrapper?.shadowRoot || !video) return;

    // Prevent page moving
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key) && mouseInVideoPlayer) e.preventDefault();
    if (e.key == " ") e.preventDefault();

    switch (e.key) {
        case "ArrowRight":
            video.currentTime += skipInterval;
            break;

        case "ArrowLeft":
            video.currentTime -= skipInterval;
            break;

        case "ArrowUp":
            video.volume = Math.min(1, video.volume + 0.1);
            break;

        case "ArrowDown":
            video.volume = Math.max(0, video.volume - 0.1);
            break;

        case " ":
            let promise;
            if (video.paused) {
                promise = video.play();
            } else {
                promise = video.pause();
            }

            promise?.catch((error) => {
                // Ignore AbortError when play is interrupted (happens when video is loading after seeking)
                if (error.name !== "AbortError") {
                    console.warn("Play error:", error);
                }
            });

            break;

        case "f":
            if (document.fullscreenElement?.nodeName === "D2L-LABS-MEDIA-PLAYER") {
                document.exitFullscreen();
                break;
            }

            videoWrapper.requestFullscreen();
            break;

        case "m":
            muteButton?.click();
            break;
    }
}

// Setup eventlisteners
function setupVideoShortcuts() {
    document.addEventListener("keydown", videoShortcuts);

    if (videoWrapper) {
        videoWrapper.addEventListener("mouseenter", mouseInVideo);
        videoWrapper.addEventListener("mouseleave", mouseOutPlayer);
    }

    console.log("Shortcuts loaded!");
}

/* 3. HELPER FUNCTIONS */

function mouseInVideo() {
    // Checks if the mouse is inside the player wrapper area
    mouseInVideoPlayer = true;
}

function mouseOutPlayer() {
    // Checks if the mouse leaves the player wrapper area
    mouseInVideoPlayer = false;
}

/* 4. INITIALIZE ALL SHORTCUTS */

// 1. UI SHORTCUTS
createShortcutButton("c", coursesBtnWrapper);
createShortcutButton("u", notificationsBtnWrapper?.children?.[0], "margin-left: -6px;");
document.addEventListener("keydown", uiShortcuts);
document.addEventListener("keyup", (e) => toggleShowShortcuts(e, false));

window.onload = () => {
    coursesBtn.addEventListener("click", createCourseShortcutButtons, { once: true });

    // 2. VIDEO SHORTCUTS

    let retries = 0;
    const maxRetries = 50; // Retry for up to 5 seconds (50 * 100ms)
    const searchVideoPlayer = () => {
        videoWrapper = document.querySelector("d2l-labs-media-player");

        // Try to access shadowRoot (possibly not loaded yet ==> retry)
        if (videoWrapper?.shadowRoot) {
            video = videoWrapper.shadowRoot.querySelector("video");
            muteButton = videoWrapper.shadowRoot.querySelector("#d2l-labs-media-player-volume-container > d2l-button-icon");
        }

        // If we found the video element, set up shortcuts
        if (video && videoWrapper?.shadowRoot) {
            setupVideoShortcuts();
        } else if (retries < maxRetries) {
            // Retry after 100ms
            retries++;
            setTimeout(searchVideoPlayer, 100);
        } else {
            console.log("Failed to initialize video shortcuts: Could not find video player or shadow DOM");
        }
    };

    searchVideoPlayer();
};
