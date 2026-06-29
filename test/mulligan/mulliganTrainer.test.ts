import { MulliganTrainer } from "../../src/mulligan/mulliganTrainer.js";
import { AdvisorChatContext, AskTrainerAgent, TrainerGameState, TrainerReply } from "../../src/mulligan/advisorChat.js";
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
  readonly calls: { message: string; sessionId: string; seq: number; state: TrainerGameState }[] = [];
  reply: TrainerReply = { reply: "noted", status: "chatting" };

  ask: AskTrainerAgent = async (message, sessionId, seq, state) => {
    this.calls.push({ message, sessionId, seq, state });
    return this.reply;
  };
}

function trainerWith(agent: FakeTrainerAgent): MulliganTrainer {
  // Inject the fake agent and a fixed clock for deterministic timestamps.
  return new MulliganTrainer(undefined, agent.ask, () => 1000);
}

describe("MulliganTrainer — session boundary", () => {
  it("sends the hand snapshot as `state` on EVERY turn", async () => {
    const agent = new FakeTrainerAgent();
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    await trainer.sendMessage(42, "first");
    await trainer.sendMessage(42, "second");

    expect(agent.calls).toHaveLength(2);
    // hand is an array of { name } objects — check the first card's name
    expect(agent.calls[0].state.hand[0].name).toBe("Island");
    expect(agent.calls[1].state.hand[0].name).toBe("Island"); // re-sent fresh each turn
    expect(agent.calls[1].state.advisorRecommendation.decision).toBe("keep");
  });

  it("keeps a stable sessionId and increments seq across turns on the happy path", async () => {
    const agent = new FakeTrainerAgent();
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    await trainer.sendMessage(42, "one");
    await trainer.sendMessage(42, "two");
    await trainer.sendMessage(42, "three");

    expect(agent.calls[0].sessionId).toBeTruthy();
    expect(agent.calls.map((c) => c.sessionId)).toEqual([
      agent.calls[0].sessionId,
      agent.calls[0].sessionId,
      agent.calls[0].sessionId,
    ]);
    expect(agent.calls.map((c) => c.seq)).toEqual([1, 2, 3]);
  });

  it("on a lost-session error, mints a new sessionId and resets seq for the next turn", async () => {
    const agent = new FakeTrainerAgent();
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    agent.reply = { reply: "I've lost the context — start a new conversation.", status: "error" };
    await trainer.sendMessage(42, "one"); // seq 1, lost session
    agent.reply = { reply: "noted", status: "chatting" };
    await trainer.sendMessage(42, "two"); // fresh session, seq back to 1

    expect(agent.calls[0].seq).toBe(1);
    expect(agent.calls[1].seq).toBe(1);
    expect(agent.calls[1].sessionId).not.toBe(agent.calls[0].sessionId);
  });

  it("returns the exchange with the agent's reply, status, PR link, and stamped time", async () => {
    const agent = new FakeTrainerAgent();
    agent.reply = { reply: "opened a PR", status: "done", prUrl: "https://github.com/x/y/pull/1" };
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    const exchange = await trainer.sendMessage(42, "why mulligan?");

    expect(exchange).toEqual({
      youText: "why mulligan?",
      trainerText: "opened a PR",
      status: "done",
      prUrl: "https://github.com/x/y/pull/1",
      receivedAt: 1000,
    });
  });

  it("stores the Trainer reply's status and PR link on the trainer message", async () => {
    const agent = new FakeTrainerAgent();
    agent.reply = { reply: "opened a PR", status: "done", prUrl: "https://github.com/x/y/pull/1" };
    const trainer = trainerWith(agent);

    trainer.startSession(42, aContext());
    await trainer.sendMessage(42, "go");

    const messages = trainer.getConversation(42)!.messages;
    const trainerMessage = messages.find((m) => m.role === "trainer")!;
    expect(trainerMessage.status).toBe("done");
    expect(trainerMessage.prUrl).toBe("https://github.com/x/y/pull/1");
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
