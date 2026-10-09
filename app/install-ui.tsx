'use client';
import { useEffect, useState } from 'react';
export function InstallCommands() {
  const [origin, setOrigin] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const commands = [
    'npm install --ignore-scripts -g ' + origin + '/downloads/skillseal-cli-0.2.0.tgz',
    'skillseal sample --server ' + origin + ' --destination ./skills/research-brief',
  ];
  return (
    <section className="panel">
      <h2>Install the CLI and free example</h2>
      {commands.map((c, i) => (
        <div key={c}>
          <pre className="command-box">{origin ? c : 'Reading site address…'}</pre>
          <button
            disabled={!origin}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(c);
                setMessage('Command ' + (i + 1) + ' copied.');
              } catch {
                setMessage('Select and copy the command shown above.');
              }
            }}
          >
            Copy command {i + 1}
          </button>
        </div>
      ))}
      <p role="status">{message}</p>
      <p>
        Requires Node.js 24+. Open the installed SKILL.md in your agent tool. Choose a new directory
        each time; the installer refuses overwrites and runs no scripts.
      </p>
    </section>
  );
}
