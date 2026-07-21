import "#nitro/virtual/polyfills";
import { serve } from "srvx/bun";
import wsAdapter from "crossws/adapters/bun";
import { useNitroApp } from "nitro/app";
import { startScheduleRunner } from "#nitro/runtime/task";
import { trapUnhandledErrors } from "#nitro/runtime/error/hooks";
import { resolveWebsocketHooks } from "#nitro/runtime/app";
import { tracingSrvxPlugins } from "#nitro/virtual/tracing";
import { mkdirSync, rmSync, chmodSync, renameSync } from "node:fs";
import { dirname } from "node:path";
const _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
const port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
const host = process.env.NITRO_HOST || process.env.HOST;
const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const unixSocket = process.env.NITRO_UNIX_SOCKET;
const unixSocketTemp = unixSocket ? `${unixSocket}.temp` : undefined;
const _parsedUnixSocketMode = process.env.NITRO_UNIX_SOCKET_MODE ? Number.parseInt(process.env.NITRO_UNIX_SOCKET_MODE, 8) : Number.NaN;
const unixSocketMode = Number.isNaN(_parsedUnixSocketMode) ? 0o666 : _parsedUnixSocketMode;

if (unixSocket) {
	mkdirSync(dirname(unixSocket), { recursive: true });
	rmSync(unixSocket, { force: true });
	rmSync(unixSocketTemp, { force: true });
	console.log(`[nitro-bun-uds] binding unix socket at temp path: ${unixSocketTemp}`);
}

const nitroApp = useNitroApp();
let _fetch = nitroApp.fetch;
const ws = import.meta._websocket ? wsAdapter({ resolve: resolveWebsocketHooks }) : undefined;
if (import.meta._websocket) {
	_fetch = (req) => {
		if (req.headers.get("upgrade") === "websocket") {
			return ws.handleUpgrade(req, req.runtime.bun.server);
		}
		return nitroApp.fetch(req);
	};
}
const server = serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : undefined,
	fetch: _fetch,
	bun: unixSocket ? {
		unix: unixSocketTemp,
		port: undefined,
		hostname: undefined,
		websocket: import.meta._websocket ? ws?.websocket : undefined
	} : { websocket: import.meta._websocket ? ws?.websocket : undefined },
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();

if (unixSocket) {
	chmodSync(unixSocketTemp, unixSocketMode);
	console.log(`[nitro-bun-uds] set permissions ${unixSocketMode.toString(8)} on ${unixSocketTemp}`);
	renameSync(unixSocketTemp, unixSocket);
	console.log(`[nitro-bun-uds] unix socket ready at: ${unixSocket}`);
}

if (import.meta._tasks) {
	startScheduleRunner({ waitUntil: server.waitUntil });
}
export default {};
