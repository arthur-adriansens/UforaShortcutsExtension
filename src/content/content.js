// content.js

/* 1. UI SHORTCUTS */

let showShortcuts = false;
const shortcutButtons = [];
const buttonsWithShortcuts = [];
let coursesBtnWrapper, coursesBtn, notificationsBtnWrapper, notificationsBtn;

function getElements() {
    coursesBtnWrapper = document.querySelector("d2l-labs-navigation-main-header .d2l-navigation-s-course-menu");
    coursesBtn = coursesBtnWrapper?.children?.[0]?.shadowRoot?.querySelector("button");

    if (!coursesBtn) return false;
    buttonsWithShortcuts.push(coursesBtnWrapper);

    notificationsBtnWrapper = document.querySelector("d2l-labs-navigation-main-header .d2l-navigation-s-notification:last-child");
    notificationsBtn = notificationsBtnWrapper?.children?.[0]?.shadowRoot?.querySelector("button");

    if (!notificationsBtn) return false;
    buttonsWithShortcuts.push(notificationsBtn);

    createShortcutButton("c", coursesBtnWrapper);
    createShortcutButton("u", notificationsBtnWrapper?.children?.[0], "margin-left: -6px;");

    coursesBtn.addEventListener("click", createCourseShortcutButtons, { once: true });
    coursesBtnWrapper.children[0];

    return true;
}

const shortcutConfigDefaults = {
    c: { action: "Open course menu / show course shortcuts", group: "uiShortcuts" },
    u: { action: "Open notifications", group: "uiShortcuts" },
    Alt: { action: "Show shortcut badges", group: "uiShortcuts" },

    Space: { action: "Play / pause", group: "videoShortcuts" },
    ArrowRight: { action: "Skip forward 5s", group: "videoShortcuts" },
    ArrowLeft: { action: "Skip back 5s", group: "videoShortcuts" },
    ArrowUp: { action: "Volume up", group: "videoShortcuts" },
    ArrowDown: { action: "Volume down", group: "videoShortcuts" },
    f: { action: "Toggle fullscreen", group: "videoShortcuts" },
    m: { action: "Mute / unmute", group: "videoShortcuts" },
};

let courseShortcuts = {}; // Maps courseId -> shortcut key
let toastTimer;
let toastHover = false;

async function saveShortcutsToStorage() {
    if (!chrome?.storage?.local) return;

    try {
        await chrome.storage.local.set({ shortcutConfig: shortcutConfigDefaults, courseShortcuts });
    } catch (err) {
        console.warn("Failed to save shortcuts to storage:", err);
    }
}

async function changeShortcut(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e?.target?.dataset?.courseId !== undefined) {
        showCourseShortcutPopup(e.target.dataset.courseId);
    }
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
        btn.style.cssText += `position: relative; pointer-events: ${showShortcuts ? "auto" : "none"}; display: ${showShortcuts ? "flex" : "none"}; opacity: 1; margin-right: .5rem;`;

        btn.textContent = courseShortcuts[course_id] || "+";
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

            coursesBtn.dispatchEvent(
                new MouseEvent("mouseup", {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                }),
            );
            showShortcutToast('Shortcut "c" → Open course menu');
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
            showShortcutToast('Shortcut "u" → Open notifications');
            break;

        default:
            const courseId = Object.keys(courseShortcuts).find((id) => courseShortcuts[id] === e.key);
            if (!courseId || mouseInVideoPlayer) break;

            showShortcutToast(`Shortcut "${e.key}" → Open course ${courseId}`);
            window.location.href = `/d2l/home/${courseId}`;
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

function getShortcutStatus(value) {
    const courseId = currentCourseSelected;

    const ch = String(value || "")
        .trim()
        .toLowerCase();
    if (ch.length !== 1 || /\s/.test(ch)) {
        return { valid: false, message: "Invalid shortcut" };
    }

    const conflict = Object.entries(courseShortcuts).find(([id, key]) => key === ch && id !== courseId);
    if (conflict) {
        return { valid: false, message: `"${ch}" is already in use` };
    }

    return {
        valid: true,
        message: courseShortcuts[courseId] === ch ? `Same as current shortcut: "${ch}"` : `Available shortcut: "${ch}"`,
    };
}

function updateCourseShortcutButton(courseId) {
    shortcutButtons.forEach((btn) => {
        if (btn.dataset.courseId === courseId) {
            btn.textContent = courseShortcuts[courseId] || "+";
        }
    });
}

const closePopup = () => {
    if (!editor) return;

    editor.overlay.style.display = "none";
    popupOpen = false;
};

const updateStatus = () => {
    if (!editor) return;

    const { valid, message } = getShortcutStatus(editor.input.value);
    editor.status.textContent = message;
    editor.status.style.color = valid ? "#0b6f31" : "#b03535";
    editor.saveBtn.disabled = !valid;
    editor.saveBtn.style.opacity = valid ? "1" : "0.55";
};

/* 4. AUTO LOGIN */

function login() {
    if (window.location.href !== "https://elosp.ugent.be/welcome") return;

    const login_btn = document.getElementById("ugent-login-button");
    login_btn?.click();
}

