"use client";

import { useEffect, useState } from "react";

export default function VideoLibrary() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  async function loadVideos(query = "") {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/videos?search=${encodeURIComponent(query)}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load videos");
      }

      setVideos(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVideos();
  }, []);

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>
            {process.env.NEXT_PUBLIC_SITE_TITLE || "My Video Library"}
          </h1>
          <p>Bunny Stream + Vercel</p>
        </div>

        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            loadVideos(search);
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
          />

          <button type="submit">Search</button>
        </form>
      </header>

      {loading && (
        <div className="status">
          Loading videos...
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid">
          {videos.map((video) => (
            <button
              className="card"
              key={video.guid}
              onClick={() => setSelected(video)}
            >
              <img
                src={video.thumbnailUrl}
                alt=""
                loading="lazy"
              />

              <div className="cardBody">
                <h2>{video.title || "Untitled video"}</h2>
                <span>{video.durationText}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="status">
          No videos found.
        </div>
      )}

      {selected && (
        <div
          className="modal"
          onClick={() => setSelected(null)}
        >
          <div
            className="playerBox"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <iframe
              src={selected.embedUrl}
              title={selected.title}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />

            <h2>{selected.title}</h2>
          </div>
        </div>
      )}
    </main>
  );
}
