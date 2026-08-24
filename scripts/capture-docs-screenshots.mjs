/**
 * Takes the screenshots for the feature notes in docs/features.
 *
 * There is no headless browser in the toolchain, so this drives a plain Chrome over the devtools
 * protocol: log in through the api, plant the session cookie, open a page, click what the note
 * shows and capture it.
 *
 *   node scripts/capture-docs-screenshots.mjs [name ...]
 *
 * Needs the local stack (server :3030) and the client of this worktree (:4001).
 */
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLIENT = process.env.DOCS_CLIENT_URL ?? "http://localhost:4001";
const API = process.env.DOCS_API_URL ?? "http://localhost:3030/api/v3";
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const OUT_DIR = new URL("../docs/features/images/", import.meta.url).pathname;
const VIEWPORT = { width: 1440, height: 900 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** every shot: where to go, what to do there, how long the doing takes */
const SHOTS = [
	{
		name: "room-templates-gallery",
		url: "/rooms/new",
		wait: 1500,
	},
	{
		name: "room-template-form",
		url: "/rooms/new",
		script: `document.querySelector('[data-testid="room-template-subject"]').click()`,
		wait: 1500,
	},
	{
		name: "room-ai-prompt",
		url: "/rooms/new",
		script: `(() => {
			const field = document.querySelector('[data-testid="room-ai-prompt-input"] textarea');
			field.value = "Deutsch 7. Klasse, Unterrichtsreihe zu Balladen über vier Wochen";
			field.dispatchEvent(new Event("input", { bubbles: true }));
		})()`,
		wait: 1200,
	},
	{
		name: "board-card-menu",
		url: (ids) => `/boards/${ids.boardId}`,
		script: `document.querySelector('[data-testid="card-menu-btn-0-0"]').click()`,
		wait: 1200,
	},
	{
		name: "board-ai-dialog",
		url: (ids) => `/boards/${ids.boardId}`,
		script: `(() => {
			document.querySelector('[data-testid="card-menu-btn-0-0"]').click();
			setTimeout(() => document.querySelector('[data-testid="card-menu-ai-cards"]').click(), 400);
		})()`,
		wait: 2500,
	},
	{
		name: "board-material-search",
		url: (ids) => `/boards/${ids.boardId}`,
		script: `(() => {
			document.querySelector('[data-testid="card-menu-btn-0-0"]').click();
			setTimeout(() => {
				document.querySelector('[data-testid="card-menu-ai-cards"]').click();
				setTimeout(() => {
					document.querySelector('[data-testid="board-ai-preset-material"]').click();
					setTimeout(() => {
						const field = document.querySelector('[data-testid="board-ai-query"] input');
						field.value = "Fotosynthese";
						field.dispatchEvent(new Event("input", { bubbles: true }));
						setTimeout(() => document.querySelector('[data-testid="board-ai-generate-btn"]').click(), 300);
					}, 400);
				}, 400);
			}, 400);
		})()`,
		wait: 20000,
	},
	{
		name: "onboarding-start",
		url: "/onboarding",
		wait: 1500,
	},
	{
		name: "onboarding-suggestions",
		url: "/onboarding",
		script: `(() => {
			document.querySelector('[data-testid="teacher-type-class-teacher"]').click();
			setTimeout(() => {
				document.querySelector('[data-testid="next-btn"]').click();
				setTimeout(() => {
					document.querySelector('[data-testid="experience-beginner"]').click();
					document.querySelector('[data-testid="focus-collaboration"]').click();
					document.querySelector('[data-testid="focus-organization"]').click();
					setTimeout(() => document.querySelector('[data-testid="next-btn"]').click(), 400);
				}, 500);
			}, 400);
		})()`,
		wait: 2500,
		fullPage: true,
	},
	{
		name: "onboarding-templates",
		url: "/onboarding",
		script: `(() => {
			document.querySelector('[data-testid="teacher-type-class-teacher"]').click();
			setTimeout(() => {
				document.querySelector('[data-testid="next-btn"]').click();
				setTimeout(() => {
					document.querySelector('[data-testid="experience-beginner"]').click();
					document.querySelector('[data-testid="focus-collaboration"]').click();
					setTimeout(() => {
						document.querySelector('[data-testid="next-btn"]').click();
						setTimeout(() => document.querySelector('[data-testid="next-btn"]').click(), 500);
					}, 400);
				}, 500);
			}, 400);
		})()`,
		wait: 2500,
		fullPage: true,
	},
	{
		name: "board-ai-suggestion",
		url: (ids) => `/boards/${ids.boardId}`,
		script: `(() => {
			document.querySelector('[data-testid="card-menu-btn-0-0"]').click();
			setTimeout(() => {
				document.querySelector('[data-testid="card-menu-ai-cards"]').click();
				setTimeout(() => document.querySelector('[data-testid="board-ai-generate-btn"]').click(), 500);
			}, 400);
		})()`,
		wait: 60000,
	},
];

const login = async () => {
	const response = await fetch(`${API}/authentication/local`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			username: process.env.DOCS_USER ?? "lehrer@schul-cloud.org",
			password: process.env.DOCS_PASSWORD ?? "Schulcloud1!",
		}),
	});
	if (!response.ok) throw new Error(`login failed: ${response.status}`);

	const { accessToken } = await response.json();
	return accessToken;
};

