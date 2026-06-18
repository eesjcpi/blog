const searchInputs = Array.from(document.querySelectorAll("[data-search]"));
const forms = Array.from(document.querySelectorAll("[data-search-form]"));
const posts = Array.from(document.querySelectorAll("[data-post]"));
const groups = Array.from(document.querySelectorAll("[data-date-group]"));
const emptyState = document.querySelector("[data-empty-state]");
const siteHeader = document.querySelector(".site-header");
const weatherAlertModal = document.querySelector("[data-weather-alert-modal]");
const weatherAlertOpeners = document.querySelectorAll("[data-open-weather-alerts]");
const weatherAlertClosers = document.querySelectorAll("[data-close-weather-alerts]");
const weatherPhone = document.querySelector("[data-weather-phone]");
let weatherAlertTrigger = null;

const updateHeaderOffset = () => {
    if (!siteHeader) {
        return;
    }

    const offset = Math.ceil(siteHeader.getBoundingClientRect().height) + 16;
    document.documentElement.style.setProperty("--header-offset", `${offset}px`);
};

updateHeaderOffset();

if (siteHeader && "ResizeObserver" in window) {
    new ResizeObserver(updateHeaderOffset).observe(siteHeader);
} else {
    window.addEventListener("resize", updateHeaderOffset);
}

const openWeatherAlerts = (trigger) => {
    if (!weatherAlertModal) {
        return;
    }

    weatherAlertTrigger = trigger || null;
    weatherAlertModal.hidden = false;
    weatherAlertModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-open-modal");
    weatherAlertModal.querySelector("input")?.focus();
};

const closeWeatherAlerts = () => {
    if (!weatherAlertModal) {
        return;
    }

    weatherAlertModal.hidden = true;
    weatherAlertModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-open-modal");
    weatherAlertTrigger?.focus();
};

weatherAlertOpeners.forEach((button) => {
    button.addEventListener("click", () => openWeatherAlerts(button));
});

weatherAlertClosers.forEach((button) => {
    button.addEventListener("click", closeWeatherAlerts);
});

weatherAlertModal?.addEventListener("click", (event) => {
    if (event.target === weatherAlertModal) {
        closeWeatherAlerts();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && weatherAlertModal && !weatherAlertModal.hidden) {
        closeWeatherAlerts();
    }
});

weatherPhone?.addEventListener("input", () => {
    const digits = weatherPhone.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 10) {
        weatherPhone.value = digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    } else if (digits.length > 6) {
        weatherPhone.value = digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (digits.length > 2) {
        weatherPhone.value = digits.replace(/(\d{2})(\d+)/, "($1) $2");
    } else {
        weatherPhone.value = digits;
    }
});

const normalize = (value) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const applySearch = (value) => {
    const query = normalize(value);
    let visible = 0;

    posts.forEach((post) => {
        const text = normalize(post.dataset.searchText || "");
        const match = !query || text.includes(query);
        post.hidden = !match;
        if (match) {
            visible += 1;
        }
    });

    groups.forEach((group) => {
        const visiblePost = Array.from(group.querySelectorAll("[data-post]")).some((post) => !post.hidden);
        group.hidden = !visiblePost;
    });

    if (emptyState) {
        emptyState.hidden = visible !== 0;
    }
};

searchInputs.forEach((input) => {
    input.addEventListener("input", () => {
        searchInputs.forEach((otherInput) => {
            if (otherInput !== input) {
                otherInput.value = input.value;
            }
        });
        applySearch(input.value);
    });
});

forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        applySearch(form.querySelector("[data-search]")?.value || "");
        document.querySelector("#arquivo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

window.addEventListener("load", () => {
    updateHeaderOffset();

    if (window.instgrm?.Embeds?.process) {
        window.instgrm.Embeds.process();
    }
});
