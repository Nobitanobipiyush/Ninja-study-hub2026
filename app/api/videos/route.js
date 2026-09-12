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

export async function GET(request) {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;

  if (!libraryId || !apiKey) {
    return NextResponse.json(
      {
        error:
          "Bunny credentials are not configured. Add BUNNY_LIBRARY_ID and BUNNY_API_KEY in Vercel."
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  try {
    const all = [];
    let page = 1;
    const itemsPerPage = 100;

    while (page <= 100) {
      const url = new URL(
        `https://video.bunnycdn.com/library/${libraryId}/videos`
      );

      url.searchParams.set("page", String(page));
      url.searchParams.set("itemsPerPage", String(itemsPerPage));

      if (search) {
        url.searchParams.set("search", search);
      }

      const response = await fetch(url, {
        headers: {
          AccessKey: apiKey,
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        const text = await response.text();

        return NextResponse.json(
          {
            error: `Bunny API error (${response.status}): ${text.slice(0, 300)}`
          },
          { status: 502 }
        );
      }

      const data = await response.json();
      const items = data.items || data.Items || [];

      all.push(...items);

      const total = Number(
        data.totalItems ?? data.TotalItems ?? 0
      );

      if (
        items.length < itemsPerPage ||
        (total && all.length >= total)
      ) {
        break;
      }

      page++;
    }

    const result = all.map((v) => ({
      guid: v.guid || v.videoGuid,

      title: v.title || "Untitled video",

      duration: v.length || v.duration || 0,

      durationText: formatDuration(
        v.length || v.duration || 0
      ),

      thumbnailUrl: v.thumbnailFileName
        ? `https://vz-${
            v.videoLibraryId || libraryId
          }.b-cdn.net/${v.guid}/${v.thumbnailFileName}`
        : `https://vz-${
            v.videoLibraryId || libraryId
          }.b-cdn.net/${v.guid}/thumbnail.jpg`,

      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${v.guid}`
    }));

    return NextResponse.json({
      items: result,
      total: result.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Unexpected server error"
      },
      { status: 500 }
    );
  }
}
