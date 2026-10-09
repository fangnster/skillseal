import { InstallCommands } from '../install-ui';
export default function InstallGuide() {
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ◈ <span>SKILLSEAL</span>
        </a>
        <a href="/">Marketplace →</a>
      </header>
      <section className="hero">
        <p className="eyebrow">STANDALONE INSTALLER · NODE.JS 24+</p>
        <h1>
          Install once.
          <br />
          <em>Keep your workflow local.</em>
        </h1>
        <p className="lede">
          Download the CLI, install the free MIT Research Brief, then load SKILL.md in your agent
          tool.
        </p>
      </section>
      <section className="content-section">
        <InstallCommands />
        <h2>Resume a granted purchase</h2>
        <pre className="command-box">
          skillseal resume --session /path/to/skillseal-session.json --destination
          ./skills/recovered-version
        </pre>
        <p>
          The private session contains your local decryption key. Keep it private. Recovery uses
          your existing order.
        </p>
        <a
          className="text-link"
          href="https://github.com/fangnster/skillseal/blob/main/docs/INSTALL.md"
        >
          Full installation guide →
        </a>
      </section>
    </main>
  );
}
