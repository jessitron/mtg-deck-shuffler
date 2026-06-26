// A tiny stand-in for the Trainer front door (INTERFACE.md v1.0), used by
// verify-trainer-live.sh to exercise the live wiring without the real agent or AWS.
// It returns a "done" reply with a PR link so we can verify the app renders the
// status tag and the "View PR" link end-to-end. Listens on PORT (default 8099).
import http from "http";

const PORT = Number(process.env.PORT ?? 8099);

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    console.error(
      `fake-frontdoor <- ${req.method} auth=${req.headers["authorization"]} ver=${req.headers["x-trainer-agent-interface-version"]}`
    );
    res.setHeader("content-type", "application/json");
    res.setHeader("x-trainer-agent-interface-version", "1.0");
    res.end(
      JSON.stringify({
        reply: "On it — opened a PR adding that hand as a blessed case.",
        status: "done",
        pr_url: "https://github.com/jessitron/mtg-deck-shuffler/pull/0",
      })
    );
  });
});

server.listen(PORT, () => console.error(`fake front door on http://localhost:${PORT}/`));
