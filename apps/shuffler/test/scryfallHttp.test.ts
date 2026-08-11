import { SCRYFALL_USER_AGENT, fetchScryfall } from "../src/scryfall-http.js";

describe("fetchScryfall", () => {
  const okResponse = () => new Response("", { status: 200 });

  function recordingFetch(): { calls: Array<{ url: string; headers: Headers }>; fetchFn: typeof fetch } {
    const calls: Array<{ url: string; headers: Headers }> = [];
    const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), headers: new Headers(init?.headers) });
      return okResponse();
    }) as unknown as typeof fetch;
    return { calls, fetchFn };
  }

  it("sends our descriptive User-Agent, not Node's default", async () => {
    const { calls, fetchFn } = recordingFetch();

    await fetchScryfall("https://cards.scryfall.io/png/front/f/6/abc.png?123", {}, fetchFn);

    expect(calls).toHaveLength(1);
    expect(calls[0].headers.get("user-agent")).toBe(SCRYFALL_USER_AGENT);
    expect(calls[0].headers.get("user-agent")).not.toBe("node");
  });

  it("identifies the app and links back to it, as Scryfall asks", () => {
    expect(SCRYFALL_USER_AGENT).toContain("mtg-deck-shuffler");
    expect(SCRYFALL_USER_AGENT).toContain("https://github.com/jessitron/mtg-deck-shuffler");
  });

  it("keeps caller-supplied headers alongside the User-Agent", async () => {
    const { calls, fetchFn } = recordingFetch();

    await fetchScryfall("https://api.scryfall.com/sets", { headers: { Accept: "application/json" } }, fetchFn);

    expect(calls[0].headers.get("accept")).toBe("application/json");
    expect(calls[0].headers.get("user-agent")).toBe(SCRYFALL_USER_AGENT);
  });

  it("passes the URL and method through untouched", async () => {
    const { calls, fetchFn } = recordingFetch();

    await fetchScryfall("https://api.scryfall.com/cards/collection", { method: "POST" }, fetchFn);

    expect(calls[0].url).toBe("https://api.scryfall.com/cards/collection");
  });
});
