from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


CATEGORIES = {"avisos", "projetos", "galeria", "instagram", "vestibular"}
EXCLUDED_NAMES = {
    ".git",
    ".github",
    "_site",
    "cloudflare-worker",
    "content",
    "tools",
    "__pycache__",
}

SECTION_ROUTES = {
    "sobre": "sobre",
    "avisos": "avisos",
    "projetos": "projetos",
    "viagens": "viagens",
    "galeria": "galeria",
    "instagram": "instagram",
    "vestibular": "vestibular",
    "contato": "contato",
}

SITE_ORIGIN = "https://blog.eesjv.com.br"
SITE_DESCRIPTION = "Site institucional da Escola Estadual São José, em Vicentina/MS."
SOCIAL_IMAGE_URL = f"{SITE_ORIGIN}/assets/img/sobre/escola.jpeg"
SOCIAL_META_PATTERN = re.compile(
    r"\s*<!-- social-preview:start -->.*?<!-- social-preview:end -->",
    flags=re.DOTALL,
)


@dataclass
class Entry:
    title: str
    category: str
    date: datetime
    summary: str
    body: str
    image: str
    instagram_url: str
    external_url: str
    featured: bool
    slug: str

    @property
    def date_label(self) -> str:
        return self.date.strftime("%d/%m/%Y")

    @property
    def page_path(self) -> str:
        return f"posts/cms/{self.slug}.html"


@dataclass
class TravelPhoto:
    image: str
    caption: str


@dataclass
class TravelAlbum:
    title: str
    destination: str
    date: datetime
    summary: str
    cover: str
    photos: list[TravelPhoto]
    slug: str

    @property
    def date_label(self) -> str:
        return self.date.strftime("%d/%m/%Y")

    @property
    def page_path(self) -> str:
        return f"viagens/{self.slug}.html"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "publicacao"


def parse_date(value: object) -> datetime:
    text = str(value or "").strip()
    if not text:
        return datetime.now()
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return datetime.strptime(text[:10], "%Y-%m-%d")


def clean_url(value: object, *, instagram: bool = False) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"}:
        return ""
    if instagram and parsed.netloc.lower() not in {"instagram.com", "www.instagram.com"}:
        return ""
    return text


