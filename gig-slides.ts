export type GigMediaItem =
  | { type: "image"; url: string }
  | { type: "video"; url: string; thumbnailUrl?: string };

export function gigDetailMedia(photos: string[], videos: Array<string | { url?: string; thumbnailUrl?: string }>): GigMediaItem[] {
  const images = photos.filter((url) => Boolean(url)).map((url) => ({ type: "image" as const, url }));
  const clips = videos.flatMap((item) => {
    const url = typeof item === "string" ? item : item?.url || "";
    if (!url) return [];
    const thumbnailUrl = typeof item === "string" ? undefined : item.thumbnailUrl;
    return thumbnailUrl ? [{ type: "video" as const, url, thumbnailUrl }] : [{ type: "video" as const, url }];
  });
  return [...images, ...clips];
}
