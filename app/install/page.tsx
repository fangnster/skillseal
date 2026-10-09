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
        <h2>Install the standalone CLI</h2>
        <p>Use your marketplace HTTPS origin in place of YOUR_SITE.</p>
        <pre className="command-box">
          npm install --ignore-scripts -g https://YOUR_SITE/downloads/skillseal-cli-0.1.1.tgz
        </pre>
        <h2>Try the free MIT sample</h2>
        <pre className="command-box">
          skillseal sample --server https://YOUR_SITE --destination ./skills/research-brief
        </pre>
        <p>
          Open SKILL.md, supply source notes, and review the result with
          references/review-checklist.md. Choose a new directory for each installation. No scripts
          are executed.
        </p>
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
