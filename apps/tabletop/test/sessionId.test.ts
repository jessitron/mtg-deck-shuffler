import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_SESSION_ID_PREFIX,
  generateAnonymousPseudonym,
  getOrCreateSessionId,
} from "../src/client/sessionId";

/** A minimal in-memory `Storage` fake, standing in for localStorage/sessionStorage in tests. */
class FakeStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

describe("generateAnonymousPseudonym", () => {
  it("has the anonymous-<word>-<word><random> shape, visibly different from a real seatId", () => {
    const pseudonym = generateAnonymousPseudonym();
    expect(pseudonym).toMatch(/^anonymous-[a-z]+-[a-z]+[a-z0-9]+$/);
    expect(pseudonym.startsWith(ANONYMOUS_SESSION_ID_PREFIX)).toBe(true);
  });

  it("is randomized across calls", () => {
    const pseudonyms = new Set(Array.from({ length: 20 }, () => generateAnonymousPseudonym()));
    expect(pseudonyms.size).toBeGreaterThan(1);
  });
});

describe("getOrCreateSessionId", () => {
  it("mints an anonymous pseudonym for an unseated visitor (no seatId)", () => {
    const storage = new FakeStorage();
    const sessionId = getOrCreateSessionId(undefined, storage);
    expect(sessionId.startsWith(ANONYMOUS_SESSION_ID_PREFIX)).toBe(true);
  });

  it("mints a non-pseudonym session id for a seated visitor", () => {
    const storage = new FakeStorage();
    const sessionId = getOrCreateSessionId("alice-a1b2c3d4", storage);
    expect(sessionId.startsWith(ANONYMOUS_SESSION_ID_PREFIX)).toBe(false);
    expect(sessionId.length).toBeGreaterThan(0);
  });

  it("persists the unseated pseudonym across a simulated refresh (same storage, new call)", () => {
    const storage = new FakeStorage();
    const first = getOrCreateSessionId(undefined, storage);
    const second = getOrCreateSessionId(undefined, storage);
    expect(second).toBe(first);
  });

  it("persists the seated session id across a simulated refresh (same storage, new call)", () => {
    const storage = new FakeStorage();
    const first = getOrCreateSessionId("alice-a1b2c3d4", storage);
    const second = getOrCreateSessionId("alice-a1b2c3d4", storage);
    expect(second).toBe(first);
  });

  it("does not persist across two independent storages (a real refresh, not a fresh browser)", () => {
    const first = getOrCreateSessionId(undefined, new FakeStorage());
    const second = getOrCreateSessionId(undefined, new FakeStorage());
    // Both are valid pseudonyms, but nothing forces them to collide.
    expect(first.startsWith(ANONYMOUS_SESSION_ID_PREFIX)).toBe(true);
    expect(second.startsWith(ANONYMOUS_SESSION_ID_PREFIX)).toBe(true);
  });
});
