/**
 * Binds the feature notes in docs/features into one pdf to hand around.
 *
 *   node scripts/build-docs-pdf.mjs
 *
 * pandoc turns the markdown into html, a headless chrome prints it. Needs no running stack - the
 * screenshots come from docs/features/images, so run capture-docs-screenshots.mjs first if they
 * are stale.
 */
import { spawn, execFile } from "node:child_process";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const DOCS = new URL("../docs/features/", import.meta.url).pathname;
const OUT = join(DOCS, "svs-neue-funktionen.pdf");
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334;

const NOTES = [
	{ file: "raum-vorlagen.md", eyebrow: "Räume anlegen" },
	{ file: "raum-mit-ki.md", eyebrow: "Räume anlegen" },
	{ file: "board-ki-karten.md", eyebrow: "Im Bereich arbeiten" },
	{ file: "onboarding-assistent.md", eyebrow: "Ankommen" },
	{ file: "nostr-suche.md", eyebrow: "Material finden" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** the notes link to each other as markdown files, which means nothing inside one pdf */
const dropCrossLinks = (html) =>
	html.replace(/<p>Verwandt:[\s\S]*?<\/p>/g, "").replace(/<a href="[^"]*\.md(#[^"]*)?">([^<]*)<\/a>/g, "$2");

const toHtml = async (file) => {
	const { stdout } = await run("pandoc", [join(DOCS, file), "-f", "gfm", "-t", "html5", "--wrap=none"]);

	return dropCrossLinks(stdout);
};

const STYLE = `
	@page { size: A4; }
	* { box-sizing: border-box; }
	html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	body {
		margin: 0;
		font: 10.5pt/1.62 Charter, "Iowan Old Style", Georgia, serif;
		color: #17202a;
	}
	h1, h2, h3, .eyebrow, .cover-meta, th, .footnote {
		font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
	}

	/* cover */
	.cover { height: 247mm; display: flex; flex-direction: column; }
	.cover-top { border-top: 3px solid #2b5d77; padding-top: 10mm; }
	.cover .toc { margin-top: 18mm; }
	.cover-meta { margin-top: auto; }
	.cover h1 { font-size: 30pt; line-height: 1.14; margin: 0 0 6mm; letter-spacing: -0.4pt; text-wrap: balance; }
	.cover .lead { font-size: 12pt; line-height: 1.55; max-width: 118mm; color: #33414f; margin: 0; }
	.cover-meta { font-size: 9pt; color: #62717f; letter-spacing: 0.3pt; }
	.toc { border-top: 1px solid #d8dee4; padding-top: 5mm; }
	.cover-meta { margin-bottom: 0; }
	.toc-row { display: flex; gap: 6mm; padding: 2.6mm 0; border-bottom: 1px solid #eef1f4; font-size: 10pt; }
	.toc-row span:first-child { font-family: "Avenir Next", sans-serif; font-weight: 600; min-width: 62mm; }
	.toc-row span:last-child { color: #52616f; }

	/* chapters */
	.note { page-break-before: always; }
	.eyebrow {
		font-size: 8pt; letter-spacing: 1.4pt; text-transform: uppercase;
		color: #2b5d77; margin-bottom: 3mm;
	}
	.note h1 {
		font-size: 20pt; margin: 0 0 6mm; padding-bottom: 4mm;
		border-bottom: 2px solid #2b5d77; letter-spacing: -0.2pt;
	}
	h2 { font-size: 12.5pt; margin: 9mm 0 3mm; letter-spacing: -0.1pt; }
	h1, h2 { break-after: avoid; page-break-after: avoid; }
	p { margin: 0 0 3.6mm; max-width: 150mm; }
	strong { font-weight: 600; }
	code {
		font: 9pt "SF Mono", Menlo, monospace;
		background: #f2f5f7; padding: 0.4mm 1.2mm; border-radius: 1mm;
	}
	pre { background: #f2f5f7; padding: 3mm 4mm; border-radius: 1.5mm; overflow-x: auto; }
	pre code { background: none; padding: 0; }

	/* the paragraph after the heading carries where to find the thing */
	.note h1 + p {
		background: #f2f5f7; border-left: 2.5pt solid #2b5d77;
		padding: 3mm 4mm; font-size: 9.5pt; color: #33414f; margin-bottom: 6mm;
	}

	ul { margin: 0 0 3.6mm; padding-left: 5mm; }
	li { margin-bottom: 1.6mm; }

	table { border-collapse: collapse; width: 100%; margin: 0 0 5mm; font-size: 9.5pt; page-break-inside: avoid; }
	th {
		text-align: left; font-size: 8pt; letter-spacing: 0.6pt; text-transform: uppercase;
		color: #62717f; border-bottom: 1.2pt solid #17202a; padding: 2mm 3mm 1.6mm;
	}
	td { border-bottom: 1px solid #e3e8ec; padding: 2.4mm 3mm; vertical-align: top; }
	td:first-child { font-family: "Avenir Next", sans-serif; font-weight: 600; width: 34%; }

	blockquote {
		margin: 0 0 4mm; padding: 3mm 4mm; background: #fbf7ee;
		border-left: 2.5pt solid #b08b3f; font-size: 9.5pt; color: #43423d;
	}
	blockquote p:last-child { margin-bottom: 0; }

	figure { margin: 0 0 6mm; page-break-inside: avoid; }
	img { width: 100%; border: 1px solid #d8dee4; border-radius: 1.5mm; display: block; }
	figcaption {
		font-family: "Avenir Next", sans-serif; font-size: 8pt; color: #62717f;
		margin-top: 1.8mm; letter-spacing: 0.2pt;
	}
`;

const cover = (dateLabel) => `
<section class="cover">
	<div class="cover-top">
		<p class="eyebrow">Feature-Notizen</p>
		<h1>Räume und Bereiche:<br>Vorlagen, KI und offenes Material</h1>
		<p class="lead">Was die neuen Funktionen tun, wo man sie findet und wo ihre Grenzen liegen —
		für Kolleg:innen, Support und alle, die es wissen wollen, ohne in den Code zu schauen.</p>
	</div>
	<div class="toc">
		<div class="toc-row"><span>Raum-Vorlagen</span><span>sieben fertige Raumstrukturen mit Parametern statt leerem Raum</span></div>
		<div class="toc-row"><span>Raum mit KI erstellen</span><span>Raum in eigenen Worten beschreiben, Struktur vorschlagen lassen</span></div>
		<div class="toc-row"><span>Karten mit KI ergänzen</span><span>Differenzieren, Übungen, einfache Sprache, Selbstcheck — und OER-Material</span></div>
		<div class="toc-row"><span>Onboarding-Assistent</span><span>vier Fragen, danach passende Funktionen und Vorlagen statt einer Tour</span></div>
		<div class="toc-row"><span>Nostr-Suche</span><span>eigene Seite: offene Bildungsinhalte, Notizen und Profile im Nostr-Netz</span></div>
	</div>
	<p class="cover-meta">Stand ${dateLabel} · Screenshots aus dem laufenden System</p>
</section>`;

const main = async () => {
	const chapters = await Promise.all(
		NOTES.map(async ({ file, eyebrow }) => {
			const html = await toHtml(file);

			return `<section class="note"><p class="eyebrow">${eyebrow}</p>${html}</section>`;
		})
	);

	const dateLabel = process.env.DOCS_DATE ?? new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
	const page = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Räume und Bereiche: Vorlagen, KI und offenes Material</title>
<style>${STYLE}</style></head><body>${cover(dateLabel)}${chapters.join("")}</body></html>`;

	// lives next to the images so the relative paths in the markdown still resolve
	const pagePath = join(DOCS, ".pdf-build.html");
	await writeFile(pagePath, page);

	const userDataDir = await mkdtemp(join(tmpdir(), "svs-pdf-chrome-"));
	const chrome = spawn(CHROME, [
		"--headless=new",
		`--remote-debugging-port=${PORT}`,
		`--user-data-dir=${userDataDir}`,
		"--no-first-run",
		"about:blank",
	]);
	chrome.on("error", (error) => console.error("chrome:", error.message));

	let browserUrl;
	for (let attempt = 0; attempt < 40 && browserUrl === undefined; attempt += 1) {
		try {
			browserUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl;
		} catch {
			await sleep(250);
		}
	}
	if (browserUrl === undefined) throw new Error("chrome did not open its debugging port");

	const socket = new WebSocket(browserUrl);
	await new Promise((resolve, reject) => {
		socket.addEventListener("open", resolve, { once: true });
		socket.addEventListener("error", reject, { once: true });
	});

	let nextId = 1;
	const send = (method, params = {}, sessionId) =>
		new Promise((resolve, reject) => {
			const id = nextId++;
			const onMessage = (event) => {
				const message = JSON.parse(event.data);
				if (message.id !== id) return;

				socket.removeEventListener("message", onMessage);
				message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result);
			};
			socket.addEventListener("message", onMessage);
			socket.send(JSON.stringify({ id, method, params, sessionId }));
		});

	try {
		const { targetId } = await send("Target.createTarget", { url: "about:blank" });
		const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

		await send("Page.enable", {}, sessionId);
		await send("Page.navigate", { url: `file://${pagePath}` }, sessionId);
		await sleep(2500);

		// the pdf carries ten screenshots, too much for one protocol message - read it as a stream
		const { stream } = await send(
			"Page.printToPDF",
			{
				transferMode: "ReturnAsStream",
				printBackground: true,
				paperWidth: 8.27,
				paperHeight: 11.69,
				marginTop: 0.79,
				marginBottom: 0.79,
				marginLeft: 0.79,
				marginRight: 0.79,
				displayHeaderFooter: true,
				headerTemplate: "<span></span>",
				footerTemplate: `<div style="width:100%;padding:0 20mm;font:7.5pt 'Helvetica Neue',sans-serif;color:#8a97a3;display:flex;justify-content:space-between;">
					<span>Feature-Notizen · Räume und Bereiche</span><span class="pageNumber"></span></div>`,
			},
			sessionId
		);

		const chunks = [];
		for (let done = false; !done; ) {
			const part = await send("IO.read", { handle: stream, size: 512 * 1024 }, sessionId);
			chunks.push(Buffer.from(part.data, part.base64Encoded === true ? "base64" : "utf8"));
			done = part.eof;
		}
		await send("IO.close", { handle: stream }, sessionId);

		await writeFile(OUT, Buffer.concat(chunks));
		console.log(`✓ ${OUT} (${Math.round(Buffer.concat(chunks).length / 1024)} KB)`);
	} finally {
		socket.close();
		chrome.kill();
		await unlink(pagePath).catch(() => {});
	}
};

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
