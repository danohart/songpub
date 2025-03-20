import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Results.module.css";

const platforms = {
  spotify: {
    name: "Spotify",
    color: "#1DB954",
    icon: "🎧",
  },
  appleMusic: {
    name: "Apple Music",
    color: "#FA586A",
    icon: "🍎",
  },
  youtube: {
    name: "YouTube",
    color: "#FF0000",
    icon: "▶️",
  },
  youtubeMusic: {
    name: "YouTube Music",
    color: "#FF0000",
    icon: "🎵",
  },
  deezer: {
    name: "Deezer",
    color: "#00C7F2",
    icon: "🎵",
  },
  tidal: {
    name: "Tidal",
    color: "#000000",
    icon: "🌊",
  },
  amazonMusic: {
    name: "Amazon Music",
    color: "#00A8E1",
    icon: "📦",
  },
  pandora: {
    name: "Pandora",
    color: "#3668FF",
    icon: "📻",
  },
  soundcloud: {
    name: "SoundCloud",
    color: "#FF7700",
    icon: "☁️",
  },
};

const mapPlatformKey = (key) => {
  const mapping = {
    spotify: "spotify",
    appleMusic: "appleMusic",
    youtube: "youtube",
    youtubeMusic: "youtubeMusic",
    deezer: "deezer",
    tidal: "tidal",
    amazonMusic: "amazonMusic",
    pandora: "pandora",
    soundcloud: "soundcloud",
  };
  return mapping[key] || key;
};

export default function Results() {
  const router = useRouter();
  const { url } = router.query;

  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;

    const fetchSongLinks = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/convert?url=${url}`);

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        setSongData(data);
      } catch (err) {
        console.error("Failed to fetch song links:", err);
        setError(
          "Failed to convert the link. Please try again with a different link."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSongLinks();
  }, [url]);

  const getMainEntity = () => {
    if (!songData) return null;

    const urlEntityKey =
      songData.linksByPlatform[Object.keys(songData.linksByPlatform)[0]]
        ?.entityUniqueId;

    if (!urlEntityKey) return null;

    return songData.entitiesByUniqueId[urlEntityKey];
  };

  const getPlatformLinks = () => {
    if (!songData) return [];

    return Object.entries(songData.linksByPlatform).map(([platform, data]) => {
      const mappedKey = mapPlatformKey(platform);
      const platformInfo = platforms[mappedKey] || {
        name: platform,
        color: "#888888",
        icon: "🔗",
      };

      return {
        platform: platformInfo.name,
        url: data.url,
        color: platformInfo.color,
        icon: platformInfo.icon,
      };
    });
  };

  const entity = getMainEntity();
  const platformLinks = getPlatformLinks();

  return (
    <div className={styles.container}>
      <Head>
        <title>
          {entity ? `${entity.title} - SongPub` : "Converting - SongPub"}
        </title>
        <meta
          name='description'
          content='View this music across all streaming platforms'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <Link href='/' className={styles.homeLink}>
          <h1 className={styles.logo}>SongPub</h1>
        </Link>

        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loading}></div>
            <p>Converting your link...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorContainer}>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <Link href='/' className={styles.button}>
              Try Another Link
            </Link>
          </div>
        )}

        {!loading && !error && songData && (
          <div className={styles.resultsContainer}>
            {entity && (
              <div className={styles.songInfo}>
                {entity.thumbnailUrl && (
                  <img
                    src={entity.thumbnailUrl}
                    alt={entity.title}
                    className={styles.thumbnail}
                  />
                )}
                <div className={styles.songDetails}>
                  <h2>{entity.title}</h2>
                  {entity.artistName && (
                    <p className={styles.artist}>{entity.artistName}</p>
                  )}
                  {entity.type && <p className={styles.type}>{entity.type}</p>}
                </div>
              </div>
            )}

            <h3 className={styles.linksTitle}>Listen on:</h3>

            <div className={styles.linksList}>
              {platformLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={styles.platformLink}
                  style={{
                    "--platform-color": link.color,
                  }}
                >
                  <span className={styles.platformIcon}>{link.icon}</span>
                  <span>{link.platform}</span>
                </a>
              ))}
            </div>

            <div className={styles.actions}>
              <Link href='/' className={styles.button}>
                Convert Another Link
              </Link>

              <button
                className={styles.shareButton}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: entity ? entity.title : "Shared from SongPub",
                      text: entity
                        ? `Check out "${entity.title}" on your favorite music platform`
                        : "Check out this music on your favorite platform",
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard
                      .writeText(window.location.href)
                      .then(() => alert("Link copied to clipboard!"))
                      .catch((err) =>
                        console.error("Failed to copy link:", err)
                      );
                  }
                }}
              >
                Share This Page
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by{" "}
          <a
            href='https://song.link/'
            target='_blank'
            rel='noopener noreferrer'
          >
            Songlink/Odesli
          </a>
        </p>
      </footer>
    </div>
  );
}
