export default function Creators() {
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ◈ <span>SKILLSEAL</span>
        </a>
        <a href="/">Marketplace →</a>
      </header>
      <section className="hero">
        <p className="eyebrow">CREATORS · VERSIONED RELEASES</p>
        <h1>
          Package your expertise.
          <br />
          <em>Agree on the split.</em>
        </h1>
        <p className="lede">
          A useful Skill includes instructions, references, examples and a clear review checklist.
        </p>
      </section>
      <section className="content-section">
        <h2>Publish with explicit terms</h2>
        <p>
          Create a manifest with a version, test-USDC price, license and collaborator shares
          totaling 10,000 basis points. Every collaborator approves before activation. New terms
          require a new version.
        </p>
        <pre className="command-box">
          skillseal publish --server https://YOUR_MARKETPLACE --skill ./my-skill --manifest
          manifest.json --wallet author.json
        </pre>
        <p>
          Publication requires a configured marketplace and funded Devnet test wallets. Public
          Devnet acceptance is pending. Review the Research Brief example before creating your own
          package.
        </p>
        <a
          className="text-link"
          href="https://github.com/fangnster/skillseal/tree/main/examples/research-brief"
        >
          Example package →
        </a>{' '}
        ·{' '}
        <a
          className="text-link"
          href="https://github.com/fangnster/skillseal/blob/main/docs/README.zh-CN.md"
        >
          Publishing runbook →
        </a>
      </section>
    </main>
  );
}