def clean_image(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.startswith("/"):
        return text[1:]
    if urlparse(text).scheme in {"http", "https"}:
        return text
    return text.replace("\\", "/").lstrip("./")


def load_entries(source: Path) -> list[Entry]:
    folder = source / "content" / "postagens"
    entries: list[Entry] = []

    if not folder.exists():
        return entries

    for path in sorted(folder.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw.get("publicado", True) is False:
            continue

        category = str(raw.get("categoria") or "").strip().lower()
        if category not in CATEGORIES:
            continue

        title = str(raw.get("titulo") or "").strip()
        if not title:
            continue

        date = parse_date(raw.get("data"))
        base_slug = path.stem if path.stem else f"{date:%Y-%m-%d}-{slugify(title)}"
        entries.append(
            Entry(
                title=title,
                category=category,
                date=date,
                summary=str(raw.get("resumo") or "").strip(),
                body=str(raw.get("body") or "").strip(),
                image=clean_image(raw.get("imagem")),
                instagram_url=clean_url(raw.get("instagram_url"), instagram=True),
                external_url=clean_url(raw.get("link_externo")),
                featured=bool(raw.get("destaque", False)),
                slug=slugify(base_slug),
            )
        )

    return sorted(entries, key=lambda item: (item.featured, item.date), reverse=True)


def load_travel_albums(source: Path) -> list[TravelAlbum]:
    folder = source / "content" / "viagens"
    albums: list[TravelAlbum] = []

    if not folder.exists():
        return albums

    for path in sorted(folder.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw.get("publicado", True) is False:
            continue

        title = str(raw.get("titulo") or "").strip()
        if not title:
            continue

        photos: list[TravelPhoto] = []
        for item in raw.get("fotos") or []:
            if isinstance(item, str):
                image = clean_image(item)
                caption = ""
            elif isinstance(item, dict):
                image = clean_image(item.get("imagem"))
                caption = str(item.get("legenda") or "").strip()
            else:
                continue
            if image:
                photos.append(TravelPhoto(image=image, caption=caption))

        date = parse_date(raw.get("data"))
        cover = clean_image(raw.get("capa"))
        if not cover and photos:
            cover = photos[0].image
        base_slug = path.stem if path.stem else f"{date:%Y-%m-%d}-{slugify(title)}"
        albums.append(
            TravelAlbum(
                title=title,
                destination=str(raw.get("destino") or "").strip(),
                date=date,
                summary=str(raw.get("resumo") or "").strip(),
                cover=cover,
                photos=photos,
                slug=slugify(base_slug),
            )
        )

    return sorted(albums, key=lambda album: album.date, reverse=True)


def copy_static_site(source: Path, output: Path) -> None:
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    for item in source.iterdir():
        if item.name in EXCLUDED_NAMES:
            continue
        target = output / item.name
        if item.is_dir():
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)

    (output / ".nojekyll").write_text("", encoding="utf-8")


def public_url_for_html(output: Path, path: Path) -> str:
    relative = path.relative_to(output).as_posix()
    if relative == "index.html":
        public_path = "/"
    elif relative.endswith("/index.html"):
        public_path = f"/{relative[:-10]}"
    else:
        public_path = f"/{relative}"
    return f"{SITE_ORIGIN}{public_path}"


def social_metadata(title: str, page_url: str, og_type: str) -> str:
    escaped_title = html.escape(html.unescape(title), quote=True)
    escaped_description = html.escape(SITE_DESCRIPTION, quote=True)
    return f"""
    <!-- social-preview:start -->
    <meta name="description" content="{escaped_description}">
    <link rel="icon" type="image/png" href="/assets/img/logo_escola.png">
    <link rel="apple-touch-icon" href="/assets/img/logo_escola.png">
    <link rel="canonical" href="{page_url}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:type" content="{og_type}">
    <meta property="og:site_name" content="EE São José">
    <meta property="og:title" content="{escaped_title}">
    <meta property="og:description" content="{escaped_description}">
    <meta property="og:url" content="{page_url}">
    <meta property="og:image" content="{SOCIAL_IMAGE_URL}">
    <meta property="og:image:secure_url" content="{SOCIAL_IMAGE_URL}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1280">
    <meta property="og:image:height" content="960">
    <meta property="og:image:alt" content="Vista aérea da Escola Estadual São José">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{escaped_title}">
    <meta name="twitter:description" content="{escaped_description}">
    <meta name="twitter:image" content="{SOCIAL_IMAGE_URL}">
    <!-- social-preview:end -->"""


def add_social_metadata_to_site(output: Path) -> None:
    for path in output.rglob("*.html"):
        document = path.read_text(encoding="utf-8")
        title_match = re.search(r"<title>(.*?)</title>", document, flags=re.DOTALL | re.IGNORECASE)
        head_match = re.search(r"</head>", document, flags=re.IGNORECASE)
        if not title_match or not head_match:
            continue

        relative = path.relative_to(output).as_posix()
        og_type = "article" if relative.startswith(("posts/", "viagens/")) and not relative.endswith("/index.html") else "website"
        metadata = social_metadata(title_match.group(1).strip(), public_url_for_html(output, path), og_type)

        if SOCIAL_META_PATTERN.search(document):
            document = SOCIAL_META_PATTERN.sub(metadata, document, count=1)
        else:
            document = document[:head_match.start()] + metadata + "\n" + document[head_match.start():]
        path.write_text(document, encoding="utf-8")


def media_html(entry: Entry, prefix: str = "") -> str:
    if entry.instagram_url:
        url = html.escape(entry.instagram_url, quote=True)
        return (
            f'<blockquote class="instagram-media instagram-card-embed" '
            f'data-instgrm-permalink="{url}" data-instgrm-version="14">'
            f'<a href="{url}" target="_blank" rel="noopener">'
            f"Ver publicação no Instagram</a></blockquote>"
        )
    if entry.image:
        src = entry.image
        if not urlparse(src).scheme:
            src = f"{prefix}{src}"
        return (
            f'<img src="{html.escape(src, quote=True)}" '
            f'alt="{html.escape(entry.title, quote=True)}" loading="lazy">'
        )
    return '<div class="portal-media-fallback"><span>EE</span><strong>São José</strong></div>'


def card_html(entry: Entry) -> str:
    title = html.escape(entry.title)
    summary = html.escape(entry.summary)
    page = html.escape(entry.page_path, quote=True)

    if entry.category == "avisos":
        return (
            f'<article class="cms-notice-card" data-post>'
            f'<span>{entry.date_label}</span><h3><a href="{page}">{title}</a></h3>'
            f"<p>{summary}</p></article>"
        )

    if entry.category == "projetos":
        media_class = "project-media is-instagram" if entry.instagram_url else "project-media"
        return (
            f'<article class="project-card cms-entry-card">'
            f'<div class="{media_class}">{media_html(entry)}</div>'
            f'<div class="project-body"><h3><a href="{page}">{title}</a></h3>'
            f"<p>{summary}</p></div></article>"
        )

    if entry.category == "galeria":
        return (
            f'<a class="gallery-card cms-gallery-card" href="{page}">'
            f'{media_html(entry)}<span>{title}</span></a>'
        )

    if entry.category == "instagram":
        return (
            f'<article class="instagram-post-card cms-entry-card" data-post>'
            f'<div class="instagram-post-media is-instagram">{media_html(entry)}</div>'
            f'<div class="instagram-post-body"><div class="news-meta">'
            f"<span>{entry.date_label}</span><span>EE São José</span></div>"
            f'<h3><a href="{page}">{title}</a></h3><p>{summary}</p></div></article>'
        )

    href = entry.external_url or entry.page_path
    external = ' target="_blank" rel="noopener"' if entry.external_url else ""
    return (
        f'<a class="admission-card cms-entry-card" href="{html.escape(href, quote=True)}"{external}>'
        f"<span>{entry.date_label}</span><strong>{title}</strong><small>{summary}</small></a>"
    )


def insert_after_opening(html_text: str, opening: str, content: str) -> str:
    position = html_text.find(opening)
    if position < 0:
        raise RuntimeError(f"Área não encontrada no index.html: {opening}")
    position += len(opening)
    return html_text[:position] + "\n" + content + html_text[position:]


def write_section_routes(output: Path, index_html: str) -> None:
    route_html = index_html.replace(
        "<head>",
        '<head>\n    <base href="/">',
        1,
    )
    for route in SECTION_ROUTES.values():
        target = output / route / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(route_html, encoding="utf-8")


def markdown_inline(value: str) -> str:
    escaped = html.escape(value)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
    escaped = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<a href="\2" target="_blank" rel="noopener">\1</a>',
        escaped,
    )
    return escaped


def markdown_to_html(value: str) -> str:
    if not value.strip():
        return ""

    output: list[str] = []
    paragraph: list[str] = []
    list_open = False

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{markdown_inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    for raw_line in value.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            if list_open:
                output.append("</ul>")
                list_open = False
            continue
        if line.startswith("### "):
            flush_paragraph()
            output.append(f"<h3>{markdown_inline(line[4:])}</h3>")
        elif line.startswith("## "):
            flush_paragraph()
            output.append(f"<h2>{markdown_inline(line[3:])}</h2>")
        elif line.startswith("# "):
            flush_paragraph()
            output.append(f"<h1>{markdown_inline(line[2:])}</h1>")
        elif line.startswith(("- ", "* ")):
            flush_paragraph()
            if not list_open:
                output.append("<ul>")
                list_open = True
            output.append(f"<li>{markdown_inline(line[2:])}</li>")
        else:
            paragraph.append(line)

    flush_paragraph()
    if list_open:
        output.append("</ul>")
    return "\n".join(output)


def local_media_for_page(entry: Entry) -> str:
    return media_html(entry, "../../")


def prefixed_image(image: str, prefix: str = "") -> str:
    if not image:
        return ""
    return image if urlparse(image).scheme else f"{prefix}{image}"


def travel_album_card_html(album: TravelAlbum) -> str:
    title = html.escape(album.title)
    destination = html.escape(album.destination or "Viagem do conhecimento")
    summary = html.escape(album.summary)
    href = html.escape(album.page_path, quote=True)
    count = len(album.photos)
    photo_label = f"{count} foto" if count == 1 else f"{count} fotos"

    if album.cover:
        cover = (
            f'<img src="{html.escape(prefixed_image(album.cover), quote=True)}" '
            f'alt="{title}" loading="lazy">'
        )
    else:
        cover = '<div class="portal-media-fallback"><span>EE</span><strong>Viagem</strong></div>'

    return (
        f'<article class="travel-album-card">'
        f'<a class="travel-album-cover" href="{href}">{cover}'
        f'<span class="travel-photo-count">{photo_label}</span></a>'
        f'<div class="travel-album-body"><span>{destination} • {album.date_label}</span>'
        f'<h3><a href="{href}">{title}</a></h3><p>{summary}</p></div></article>'
    )


def write_travel_album_page(output: Path, album: TravelAlbum) -> None:
    title = html.escape(album.title)
    destination = html.escape(album.destination or "Viagem do conhecimento")
    summary = html.escape(album.summary)

    if album.cover:
        cover = (
            f'<img src="{html.escape(prefixed_image(album.cover, "../"), quote=True)}" '
            f'alt="{title}">'
        )
    else:
        cover = '<div class="portal-media-fallback"><span>EE</span><strong>Viagem</strong></div>'

    figures: list[str] = []
    for index, photo in enumerate(album.photos, start=1):
        src = html.escape(prefixed_image(photo.image, "../"), quote=True)
        caption = html.escape(photo.caption)
        alt = caption or f"{album.title} — foto {index}"
        figcaption = f"<figcaption>{caption}</figcaption>" if caption else ""
        figures.append(
            f'<figure><a href="{src}" target="_blank" rel="noopener">'
            f'<img src="{src}" alt="{html.escape(alt, quote=True)}" loading="lazy"></a>'
            f"{figcaption}</figure>"
        )

    gallery = "\n".join(figures)
    if not gallery:
        gallery = (
            '<div class="travel-empty"><strong>Álbum sem fotos no momento</strong>'
            "<p>As imagens desta viagem serão adicionadas em breve.</p></div>"
        )

    document = f"""<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title} | Viagens do conhecimento</title>
    <link rel="stylesheet" href="/assets/css/style-20260619.css">
    <script src="/assets/js/script-20260619.js" defer></script>
</head>
<body>
    <header class="site-header cms-page-header">
        <div class="brand-row">
            <a class="school-brand" href="/viagens/">
                <img class="brand-logo" src="../assets/img/logo_escola.png" alt="EE São José">
                <span><strong>EE São José</strong><small>Voltar às viagens</small></span>
            </a>
        </div>
    </header>
    <main class="portal-main travel-album-page">
        <section class="travel-album-hero">
            <div class="travel-album-hero-copy">
                <span>{destination} • {album.date_label}</span>
                <h1>{title}</h1>
                <p>{summary}</p>
                <a class="text-link" href="/viagens/">← Voltar aos álbuns</a>
            </div>
            {cover}
        </section>
        <section class="travel-photo-grid" aria-label="Fotos do álbum">
            {gallery}
        </section>
    </main>
</body>
</html>"""

    target = output / album.page_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document, encoding="utf-8")


def write_entry_page(output: Path, entry: Entry) -> None:
    title = html.escape(entry.title)
    summary = html.escape(entry.summary)
    external = ""
    if entry.external_url:
        external = (
            f'<p><a class="primary-action" href="{html.escape(entry.external_url, quote=True)}" '
            f'target="_blank" rel="noopener">Acessar link</a></p>'
        )

    document = f"""<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title} | EE São José</title>
    <link rel="stylesheet" href="/assets/css/style-20260619.css">
    <script async defer src="https://www.instagram.com/embed.js"></script>
    <script src="/assets/js/script-20260619.js" defer></script>
</head>
<body>
    <header class="site-header cms-page-header">
        <div class="brand-row">
            <a class="school-brand" href="../../index.html">
                <img class="brand-logo" src="../../assets/img/logo_escola.png" alt="EE São José">
                <span><strong>EE São José</strong><small>Voltar ao site</small></span>
            </a>
        </div>
    </header>
    <main class="portal-main cms-post-page">
        <article class="post-article">
            <header class="post-hero">
                <span>{html.escape(entry.category.title())} — {entry.date_label}</span>
                <h1>{title}</h1>
                <p>{summary}</p>
            </header>
            <div class="cms-post-media">{local_media_for_page(entry)}</div>
            <div class="post-content">{markdown_to_html(entry.body)}{external}</div>
        </article>
    </main>
</body>
</html>"""

    target = output / entry.page_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document, encoding="utf-8")


