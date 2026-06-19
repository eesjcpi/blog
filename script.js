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
const weatherFallback = document.querySelector("[data-weather-fallback]");
const weatherReloadButton = document.querySelector("[data-reload-weather]");
const navLinks = Array.from(document.querySelectorAll(".main-nav a"));
const archiveMonths = Array.from(document.querySelectorAll(".archive-month"));
let weatherAlertTrigger = null;
let weatherLoadTimer = null;

const setArchiveMonthExpanded = (month, expanded, animate = true) => {
    const button = month.querySelector(".archive-month-toggle");
    const list = month.querySelector(".archive-news-list");
    if (!button || !list || button.getAttribute("aria-expanded") === String(expanded)) {
        return;
    }

    button.setAttribute("aria-expanded", String(expanded));
    month.classList.toggle("is-open", expanded);

    if (!animate || !list.animate) {
        list.hidden = !expanded;
        return;
    }

    if (expanded) {
        list.hidden = false;
        list.animate(
            [
                { opacity: 0, transform: "translateY(-10px)" },
                { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
    } else {
        const animation = list.animate(
            [
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-10px)" },
            ],
            { duration: 200, easing: "ease" }
        );
        animation.addEventListener("finish", () => {
            if (button.getAttribute("aria-expanded") === "false") {
                list.hidden = true;
            }
        });
    }
};

archiveMonths.forEach((month, index) => {
    const header = month.querySelector(":scope > header");
    const label = header?.querySelector("span")?.textContent?.trim();
    const list = month.querySelector(":scope > .archive-news-list");
    if (!header || !label || !list) {
        return;
    }

    const listId = `${month.id || `archive-month-${index}`}-content`;
    list.id = listId;
    list.hidden = true;

    const button = document.createElement("button");
    button.className = "archive-month-toggle";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", listId);
    button.innerHTML = `<span>${label}</span><span class="archive-month-count">${list.querySelectorAll(".archive-news-item").length} publicações</span><span class="archive-month-chevron" aria-hidden="true">⌄</span>`;
    header.replaceChildren(button);

    button.addEventListener("click", () => {
        const shouldOpen = button.getAttribute("aria-expanded") !== "true";
        setArchiveMonthExpanded(month, shouldOpen);
    });
});

const revealArchiveMonthFromHash = () => {
    if (!window.location.hash.startsWith("#archive-")) {
        return;
    }

    const month = document.querySelector(window.location.hash);
    if (!month?.classList.contains("archive-month")) {
        return;
    }

    setArchiveMonthExpanded(month, true);
};

revealArchiveMonthFromHash();
window.addEventListener("hashchange", revealArchiveMonthFromHash);

document.querySelectorAll(".archive-chip[href*='#archive-']").forEach((link) => {
    link.addEventListener("click", () => {
        const url = new URL(link.href, window.location.href);
        const month = document.querySelector(url.hash);
        if (month?.classList.contains("archive-month")) {
            setArchiveMonthExpanded(month, true);
        }
    });
});

const instagramCardMedia = Array.from(document.querySelectorAll(".instagram-post-media"));
const instagramPreviewByPost = new Map();

instagramCardMedia.forEach((media) => {
    const embed = media.querySelector(".instagram-card-embed");
    const iframe = media.querySelector("iframe");
    const instagramUrl =
        embed?.dataset.instgrmPermalink ||
        embed?.querySelector("a")?.href ||
        iframe?.src;
    const shortcode = instagramUrl?.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/i)?.[1];
    const card = media.closest(".instagram-post-card");
    const postPath = card?.querySelector("h3 a")?.getAttribute("href");
    const date = card?.querySelector(".news-meta span")?.textContent?.trim() || "";

    if (!instagramUrl || !shortcode) {
        return;
    }

    const preview = document.createElement("a");
    preview.className = "instagram-local-preview";
    preview.href = instagramUrl;
    preview.target = "_blank";
    preview.rel = "noopener";
    preview.setAttribute("aria-label", `Abrir publicação do Instagram de ${date || "EE São José"}`);

    const image = document.createElement("img");
    image.src = `assets/img/instagram-${shortcode}.jpg`;
    image.alt = `Publicação do Instagram da EE São José${date ? ` — ${date}` : ""}`;
    image.loading = "lazy";
    image.addEventListener("error", () => preview.classList.add("is-fallback"));

    const label = document.createElement("span");
    label.innerHTML = `<strong>Instagram da escola</strong>${date ? `<small>${date}</small>` : ""}`;

    preview.append(image, label);
    media.replaceChildren(preview);

    if (postPath) {
        instagramPreviewByPost.set(postPath, {
            image: image.src,
            instagramUrl,
            date,
        });
    }
});

const loadArchiveInstagramImage = async (item) => {
    const thumb = item.querySelector(".archive-thumb");
    const postPath = thumb?.getAttribute("href");
    const previewData = postPath ? instagramPreviewByPost.get(postPath) : null;

    if (!thumb || !thumb.querySelector(".portal-instagram-preview")) {
        return;
    }

    let imageSource = previewData?.image || "";
    let date = previewData?.date || item.querySelector(":scope > div > span")?.textContent?.trim() || "";

    if (!imageSource && postPath) {
        try {
            const response = await fetch(postPath);
            if (!response.ok) {
                return;
            }
            const postHtml = await response.text();
            const shortcode = postHtml.match(/instagram\.com\/(?:p|reel)\/([^/?&"<]+)/i)?.[1];
            if (!shortcode) {
                return;
            }
            imageSource = new URL(`assets/img/instagram-${shortcode}.jpg`, document.baseURI).href;
        } catch {
            return;
        }
    }

    if (!imageSource) {
        return;
    }

    const image = document.createElement("img");
    image.src = imageSource;
    image.alt = `Registro da EE São José no Instagram${date ? ` — ${date}` : ""}`;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.remove();
        thumb.classList.remove("has-instagram-image");
    });
    thumb.replaceChildren(image);
    thumb.classList.add("has-instagram-image");
};

const archiveInstagramItems = Array.from(
    document.querySelectorAll(".archive-news-item .portal-instagram-preview")
).map((preview) => preview.closest(".archive-news-item"));

if ("IntersectionObserver" in window) {
    const archiveImageObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }
                loadArchiveInstagramImage(entry.target);
                observer.unobserve(entry.target);
            });
        },
        { rootMargin: "500px 0px" }
    );

    archiveInstagramItems.forEach((item) => archiveImageObserver.observe(item));
} else {
    archiveInstagramItems.forEach(loadArchiveInstagramImage);
}

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

