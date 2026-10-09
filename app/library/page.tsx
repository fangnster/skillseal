import { Recovery } from '../recovery';
export default function Page() {
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ◈ SKILLSEAL
        </a>
        <a href="/creators">Publish →</a>
      </header>
      <section className="hero compact">
        <p className="eyebrow">PURCHASE RECOVERY</p>
        <h1>
          Your version.
          <br />
          <em>Your local files.</em>
        </h1>
        <p className="lede">
          Recover a purchased version from its private session, or reinstall with the same buyer
          wallet through the CLI.
        </p>
      </section>
      <Recovery />
      <p className="fine">
        Lost the session? Run skillseal install with the same buyer wallet into a new directory. An
        existing version license recovers access without a second payment.
      </p>
    </main>
  );
}
