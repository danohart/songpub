import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a music link");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      router.push({
        pathname: "/results",
        query: { url: encodeURIComponent(url) },
      });
    } catch (err) {
      console.error("Error handling submission:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>SongPub - Share Music Across Platforms</title>
        <meta
          name='description'
          content='Convert music links between Spotify, Apple Music, YouTube Music, and more'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>SongPub</h1>

        <p className={styles.description}>
          Share your favorite music across all streaming platforms
        </p>

        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type='url'
              placeholder='Paste a Spotify, Apple Music, or other music link here'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={styles.input}
              required
            />
            <button
              type='submit'
              className={styles.button}
              disabled={isLoading}
            >
              {isLoading ? "Converting..." : "Convert"}
            </button>
          </form>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.infoSection}>
          <h2>How It Works</h2>
          <p>
            Simply paste a link from your favorite music streaming service, and
            SongPub will generate links to the same song or album on other major
            platforms.
          </p>
          <div className={styles.platformLogos}>
            {/* Here you could add small icons for each supported platform */}
            <span>
              Supports Spotify, Apple Music, YouTube Music, Deezer, and more!
            </span>
          </div>
        </div>
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
