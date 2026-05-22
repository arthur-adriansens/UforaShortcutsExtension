// Fetch the options of the courses menu, without having to open the menu

D2L.PT.Navbars.Daylight.PartialDropdown(
    document.querySelector("d2l-labs-navigation-main-header .d2l-navigation-s-course-menu").children[0],
).AddListener(() => {
    window.postMessage({ type: "COURSES_LOADED" }, "*");
});
