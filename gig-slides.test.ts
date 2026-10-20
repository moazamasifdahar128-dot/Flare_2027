import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gigDetailMedia } from "./gig-slides.ts";

describe("gig detail media", () => {
  it("puts each photo and each video in its own slide, with no photo on a video", () => {
    const media = gigDetailMedia(
      ["photo-1", "photo-2", "photo-3"],
      ["/api/gig-media?id=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&s=15", "/api/gig-media?id=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb&s=28"],
    );
    assert.deepEqual(media.map((item) => item.type), ["image", "image", "image", "video", "video"]);
    assert.equal(media[0].url, "photo-1");
    assert.equal(media[3].type, "video");
    assert.equal("thumbnailUrl" in media[3], false);
    assert.equal(media[4].url.includes("bbbbbbbb"), true);
    assert.equal(media.filter((item) => item.type === "video").every((item) => item.url !== "photo-1"), true);
  });
});
