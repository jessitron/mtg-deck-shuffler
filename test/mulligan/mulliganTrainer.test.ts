import { MulliganTrainer } from "../../src/mulligan/mulliganTrainer.js";
import { AdvisorChatContext, AskTrainerAgent } from "../../src/mulligan/advisorChat.js";
import { CardDefinition } from "../../src/types.js";

function card(name: string, cardTypes: string[]): CardDefinition {
  return {
    name,
    scryfallId: name,
    twoFaced: false,
    oracleCardName: name,
    colorIdentity: [],
    set: "test",
    cardTypes,
  };
}

function aContext(): AdvisorChatContext {
  const input = {
    hand: [card("Island", ["Land"]), card("Grizzly Bears", ["Creature"])],
    commanders: [card("Atraxa", ["Legendary", "Creature"])],
    mulligansSoFar: 0,
  };
  return { input, recommendation: { decision: "keep", confidence: 0.9, commentary: "fine" } };
}

/**
 * A fake Trainer agent: records every call and returns a canned reply. Stands in
 * for the AgentCore HTTP relay so we can exercise the conversation logic without
 * a network or a mock.
 */
class FakeTrainerAgent {
  readonly calls: { context: AdvisorChatContext | null; message: string; sessionId: string }[] = [];
  reply = "noted";

  ask: AskTrainerAgent = async (context, message, sessionId) => {
    this.calls.push({ context, message, sessionId });
    return this.reply;
  };
}

function trainerWith(agent: FakeTrainerAgent): MulliganTrainer {
  // Inject the fake agent and a fixed clock for deterministic timestamps.
  return new MulliganTrainer(undefined, agent.ask, () => 1000);
}

describe("MulliganTrainer — session boundary", () => {
  it("sends the hand snapshot to the agent on the FIRST turn only", async () => {
    const agent = new FakeTrainerAgent();
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    await trainer.sendMessage(42, "first");
    await trainer.sendMessage(42, "second");

    expect(agent.calls).toHaveLength(2);
    expect(agent.calls[0].context).not.toBeNull(); // snapshot on the first turn
    expect(agent.calls[1].context).toBeNull(); // never re-sent
  });

  it("keeps a stable sessionId across every turn", async () => {
    const agent = new FakeTrainerAgent();
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    await trainer.sendMessage(42, "one");
    await trainer.sendMessage(42, "two");

    expect(agent.calls[0].sessionId).toBe(agent.calls[1].sessionId);
    expect(agent.calls[0].sessionId).toBeTruthy();
  });

  it("returns the exchange with the agent's reply and the stamped time", async () => {
    const agent = new FakeTrainerAgent();
    agent.reply = "try counting commander pips";
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    const exchange = await trainer.sendMessage(42, "why mulligan?");

    expect(exchange).toEqual({ youText: "why mulligan?", trainerText: "try counting commander pips", receivedAt: 1000 });
  });

  it("refuses to send a message when no session has been started", async () => {
    const trainer = trainerWith(new FakeTrainerAgent());
    await expect(trainer.sendMessage(99, "hello")).rejects.toThrow();
  });

  it("ending a session wipes the conversation", async () => {
    const trainer = trainerWith(new FakeTrainerAgent());

    trainer.startSession(42, aContext());
    await trainer.sendMessage(42, "hi");
    expect(trainer.hasSession(42)).toBe(true);

    trainer.endSession(42, { rating: 4 });
    expect(trainer.hasSession(42)).toBe(false);
    expect(trainer.getConversation(42)).toBeUndefined();
  });
});
