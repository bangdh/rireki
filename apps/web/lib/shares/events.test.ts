import { expect, test } from "vitest";
import { GateInput, ViewerEventInput } from "./events";

test("ViewerEventInput accepts the five client events", () => {
  expect(ViewerEventInput.parse({ type: "play_video", videoId: "v1" })).toEqual({ type: "play_video", videoId: "v1" });
  expect(ViewerEventInput.parse({ type: "video_progress", eventId: "e1", progress: 75, positionSec: 69 })).toMatchObject({ progress: 75 });
  expect(ViewerEventInput.parse({ type: "heartbeat", eventId: "e1" })).toEqual({ type: "heartbeat", eventId: "e1" });
  expect(ViewerEventInput.parse({ type: "blocked_action", action: "print", keys: "Ctrl+P", candidateId: "c1" })).toMatchObject({ action: "print" });
  expect(ViewerEventInput.parse({ type: "blocked_action", action: "contextmenu" })).toMatchObject({ action: "contextmenu" });
  expect(ViewerEventInput.parse({ type: "download", candidateId: "c1" })).toEqual({ type: "download", candidateId: "c1" });
});

test("ViewerEventInput rejects unknown types, server-only types and bad progress values", () => {
  expect(ViewerEventInput.safeParse({ type: "open_cv", candidateId: "c1" }).success).toBe(false); // logged by the page, never by the client
  expect(ViewerEventInput.safeParse({ type: "unlock" }).success).toBe(false);
  expect(ViewerEventInput.safeParse({ type: "video_progress", eventId: "e1", progress: 60, positionSec: 1 }).success).toBe(false);
  expect(ViewerEventInput.safeParse({ type: "video_progress", eventId: "e1", progress: 50, positionSec: -1 }).success).toBe(false);
  expect(ViewerEventInput.safeParse({ type: "play_video" }).success).toBe(false);
  expect(ViewerEventInput.safeParse({ type: "heartbeat" }).success).toBe(false);
  expect(ViewerEventInput.safeParse(null).success).toBe(false);
});

test("GateInput treats blanks as missing and normalizes the email", () => {
  expect(GateInput.parse({ password: "", name: "", email: "" })).toEqual({});
  expect(GateInput.parse({ password: "Yk7-mQ2p-4Wv", name: " 田中 健一 ", email: " Tanaka@Yamato-K.co.jp " })).toEqual({ password: "Yk7-mQ2p-4Wv", name: "田中 健一", email: "tanaka@yamato-k.co.jp" });
  expect(GateInput.safeParse({ email: "not-an-email" }).success).toBe(false);
});
