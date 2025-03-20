import Head from "next/head";
import Link from "next/link";
import styles from "../../styles/Slack.module.css";

export default function SlackError() {
  return (
    <div className={styles.container}>
      <Head>
        <title>SongPub - Slack Integration Error</title>
        <meta
          name='description'
          content='There was an error connecting SongPub to your Slack workspace'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.logo}>SongPub</h1>

        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>!</div>
          <h2>Integration Error</h2>
          <p>
            There was a problem connecting SongPub to your Slack workspace. This
            could be due to permissions, network issues, or a temporary problem
            with our service.
          </p>

          <div className={styles.troubleshooting}>
            <h3>Troubleshooting:</h3>
            <ul>
              <li>Make sure you're an admin of the Slack workspace</li>
              <li>Check that you've granted all the required permissions</li>
              <li>Try installing the app again</li>
            </ul>
          </div>

          <div className={styles.actions}>
            <a
              href={`https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=commands,chat:write&user_scope=`}
              className={styles.button}
            >
              Try Again
            </a>

            <Link href='/' className={styles.secondaryButton}>
              Return to Homepage
            </Link>
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
