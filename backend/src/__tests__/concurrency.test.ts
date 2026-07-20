import { describe, it, expect } from "vitest";
import { KeyedMutex } from "../utils/concurrency.js";

describe("KeyedMutex", () => {
  it("executes function sequentially for same key", async () => {
    const mutex = new KeyedMutex();
    const order: number[] = [];
    await Promise.all([
      mutex.acquire("key1", async () => { order.push(1); await new Promise(r => setTimeout(r, 10)); order.push(2); }),
      mutex.acquire("key1", async () => { order.push(3); await new Promise(r => setTimeout(r, 5)); order.push(4); }),
    ]);
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it("allows parallel execution for different keys", async () => {
    const mutex = new KeyedMutex();
    const order: number[] = [];
    let releaseKey1!: () => void;
    const key1Blocked = new Promise<void>((resolve) => { releaseKey1 = resolve; });
    await Promise.all([
      mutex.acquire("key1", async () => { order.push(1); await key1Blocked; order.push(2); }),
      mutex.acquire("key2", async () => { order.push(3); order.push(4); releaseKey1(); }),
    ]);
    expect(order).toEqual([1, 3, 4, 2]);
  });

  it("keeps later tasks queued when an earlier task releases", async () => {
    const mutex = new KeyedMutex();
    const order: number[] = [];
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const firstBlocked = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const secondBlocked = new Promise<void>((resolve) => { releaseSecond = resolve; });

    const first = mutex.acquire("key", async () => { order.push(1); await firstBlocked; order.push(2); });
    const second = mutex.acquire("key", async () => { order.push(3); await secondBlocked; order.push(4); });
    releaseFirst();
    await first;
    const third = mutex.acquire("key", async () => { order.push(5); });
    await Promise.resolve();
    expect(order).toEqual([1, 2, 3]);
    releaseSecond();
    await Promise.all([second, third]);
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it("detects locked keys", async () => {
    const mutex = new KeyedMutex();
    const p = mutex.acquire("locked-key", async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(mutex.isLocked("locked-key")).toBe(true);
    await p;
    expect(mutex.isLocked("locked-key")).toBe(false);
  });

  it("reports active locks count", async () => {
    const mutex = new KeyedMutex();
    expect(mutex.activeLocks).toBe(0);
    const p = Promise.all([
      mutex.acquire("a", async () => { await new Promise(r => setTimeout(r, 20)); }),
      mutex.acquire("b", async () => { await new Promise(r => setTimeout(r, 20)); }),
    ]);
    expect(mutex.activeLocks).toBe(2);
    await p;
    expect(mutex.activeLocks).toBe(0);
  });

  it("cleans up lock on rejection", async () => {
    const mutex = new KeyedMutex();
    await expect(mutex.acquire("fail-key", async () => { throw new Error("fail"); })).rejects.toThrow("fail");
    expect(mutex.isLocked("fail-key")).toBe(false);
  });
});
