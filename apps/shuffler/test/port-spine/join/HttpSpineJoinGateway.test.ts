import http from "node:http";
import { AddressInfo } from "node:net";
import { HttpSpineJoinGateway } from "../../../src/port-spine/join/HttpSpineJoinGateway.js";
import { HttpSpineJoinAdapter } from "../../../src/port-spine/join/HttpSpineJoinAdapter.js";
import { assertValidatesAsSpineJoinRequest, assertValidatesAsSpineJoinResponse } from "../../table-sync/contractValidation.js";

/** A Spine reduced to its `/join` wire shape: records bodies, answers with a fixed seat. */
class WireOnlySpine {
  public readonly bodies: unknown[] = [];
  public readonly reply = { tableId: "friday-1a2b3c4d", seatId: "jess-1234abcd", seatNumber: 2, tableUrl: "http://table.test/t/friday-1a2b3c4d?seat=jess-1234abcd" };
  private readonly server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      this.bodies.push(JSON.parse(raw));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(this.reply));
    });
  });

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  stop(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

describe("HttpSpineJoinGateway against the published /join contract", () => {
  const spine = new WireOnlySpine();
  let baseUrl: string;

  beforeAll(async () => {
    baseUrl = await spine.start();
  });
  afterAll(() => spine.stop());

  it("sends a body that satisfies the request contract, and the Spine's answer satisfies the response contract", async () => {
    const adapter = new HttpSpineJoinAdapter(new HttpSpineJoinGateway(baseUrl));

    const seat = await adapter.join({ gameId: "game-1", tableName: "Friday", playerName: "Jess", deckName: "Deck", gameUrl: "https://shuffler.test/game/game-1" });

    assertValidatesAsSpineJoinRequest(spine.bodies[0]);
    expect(spine.bodies[0]).toMatchObject({ joinRequestId: "game-1", name: "Friday" });
    assertValidatesAsSpineJoinResponse(spine.reply);
    expect(seat).toEqual(spine.reply);
  });
});
