import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { getPlaylistMembership, setVideoInPlaylist } from "../src/youtube/api";
import { parseYouTubeVideoContext } from "../src/youtube/videoContext";
import { adjustCachedYouTubePlaylistItemCount, ensureYouTubePlaylistCache } from "../src/youtube/playlistCache";
import { readSettings, writeSettings } from "../src/settings";
import { readFolderUsage, recordFolderUse } from "../src/folderUsage";

const playlist = { id: "PLtest", title: "Saved", itemCount: 1 };
const video = parseYouTubeVideoContext("https://www.youtube.com/watch?v=abcdefghijk")!;
const membership = { id: "item-1", snippet: { resourceId: { videoId: video.videoId } } };

function setup(t: TestContext) {
  const data: Record<string, unknown> = {};
  const area = {
    async get(keys: string | string[]) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]])); },
    async set(next: Record<string, unknown>) { Object.assign(data, next); },
    async remove(keys: string[]) { keys.forEach(key => delete data[key]); },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "chrome", original);
    else Reflect.deleteProperty(globalThis, "chrome");
  });
  Object.defineProperty(globalThis, "chrome", { configurable: true, value: {
    runtime: { getManifest: () => ({ oauth2: { client_id: "test-client" } }) },
    storage: { local: area, session: area },
    identity: { async getAuthToken() { return { token: "test-token" }; }, async removeCachedAuthToken() {} },
  } as unknown as typeof chrome });
  return data;
}

test("membership lookup filters by video ID and handles missing membership", async t => {
  setup(t);
  const requests: URL[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(new URL(input));
    return Response.json({ items: [] });
  });
  assert.equal(await getPlaylistMembership(playlist.id, video.videoId), null);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get("videoId"), video.videoId);
  assert.equal(requests[0].searchParams.get("playlistId"), playlist.id);
});

test("Add never removes an existing video and Remove never adds a missing video", async t => {
  setup(t);
  let present = true;
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (_input: string, init?: RequestInit) => {
    methods.push(init?.method ?? "GET");
    return Response.json({ items: present ? [membership] : [] });
  });
  assert.equal((await setVideoInPlaylist("add", playlist, video)).action, "unchanged");
  present = false;
  assert.equal((await setVideoInPlaylist("remove", playlist, video)).action, "unchanged");
  assert.deepEqual(methods, ["GET", "GET"]);
});

test("explicit Add and Remove send the expected mutations", async t => {
  setup(t);
  let present = false;
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (_input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    methods.push(method);
    if (method === "POST") {
      assert.equal(JSON.parse(String(init?.body)).snippet.resourceId.videoId, video.videoId);
      present = true;
      return Response.json({ id: "item-1" });
    }
    if (method === "DELETE") { present = false; return new Response(null, { status: 204 }); }
    return Response.json({ items: present ? [membership] : [] });
  });
  assert.equal((await setVideoInPlaylist("add", playlist, video)).action, "added");
  assert.equal((await setVideoInPlaylist("remove", playlist, video)).action, "removed");
  assert.deepEqual(methods, ["GET", "POST", "GET", "DELETE"]);
});

test("expired token is retried only once; API errors surface without mutation", async t => {
  setup(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ error: { message: "Unauthorized" } }, { status: 401 }); });
  await assert.rejects(getPlaylistMembership(playlist.id, video.videoId), /Unauthorized/);
  assert.equal(calls, 2);
});

test("local settings and folder history persist without enabling URL matching by default", async t => {
  const data = setup(t);
  assert.equal((await readSettings()).searchUrlsAndDomains, false);
  await writeSettings({ searchUrlsAndDomains: true });
  assert.equal((await readSettings()).searchUrlsAndDomains, true);
  data.folderUsage = { corrupt: { count: "many", lastUsed: 10 } };
  await recordFolderUse("1");
  await recordFolderUse("1");
  assert.equal((await readFolderUsage())["1"].count, 2);
  assert.equal((await readFolderUsage()).corrupt, undefined);
});

test("count updates do not postpone a stale playlist-cache refresh", async t => {
  const data = setup(t);
  data.youtubePlaylistCache = { version: 1, updatedAt: 0, playlists: [playlist] };
  await adjustCachedYouTubePlaylistItemCount(playlist.id, 1);
  assert.equal((data.youtubePlaylistCache as { updatedAt: number }).updatedAt, 0);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ items: [] }); });
  await ensureYouTubePlaylistCache();
  assert.equal(calls, 1);
});

test("YouTube URL parsing supports watch, Shorts, and short links and rejects unrelated hosts", () => {
  for (const url of ["https://youtube.com/watch?v=abcdefghijk", "https://youtube.com/shorts/abcdefghijk", "https://youtu.be/abcdefghijk"]) {
    assert.equal(parseYouTubeVideoContext(url)?.videoId, "abcdefghijk");
  }
  assert.equal(parseYouTubeVideoContext("https://youtube.com.attacker.example/watch?v=abcdefghijk"), null);
  assert.equal(parseYouTubeVideoContext("https://youtube.com/watch?v=bad"), null);
});