const startWeatherLoadTimer = () => {
    window.clearTimeout(weatherLoadTimer);
    weatherLoadTimer = window.setTimeout(() => {
        if (!weatherShell?.classList.contains("is-loaded")) {
            weatherShell?.classList.add("has-load-error");
            if (weatherFallback) {
                weatherFallback.hidden = false;
            }
        }
    }, 15000);
};

if (weatherFrame) {
    startWeatherLoadTimer();
    weatherFrame.addEventListener("load", () => {
        window.clearTimeout(weatherLoadTimer);
        weatherShell?.classList.add("is-loaded");
        weatherShell?.classList.remove("has-load-error");
        if (weatherFallback) {
            weatherFallback.hidden = true;
        }
    });
}

weatherReloadButton?.addEventListener("click", () => {
    if (!weatherFrame) {
        return;
    }

    weatherShell?.classList.remove("is-loaded", "has-load-error");
    if (weatherFallback) {
        weatherFallback.hidden = true;
    }
    const source = weatherFrame.src;
    weatherFrame.src = "about:blank";
    window.setTimeout(() => {
        weatherFrame.src = source;
        startWeatherLoadTimer();
    }, 120);
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

const updateActiveNavFromLocation = () => {
    const currentPath = normalizePagePath(window.location.pathname);
    const currentHash = window.location.hash || "#inicio";
    const matchingLink = navLinks.find((link) => {
        const url = new URL(link.href, window.location.href);
        return (
            url.origin === window.location.origin &&
            normalizePagePath(url.pathname) === currentPath &&
            (url.hash || "#inicio") === currentHash
        );
    });

    if (matchingLink) {
        setActiveNavLink(matchingLink);
    }
};

updateActiveNavFromLocation();
window.addEventListener("hashchange", updateActiveNavFromLocation);
window.addEventListener("popstate", updateActiveNavFromLocation);
window.addEventListener("pageshow", updateActiveNavFromLocation);

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
        if (query && visiblePost && group.classList.contains("archive-month")) {
            setArchiveMonthExpanded(group, true, false);
        }
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
