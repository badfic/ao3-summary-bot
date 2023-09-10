import { parseHTML } from 'linkedom';

export async function getSummary(ao3Url, logger) {
    try {
        console.log("Attempting AO3 summary for " + ao3Url);

        const href = new URL(ao3Url);
        href.search = "view_adult=true&view_full_work=true";

        const data = await fetch(href, {
            "headers": {
                "Accept": "text/html",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36"
            }
        });

        const html = await data.text();

        console.log("Response from AO3: " + html);

        const { document } = parseHTML(html);

        const title = document.querySelector(".title.heading").textContent.trim();
        const author = document.querySelector(".byline.heading a[rel='author']").textContent;
        const authorLink = document.querySelector(".byline.heading a[rel='author']").href;
        const ships = Array.from(document.querySelectorAll("dd.relationship.tags > ul.commas > li > a.tag")).map(x => x.textContent).join(", ");
        const wordCount = document.querySelector("dd.words").textContent;
        const contentRating = Array.from(document.querySelectorAll("dd.rating.tags > ul.commas > li > a.tag")).map(x => {
            const ratingName = x.textContent;
            if (ratingName.toUpperCase() === "GENERAL AUDIENCES") {
                return "G"
            } else if (ratingName.toUpperCase() === "EXPLICIT") {
                return "E"
            } else if (ratingName.toUpperCase() === "TEEN AND UP AUDIENCES") {
                return "T"
            } else if (ratingName.toUpperCase() === "MATURE") {
                return "M"
            }
            return "NR"
        }).join(", ");
        const chapters = document.querySelector("dd.chapters").textContent;
        const archiveWarnings = Array.from(document.querySelectorAll("dd.warning.tags > ul.commas > li > a.tag")).map(x => x.textContent).join(", ");
        const categories = Array.from(document.querySelectorAll("dd.category.tags > ul.commas > li > a.tag")).map(x => x.textContent).join(", ");
        const summary = document.querySelector(".summary.module > blockquote").textContent;
        const fandoms = Array.from(document.querySelectorAll("dd.fandom.tags > ul.commas > li > a.tag")).map(x => x.textContent).join(", ");
        const characters = Array.from(document.querySelectorAll("dd.character.tags > ul.commas > li > a.tag")).map(x => x.textContent).join(", ");
        const tags = Array.from(document.querySelectorAll("dd.freeform.tags > ul.commas > li > a.tag")).map(x => x.textContent).join(", ");
        const language = (document.querySelector("dd.language").textContent).replace(/\s+/g, "");

        let color = 2416379903;
        if (contentRating === "T") {
            color = 3603237631;
        } else if (contentRating === "G") {
            color = 1990395391;
        } else if (contentRating === "NR") {
            color = 3941262847;
        } else if (contentRating === "M") {
            color = 3563849215;
        }

        const result = {
            embeds: [
                {
                    title: `AO3 Summary Report`,
                    description: `[**${title}**](${ao3Url})\nby [${author}](https://archiveofourown.org${authorLink})\n\n**Rating**: ${contentRating}\n\n**Warnings**: ${archiveWarnings}\n\n**Categories**: ${categories}\n\n**Summary**: ${summary}\n\n**Fandoms**: ${fandoms}\n\n**Relationships**: ${ships}\n\n**Characters**: ${characters}\n\n**Tags**: ${tags}`,
                    footer: `Words: ${wordCount} | Chapters: ${chapters} | ${language}`,
                    color: color,
                    thumbnail: "https://cdn.discordapp.com/attachments/707453916882665552/780261925212520508/wITXDY67Xw1sAAAAABJRU5ErkJggg.png"
                }
            ]
        };

        console.log(`Serialized result for ${ao3Url}: ${JSON.stringify(result)}`);
        return result;
    } catch (e) {
        await logger.log(`Failed to parse ao3 url ${ao3Url}: ${e}\n${e.stack}`);
        return {
            content: "Failed to parse AO3 url :("
        };
    }
}
