import Head from "next/head";
import Link from "next/link";
import styles from "../../styles/Slack.module.css";

export default function SlackSuccess() {
  return (
    <div className={styles.container}>
      <Head>
        <title>SongPub - Slack Integration Successful</title>
        <meta
          name='description'
          content='SongPub has been successfully added to your Slack workspace'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.logo}>SongPub</h1>

        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2>Successfully Connected to Slack!</h2>
          <p>
            SongPub has been successfully installed to your Slack workspace. You
            can now use the <code>/songpub</code> command to convert music
            links.
          </p>

          <div className={styles.usageInstructions}>
            <h3>How to use:</h3>
            <ol>
              <li>
                Type <code>/songpub</code> in any Slack channel
              </li>
              <li>Paste a music link from any streaming service</li>
              <li>Hit Enter to convert and share with your team</li>
            </ol>
          </div>

          <Link href='/' className={styles.button}>
            Return to Homepage
          </Link>
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
