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
const weatherFrame = document.querySelector("[data-weather-frame]");
const weatherShell = document.querySelector("[data-weather-shell]");
const navLinks = Array.from(document.querySelectorAll(".main-nav a"));
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

weatherFrame?.addEventListener("load", () => {
    weatherShell?.classList.add("is-loaded");
});

const setActiveNavLink = (activeLink) => {
    navLinks.forEach((link) => {
        const isActive = link === activeLink;
        link.classList.toggle("is-nav-active", isActive);
        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
};

const animateTargetSection = (target) => {
    target.classList.remove("section-arriving");
    void target.offsetWidth;
    target.classList.add("section-arriving");
    window.setTimeout(() => target.classList.remove("section-arriving"), 760);
};

const normalizePagePath = (pathname) => pathname.replace(/index\.html$/i, "");

navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        const url = new URL(link.href, window.location.href);
        const samePage =
            url.origin === window.location.origin &&
            normalizePagePath(url.pathname) === normalizePagePath(window.location.pathname);
        const target = samePage && url.hash ? document.querySelector(url.hash) : null;

        setActiveNavLink(link);

        if (target) {
            event.preventDefault();
            history.pushState(null, "", url.hash);
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            window.setTimeout(() => animateTargetSection(target), 260);
            return;
        }

        if (url.origin === window.location.origin && !url.href.startsWith("javascript:")) {
            event.preventDefault();
            document.body.classList.add("is-page-leaving");
            window.setTimeout(() => {
                window.location.href = url.href;
            }, 210);
        }
    });
});

const observedSections = Array.from(document.querySelectorAll("main section[id]"));
if ("IntersectionObserver" in window && observedSections.length) {
    const sectionLinks = navLinks.filter((link) => {
        const url = new URL(link.href, window.location.href);
        return url.pathname.endsWith("index.html") && url.hash;
    });

    const sectionObserver = new IntersectionObserver(
        (entries) => {
            const visibleEntry = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

            if (!visibleEntry) {
                return;
            }

            const matchingLink = sectionLinks.find((link) => {
                const url = new URL(link.href, window.location.href);
                return url.hash === `#${visibleEntry.target.id}`;
            });

            if (matchingLink) {
                setActiveNavLink(matchingLink);
            }
        },
        {
            rootMargin: `-${Math.round(window.innerHeight * 0.22)}px 0px -55% 0px`,
            threshold: [0.08, 0.35, 0.65],
        }
    );

    observedSections.forEach((section) => sectionObserver.observe(section));
}

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
