(function () {
    "use strict";

    CMS.registerPreviewStyle("preview.css");

    function field(entry, name, fallback) {
        var value = entry.getIn(["data", name]);
        return value === undefined || value === null || value === "" ? fallback : value;
    }

    function formattedDate(value) {
        if (!value) {
            return "Data da publicação";
        }

        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value).slice(0, 10);
        }

        return new Intl.DateTimeFormat("pt-BR").format(date);
    }

    function imagePreview(props, title, className, fieldName) {
        var image = field(props.entry, fieldName || "imagem", "");
        if (!image) {
            return h(
                "div",
                { className: className + " preview-placeholder" },
                h("span", {}, "Imagem"),
                h("strong", {}, "Escolha uma imagem para visualizar")
            );
        }

        var asset = props.getAsset(image);
        return h("img", {
            className: className,
            src: asset ? asset.toString() : image,
            alt: title,
        });
    }

    function projectCard(props, title, summary) {
        return h(
            "article",
            { className: "preview-project-card" },
            h(
                "div",
                { className: "preview-project-media" },
                imagePreview(props, title, "preview-cover")
            ),
            h(
                "div",
                { className: "preview-project-body" },
                h("h3", {}, title),
                h("p", {}, summary)
            )
        );
    }

    function galleryCard(props, title) {
        return h(
            "article",
            { className: "preview-gallery-card" },
            imagePreview(props, title, "preview-cover"),
            h("span", {}, title)
        );
    }

    function instagramCard(props, title, summary, date) {
        var instagramUrl = field(props.entry, "instagram_url", "");
        return h(
            "article",
            { className: "preview-instagram-card" },
            h(
                "div",
                { className: "preview-instagram-media" },
                h("span", {}, "Instagram"),
                h("strong", {}, instagramUrl ? "Publicação vinculada" : "Cole o link da publicação"),
                instagramUrl
                    ? h("small", {}, instagramUrl)
                    : h("small", {}, "A incorporação oficial aparecerá no site publicado.")
            ),
            h(
                "div",
                { className: "preview-instagram-body" },
                h("div", { className: "preview-meta" }, h("span", {}, date), h("span", {}, "EE São José")),
                h("h3", {}, title),
                h("p", {}, summary)
            )
        );
    }

    function admissionCard(title, summary, date) {
        return h(
            "article",
            { className: "preview-admission-card" },
            h("span", {}, date),
            h("strong", {}, title),
            h("small", {}, summary)
        );
    }

    var PostPreview = createClass({
        render: function () {
            var entry = this.props.entry;
            var category = field(entry, "categoria", "projetos");
            var title = field(entry, "titulo", "Título da postagem");
            var summary = field(entry, "resumo", "O resumo da postagem aparecerá aqui.");
            var date = formattedDate(field(entry, "data", ""));
            var card;

            if (category === "projetos") {
                card = projectCard(this.props, title, summary);
            } else if (category === "galeria") {
                card = galleryCard(this.props, title);
            } else if (category === "instagram") {
                card = instagramCard(this.props, title, summary, date);
            } else if (category === "vestibular") {
                card = admissionCard(title, summary, date);
            } else {
                card = projectCard(this.props, title, summary);
            }

            var sections = [
                "main",
                { className: "preview-page" },
                h(
                    "header",
                    { className: "preview-heading" },
                    h("span", {}, "Pré-visualização"),
                    h("h1", {}, "Como aparecerá na página inicial"),
                    h("p", {}, "Esta área é atualizada enquanto você preenche o formulário.")
                ),
                h("section", { className: "preview-stage preview-stage-" + category }, card)
            ];

            if (category === "projetos") {
                sections.push(
                    h(
                        "section",
                        { className: "preview-content" },
                        h("span", {}, "Página do projeto"),
                        h("h2", {}, title),
                        h("p", { className: "preview-summary" }, summary),
                        h("div", { className: "preview-body" }, this.props.widgetFor("body"))
                    )
                );
            }

            return h.apply(null, sections);
        },
    });

    ["projetos", "galeria", "instagram", "vestibular"].forEach(function (collection) {
        CMS.registerPreviewTemplate(collection, PostPreview);
    });

    var TravelPreview = createClass({
        render: function () {
            var title = field(this.props.entry, "titulo", "Nome da viagem");
            var destination = field(this.props.entry, "destino", "Destino da viagem");
            var summary = field(this.props.entry, "resumo", "A descrição da viagem aparecerá aqui.");
            var date = formattedDate(field(this.props.entry, "data", ""));
            var photos = this.props.entry.getIn(["data", "fotos"]);
            var photoCount = photos && typeof photos.size === "number" ? photos.size : 0;

            return h(
                "main",
                { className: "preview-page" },
                h(
                    "header",
                    { className: "preview-heading" },
                    h("span", {}, "Viagens do conhecimento"),
                    h("h1", {}, "Pré-visualização do álbum"),
                    h("p", {}, "Cada viagem será publicada como um álbum separado.")
                ),
                h(
                    "article",
                    { className: "preview-travel-card" },
                    h(
                        "div",
                        { className: "preview-travel-cover" },
                        imagePreview(this.props, title, "preview-cover", "capa"),
                        h("span", {}, photoCount + (photoCount === 1 ? " foto" : " fotos"))
                    ),
                    h(
                        "div",
                        { className: "preview-project-body" },
                        h("small", {}, destination + " • " + date),
                        h("h3", {}, title),
                        h("p", {}, summary)
                    )
                )
            );
        },
    });

    CMS.registerPreviewTemplate("viagens", TravelPreview);
})();
