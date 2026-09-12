import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CDN_HOSTNAME = "vz-ed4b60af-eaa.b-cdn.net";

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

    throw new Error(
      `Bunny API error (${response.status}): ${text.slice(0, 300)}`
    );
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
    // -------------------------
    // GET COLLECTIONS
    // -------------------------

    const collectionsData = await bunnyFetch(
      `https://video.bunnycdn.com/library/${libraryId}/collections?page=1&itemsPerPage=100`,
      apiKey
    );

    const collections =
      collectionsData.items ||
      collectionsData.Items ||
      [];

    const collectionMap = {};

    for (const collection of collections) {
      const id =
        collection.guid ||
        collection.Guid ||
        collection.id;

      if (id) {
        collectionMap[id] =
          collection.name ||
          collection.Name ||
          "Other Videos";
      }
    }

    // -------------------------
    // GET ALL VIDEOS
    // -------------------------

    const allVideos = [];

    let page = 1;
    const itemsPerPage = 100;

    while (page <= 100) {
      const url = new URL(
        `https://video.bunnycdn.com/library/${libraryId}/videos`
      );

      url.searchParams.set("page", String(page));
      url.searchParams.set(
        "itemsPerPage",
        String(itemsPerPage)
      );

      if (search) {
        url.searchParams.set("search", search);
      }

      const data = await bunnyFetch(
        url.toString(),
        apiKey
      );

      const videos =
        data.items ||
        data.Items ||
        [];

      allVideos.push(...videos);

      const total = Number(
        data.totalItems ||
        data.TotalItems ||
        0
      );

      if (
        videos.length < itemsPerPage ||
        (total && allVideos.length >= total)
      ) {
        break;
      }

      page++;
    }

    // -------------------------
    // FORMAT VIDEOS
    // -------------------------

    const videos = allVideos.map((video) => {
      const guid =
        video.guid ||
        video.Guid ||
        video.videoGuid;

      const collectionId =
        video.collectionId ||
        video.CollectionId ||
        "";

      const thumbnailFileName =
        video.thumbnailFileName ||
        video.ThumbnailFileName;

      const thumbnailUrl = thumbnailFileName
        ? `https://${CDN_HOSTNAME}/${guid}/${thumbnailFileName}`
        : `https://${CDN_HOSTNAME}/${guid}/thumbnail.jpg`;

      return {
        guid,

        title:
          video.title ||
          video.Title ||
          "Unnamed Video",

        duration:
          video.length ||
          video.Length ||
          video.duration ||
          0,

        durationText: formatDuration(
          video.length ||
          video.Length ||
          video.duration ||
          0
        ),

        thumbnailUrl,

        embedUrl:
          `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}`,

        collectionId,

        teacher:
          collectionMap[collectionId] ||
          "Other Videos"
      };
    });

    // -------------------------
    // GROUP BY COLLECTION
    // -------------------------

    const grouped = {};

    for (const video of videos) {
      const groupName =
        video.teacher || "Other Videos";

      if (!grouped[groupName]) {
        grouped[groupName] = {
          id: video.collectionId || groupName,
          name: groupName,
          items: []
        };
      }

      grouped[groupName].items.push(video);
    }

    // Harsal / Sanjay Sir first
    const preferredOrder = [
      "Harsal",
      "Sanjay Sir"
    ];

    const groups = Object.values(grouped).sort(
      (a, b) => {
        const ai = preferredOrder.indexOf(a.name);
        const bi = preferredOrder.indexOf(b.name);

        if (ai !== -1 && bi !== -1) {
          return ai - bi;
        }

        if (ai !== -1) return -1;
        if (bi !== -1) return 1;

        return a.name.localeCompare(b.name);
      }
    );

    return NextResponse.json({
      groups,
      total: videos.length
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
