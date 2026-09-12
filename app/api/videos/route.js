import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);

  if (h) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return `${m}:${String(sec).padStart(2, "0")}`;
}

async function bunnyFetch(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      AccessKey: apiKey,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bunny API ${response.status}: ${text.slice(0, 300)}`);
  }

  return response.json();
}

export async function GET(request) {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;

  if (!libraryId || !apiKey) {
    return NextResponse.json(
      {
        error: "Bunny credentials are not configured."
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  try {
    // Get Bunny library information.
    // This gives us the real Bunny CDN hostname.
    const library = await bunnyFetch(
      `https://video.bunnycdn.com/library/${libraryId}`,
      apiKey
    );

    const cdnHostname =
      library?.pullZone?.hostname ||
      library?.PullZone?.Hostname ||
      library?.hostname ||
      null;

    if (!cdnHostname) {
      throw new Error("Could not find Bunny CDN hostname.");
    }

    // Get collections.
    const collectionsData = await bunnyFetch(
      `https://video.bunnycdn.com/library/${libraryId}/collections?page=1&itemsPerPage=100`,
      apiKey
    );

    const collections =
      collectionsData.items ||
      collectionsData.Items ||
      [];

    const groups = [];

    for (const collection of collections) {
      const collectionId =
        collection.guid ||
        collection.collectionId ||
        collection.id;

      if (!collectionId) continue;

      const collectionName =
        collection.name ||
        collection.title ||
        "Other";

      const videosData = await bunnyFetch(
        `https://video.bunnycdn.com/library/${libraryId}/collections/${collectionId}/videos?page=1&itemsPerPage=100`,
        apiKey
      );

      const videos =
        videosData.items ||
        videosData.Items ||
        [];

      const items = videos
        .filter((video) => {
          if (!search) return true;

          const title = String(
            video.title || ""
          ).toLowerCase();

          return title.includes(search.toLowerCase());
        })
        .map((video) => {
          const guid = video.guid || video.videoGuid;

          const thumbnailFileName =
            video.thumbnailFileName;

          const thumbnailUrl = thumbnailFileName
            ? `https://${cdnHostname}/${guid}/${thumbnailFileName}`
            : `https://${cdnHostname}/${guid}/thumbnail.jpg`;

          return {
            guid,
            title: video.title || "Unnamed Video",
            duration:
              video.length ||
              video.duration ||
              0,
            durationText: formatDuration(
              video.length ||
              video.duration ||
              0
            ),
            thumbnailUrl,
            embedUrl:
              `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}`,
            teacher: collectionName
          };
        });

      if (items.length > 0) {
        groups.push({
          id: collectionId,
          name: collectionName,
          items
        });
      }
    }

    return NextResponse.json({
      groups,
      total: groups.reduce(
        (sum, group) => sum + group.items.length,
        0
      )
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unexpected server error"
      },
      { status: 500 }
    );
  }
}
