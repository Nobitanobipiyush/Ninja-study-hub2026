"use client";

import { useEffect, useState } from "react";

export default function VideoLibrary() {
  const [groups, setGroups] = useState([]);
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

      setGroups(data.groups || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
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
            {process.env.NEXT_PUBLIC_SITE_TITLE ||
              "Ninja Study Hub"}
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

      {!loading &&
        !error &&
        groups.map((group) => (
          <section
            className="teacher-section"
            key={group.id}
          >
            <h2>{group.name}</h2>

            <div className="video-grid">
              {group.items.map((video) => (
                <button
                  className="video-card"
                  key={video.guid}
                  onClick={() => setSelected(video)}
                >
                  <div className="thumbnail-wrap">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="thumbnail"
                      loading="lazy"
                    />
                  </div>

                  <div className="video-info">
                    <h3>
                      {video.title}
                    </h3>

                    <span>
                      {video.durationText}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

      {!loading &&
        !error &&
        groups.length === 0 && (
          <div className="status">
            No videos found.
          </div>
        )}

      {selected && (
        <div
          className="player-overlay"
          onClick={() => setSelected(null)}
        >
          <div
            className="player-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>

            <iframe
              src={selected.embedUrl}
              title={selected.title}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </main>
  );
                }
