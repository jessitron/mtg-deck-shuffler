import http from "http";
import { AddressInfo } from "net";
import {
  askMulliganAdvisorAgent,
  buildTrainerState,
  AdvisorChatContext,
  TrainerGameState,
} from "../../src/mulligan/advisorChat.js";

/** What the fake front door captured about the request it received. */
interface CapturedRequest {
  method: string;
  headers: http.IncomingHttpHeaders;
  body: any;
}

/**
 * A real local HTTP server standing in for the Trainer front door — a fake, not a
 * mock: it actually receives the request over the wire and returns a canned
 * response, so it exercises the genuine fetch/headers/body path. `cannedResponse`
 * controls what it replies; `captured` records the one request for assertions.
 */
class FakeFrontDoor {
  private server!: http.Server;
  captured?: CapturedRequest;
  statusCode = 200;
  cannedResponse: unknown = { reply: "noted", status: "chatting" };

  async start(): Promise<string> {
    this.server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        this.captured = {
          method: req.method ?? "",
          headers: req.headers,
          body: raw ? JSON.parse(raw) : undefined,
        };
        res.statusCode = this.statusCode;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(this.cannedResponse));
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, resolve));
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}/`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

function aContext(): AdvisorChatContext {
  const card = (name: string, cardTypes: string[]) => ({
    name,
    scryfallId: name,
    twoFaced: false,
    oracleCardName: name,
    colorIdentity: [],
    set: "test",
    cardTypes,
  });
  return {
    input: {
      hand: [card("Island", ["Land"]), card("Grizzly Bears", ["Creature"])],
      commanders: [card("Atraxa", ["Legendary", "Creature"])],
      mulligansSoFar: 1,
    },
    recommendation: { decision: "keep", confidence: 0.6, commentary: "two lands is fine" },
  };
}

const SESSION_ID = "mtg-deck-shuffler-00000000-0000-0000-0000-000000000000";

function aState(): TrainerGameState {
  return buildTrainerState(aContext());
}

describe("askMulliganAdvisorAgent — v2.0 wire contract", () => {
  let frontDoor: FakeFrontDoor;
  const savedUrl = process.env.TRAINER_AGENT_URL;
  const savedToken = process.env.TRAINER_AGENT_TOKEN;

  beforeEach(async () => {
    frontDoor = new FakeFrontDoor();
    process.env.TRAINER_AGENT_URL = await frontDoor.start();
    process.env.TRAINER_AGENT_TOKEN = "test-token";
  });

  afterEach(async () => {
    await frontDoor.stop();
    process.env.TRAINER_AGENT_URL = savedUrl;
    process.env.TRAINER_AGENT_TOKEN = savedToken;
  });

  it("POSTs {message, session_id, seq, state} with bearer auth and the v2.0 version header", async () => {
    const state = aState();
    await askMulliganAdvisorAgent("hello", SESSION_ID, 1, state);

    const req = frontDoor.captured!;
    expect(req.method).toBe("POST");
    expect(req.headers["authorization"]).toBe("Bearer test-token");
    expect(req.headers["x-trainer-agent-interface-version"]).toBe("2.0");
    expect(req.headers["content-type"]).toContain("application/json");
    expect(req.body).toEqual({ message: "hello", session_id: SESSION_ID, seq: 1, state });
  });

  it("sends hand and commanders as { name } objects so comma-containing names are unambiguous", async () => {
    await askMulliganAdvisorAgent("is this right?", SESSION_ID, 1, aState());

    const body = frontDoor.captured!.body;
    expect(body.message).toBe("is this right?");
    // Cards are objects, not bare strings — a name like "Iron Monger, Sadistic Tycoon"
    // is unambiguous where a flat string[] would look like two separate cards.
    expect(body.state.hand).toContainEqual({ name: "Island" });
    expect(body.state.commanders).toContainEqual({ name: "Atraxa" });
    expect(body.state.mulligansSoFar).toBe(1);
    expect(body.state.advisorRecommendation.decision).toBe("keep");
  });

  it("sends the given seq on continuation turns", async () => {
    await askMulliganAdvisorAgent("third message", SESSION_ID, 3, aState());
    expect(frontDoor.captured!.body.seq).toBe(3);
  });

  it("maps the {reply, status, pr_url} response, renaming pr_url to prUrl", async () => {
    frontDoor.cannedResponse = {
      reply: "opened a PR",
      status: "done",
      pr_url: "https://github.com/jessitron/mtg-deck-shuffler/pull/0",
    };

    const result = await askMulliganAdvisorAgent("open the pr", SESSION_ID, 1, aState());

    expect(result).toEqual({
      reply: "opened a PR",
      status: "done",
      prUrl: "https://github.com/jessitron/mtg-deck-shuffler/pull/0",
    });
  });

  it("throws (with the status) when the front door returns a non-2xx", async () => {
    frontDoor.statusCode = 401;
    frontDoor.cannedResponse = { error: "unauthorized" };

    await expect(askMulliganAdvisorAgent("hi", SESSION_ID, 1, aState())).rejects.toThrow(/401/);
  });

  it("returns the placeholder (no network) when no URL is configured", async () => {
    delete process.env.TRAINER_AGENT_URL;

    const result = await askMulliganAdvisorAgent("hi", SESSION_ID, 1, aState());

    expect(result).toEqual({ reply: "Well isn't that special", status: "chatting" });
    expect(frontDoor.captured).toBeUndefined();
  });
});