/** the boards of the demo content differ per machine, so look one up instead of hard coding it */
const findBoard = async (token) => {
	if (process.env.DOCS_BOARD_ID) return { boardId: process.env.DOCS_BOARD_ID };

	const headers = { authorization: `Bearer ${token}` };
	const rooms = await (await fetch(`${API}/rooms`, { headers })).json();
	for (const room of rooms.data) {
		const boards = await (await fetch(`${API}/rooms/${room.id}/boards`, { headers })).json();
		if (boards.data.length > 0) return { roomId: room.id, boardId: boards.data[0].id };
	}
	throw new Error("no room with a board found - seed some demo content first");
};

const startChrome = async () => {
	const userDataDir = await mkdtemp(join(tmpdir(), "svs-docs-chrome-"));
	const chrome = spawn(CHROME, [
		"--headless=new",
		`--remote-debugging-port=${PORT}`,
		`--user-data-dir=${userDataDir}`,
		`--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
		"--hide-scrollbars",
		"--no-first-run",
		"about:blank",
	]);
	chrome.on("error", (error) => console.error("chrome:", error.message));

	for (let attempt = 0; attempt < 40; attempt += 1) {
		try {
			const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
			return { chrome, browserUrl: version.webSocketDebuggerUrl };
		} catch {
			await sleep(250);
		}
	}
	throw new Error("chrome did not open its debugging port");
};

/** a tiny devtools protocol client: send a command, wait for the answer with the same id */
const connect = async (url) => {
	const socket = new WebSocket(url);
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

	return { send, close: () => socket.close() };
};

/** most shots want the window, a few are taller than it and want the whole page */
const shape = async (client, sessionId, shot) => {
	if (shot.fullPage !== true) return { format: "png" };

	const { cssContentSize } = await client.send("Page.getLayoutMetrics", {}, sessionId);

	return {
		format: "png",
		captureBeyondViewport: true,
		// the emulation already renders at 2x, the clip must not scale on top of it
		clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 },
	};
};

const capture = async (client, sessionId, shot, ids) => {
	const path = typeof shot.url === "function" ? shot.url(ids) : shot.url;

	await client.send("Page.navigate", { url: `${CLIENT}${path}` }, sessionId);
	await sleep(3500);

	// the dev server floats a devtools bubble over the page, which is nothing the product has
	await client.send(
		"Runtime.evaluate",
		{
			expression: `(() => {
				const style = document.createElement("style");
				style.textContent = ".vue-devtools__anchor, .vue-devtools__panel { display: none !important; }";
				document.head.appendChild(style);
			})()`,
		},
		sessionId
	);

	if (shot.script) {
		await client.send("Runtime.evaluate", { expression: shot.script, awaitPromise: false }, sessionId);
	}
	await sleep(shot.wait ?? 1000);

	const { data } = await client.send("Page.captureScreenshot", await shape(client, sessionId, shot), sessionId);
	await writeFile(join(OUT_DIR, `${shot.name}.png`), Buffer.from(data, "base64"));
	console.log(`✓ ${shot.name}.png`);
};

const main = async () => {
	const wanted = process.argv.slice(2);
	const shots = wanted.length > 0 ? SHOTS.filter((shot) => wanted.includes(shot.name)) : SHOTS;
	if (shots.length === 0) throw new Error(`unknown shot, known are: ${SHOTS.map((s) => s.name).join(", ")}`);

	await mkdir(OUT_DIR, { recursive: true });
	const token = await login();
	const ids = await findBoard(token);
	const { chrome, browserUrl } = await startChrome();
	const client = await connect(browserUrl);

	try {
		const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
		const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });

		await client.send("Page.enable", {}, sessionId);
		await client.send("Network.enable", {}, sessionId);
		await client.send(
			"Emulation.setDeviceMetricsOverride",
			{ ...VIEWPORT, deviceScaleFactor: 2, mobile: false },
			sessionId
		);
		await client.send("Network.setCookie", { name: "jwt", value: token, domain: "localhost", path: "/" }, sessionId);

		for (const shot of shots) {
			await capture(client, sessionId, shot, ids);
		}
	} finally {
		client.close();
		chrome.kill();
	}
};

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