/* 5. SHORTCUT POPUPS */

// New/edit shortcut popup (midden van scherm)

// als parameter course = true ==> title: "course shortcut" bovenaan (naast close button),
// input field met huidige shortcut (of leeg) ==> shortcut check text er (in klein) juist onder (groen: check, nog niet in gebruik, oranje: check, al in gebruik, rood: niet geldig)
// dropdown met alle mogelijke tabladen van een course => via fetch alle tabs ophalen van de course (programmeer ik zelf wel) ("Ufora/start", "Inhoud", "Agenda", "Cijfers", ...)
// cancel & save button

let popupOpen = false;
let editor;
let currentCourseSelected;

function createShortcutEditorPopup() {
    const overlay = document.createElement("div");
    overlay.classList.add("shortcutEditorPopupOverlay");

    const box = document.createElement("div");
    box.classList.add("shortcutEditorPopup");
    box.innerHTML = `
        <div class="top">
            <h2 class="d2l-heading vui-heading-4">Course shortcut</h2>
            <button type="button" id="shortcutPopupClose" class="d2l-body-compact">✕</button>
        </div>
        <label for="shortcutPopupInput" class="d2l-body-compact">Shortcut</label>
        <input id="shortcutPopupInput" maxlength="1" class="d2l-body-compact" />
        <div id="shortcutPopupStatus" class="d2l-body-compact"></div>

        <div class="controls">
            <button id="shortcutPopupCancel" type="button">Cancel</button>
            <button id="shortcutPopupSave" type="button">Save</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    editor = {
        overlay: overlay,
        input: box.querySelector("#shortcutPopupInput"),
        status: box.querySelector("#shortcutPopupStatus"),
        closeBtn: box.querySelector("#shortcutPopupClose"),
        cancelBtn: box.querySelector("#shortcutPopupCancel"),
        saveBtn: box.querySelector("#shortcutPopupSave"),
    };

    editor.overlay.addEventListener("click", (event) => {
        if (event.target === editor.overlay) closePopup();
    });

    editor.closeBtn.addEventListener("click", closePopup);
    editor.cancelBtn.addEventListener("click", closePopup);
    editor.saveBtn.addEventListener("click", async () => {
        const value = String(editor.input.value || "")
            .trim()
            .toLowerCase();
        const { valid } = getShortcutStatus(value);
        if (!valid) return;

        courseShortcuts[currentCourseSelected] = value;
        await saveShortcutsToStorage();
        updateCourseShortcutButton(currentCourseSelected);
        closePopup();
        showShortcutToast(`Saved shortcut "${value}"`);
    });

    editor.input.addEventListener("input", updateStatus);
    editor.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            editor.saveBtn.click();
        }
    });
}

function showCourseShortcutPopup(courseId) {
    popupOpen = true;
    currentCourseSelected = courseId;
    if (!editor) createShortcutEditorPopup();

    editor.overlay.style.display = "flex";
    editor.input.value = courseShortcuts[currentCourseSelected] || "";

    editor.input.focus();
    editor.input.select();
    updateStatus();
}

// Shortcut currently processing popup (links onder)

// als shortcut geactiveerd wordt, tonen wat shortcut is (parameter van functie) en wat het doet
// als letter typen, maar meerdere shortcuts beginnen met letter, zoals "c + a + ...", dan wachten tot volgende letter is getypt (of enter om gewoon "c" te doen)
// links onder tonen welke shortcut "in progress is" ==> 2de popup

function showShortcutToast(message, duration = 1700) {
    let toast = document.getElementById("ufora-shortcut-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "ufora-shortcut-toast";
        toast.classList.add("shortcutToast");

        toast.addEventListener("mouseenter", () => {
            toastHover = true;
            clearTimeout(toastTimer);
        });
        toast.addEventListener("mouseleave", () => {
            toastHover = false;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.pointerEvents = "none";
            }, 500);
        });
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.pointerEvents = "auto";

    clearTimeout(toastTimer); // stop old timer if user triggers another shortcut while one is already being shown
    if (!toastHover) {
        toastTimer = setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.pointerEvents = "none";
        }, duration);
    }
}

/* 6. INITIALIZE ALL SHORTCUTS */

// 1. UI SHORTCUTS
let elementsExist = getElements(); // try fast way

async function initializeShortcuts() {
    try {
        const result = await chrome?.storage?.local?.get(["courseShortcuts"]);
        if (result?.courseShortcuts) {
            courseShortcuts = result.courseShortcuts;
        }
    } catch (err) {
        console.warn("Failed to load courseShortcuts from storage:", err);
        return false;
    }
    await saveShortcutsToStorage();
    return true;
}

document.addEventListener("keydown", uiShortcuts);
document.addEventListener("keyup", (e) => toggleShowShortcuts(e, false));

initializeShortcuts();

window.onload = () => {
    login();

    if (!elementsExist) {
        getElements(); // try again (in case the buttons weren't loaded on first try)
    }

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

        // If video element is found, set up shortcuts
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