def build(source: Path, output: Path) -> None:
    entries = load_entries(source)
    travel_albums = load_travel_albums(source)
    copy_static_site(source, output)

    index_path = output / "index.html"
    index_html = index_path.read_text(encoding="utf-8")
    targets = {
        "avisos": '<div class="notice-grid">',
        "projetos": '<div class="project-grid">',
        "galeria": '<div class="gallery-grid">',
        "instagram": '<div class="instagram-grid">',
        "vestibular": '<div class="admission-grid">',
    }

    for category, opening in targets.items():
        cards = "\n".join(card_html(entry) for entry in entries if entry.category == category)
        if cards:
            if category == "avisos":
                index_html = re.sub(
                    r'\s*<div class="notice-empty">.*?</div>',
                    "",
                    index_html,
                    count=1,
                    flags=re.DOTALL,
                )
            index_html = insert_after_opening(
                index_html,
                opening,
                f'<!-- cms:{category}:start -->\n{cards}\n<!-- cms:{category}:end -->',
            )

    travel_cards = "\n".join(travel_album_card_html(album) for album in travel_albums)
    if travel_cards:
        index_html = re.sub(
            r'\s*<div class="travel-empty">.*?</div>',
            "",
            index_html,
            count=1,
            flags=re.DOTALL,
        )
        index_html = insert_after_opening(
            index_html,
            '<div class="travel-album-grid">',
            f"<!-- cms:viagens:start -->\n{travel_cards}\n<!-- cms:viagens:end -->",
        )

    index_path.write_text(index_html, encoding="utf-8")
    write_section_routes(output, index_html)
    for entry in entries:
        write_entry_page(output, entry)
    for album in travel_albums:
        write_travel_album_page(output, album)
    add_social_metadata_to_site(output)

    print(f"Site montado em {output}")
    print(f"Postagens publicadas pelo painel: {len(entries)}")
    print(f"Álbuns de viagens publicados: {len(travel_albums)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Monta o site estático com as postagens do painel.")
    parser.add_argument("--source", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, default=Path("_site"))
    args = parser.parse_args()
    build(args.source.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
