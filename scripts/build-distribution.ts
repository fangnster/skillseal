import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";
import { pack } from "../src/bundle.ts";
import { sha256 } from "../src/crypto.ts";
import { SAMPLE_SHA256 } from "../src/sample.ts";

const root = process.cwd();
const output = path.join(root, "site-dist");
const pkg = path.join(root, "dist", "cli-package");
await rm(output, { recursive: true, force: true });
await rm(pkg, { recursive: true, force: true });
await mkdir(path.join(output, "downloads"), { recursive: true });
await mkdir(path.join(pkg, "bin"), { recursive: true });
const source = JSON.parse(await readFile("package.json", "utf8"));
const dependencies = Object.fromEntries(
  [
    "@solana/spl-token",
    "@solana/web3.js",
    "bs58",
    "libsodium-wrappers-sumo",
  ].map((name) => [name, source.dependencies[name]]),
);
await writeFile(
  path.join(pkg, "package.json"),
  JSON.stringify(
    {
      name: "@fangnster/skillseal-cli",
      version: "0.2.0",
      type: "module",
      license: "MIT",
      description: "Safe local Skill installation and Solana Devnet delivery",
      engines: { node: ">=24.0.0" },
      bin: { skillseal: "bin/skillseal.mjs" },
      files: ["bin", "cli", "src", "LICENSE", "README.md"],
      dependencies,
    },
    null,
    2,
  ),
);
await writeFile(
  path.join(pkg, "bin/skillseal.mjs"),
  "#!/usr/bin/env node\nif (Number(process.versions.node.split('.')[0]) < 24) { console.error('SkillSeal requires Node.js 24 or newer.'); process.exit(1); }\nawait import('../cli/index.js');\n",
  { mode: 0o755 },
);
// Node deliberately does not strip TypeScript inside installed node_modules.
// Ship reviewed, typechecked source as ordinary ESM JavaScript.
for (const name of [
  "cli/index",
  ...[
    "bundle",
    "crypto",
    "transactions",
    "types",
    "client",
    "sample",
    "portable",
  ].map((name) => `src/${name}`),
]) {
  const input = (await readFile(`${name}.ts`, "utf8")).replace(
    /(from\s+['"][^'"]+|import\(['"][^'"]+)\.ts(['"])/g,
    "$1.js$2",
  );
  const result = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: `${name}.ts`,
  });
  await mkdir(path.dirname(path.join(pkg, `${name}.js`)), { recursive: true });
  await writeFile(path.join(pkg, `${name}.js`), result.outputText);
}
await cp("LICENSE", path.join(pkg, "LICENSE"));
await cp("docs/INSTALL.md", path.join(pkg, "README.md"));
const sample = await pack("examples/research-brief");
if (sha256(sample) !== SAMPLE_SHA256)
  throw new Error(
    "Sample changed: review it and update the pinned hash before publishing",
  );
await writeFile(
  path.join(output, "downloads/research-brief-v1.bundle.json"),
  sample,
);
execFileSync(
  "pnpm",
  ["pack", "--out", path.join(output, "downloads/skillseal-cli-0.2.0.tgz")],
  {
    cwd: pkg,
    stdio: "pipe",
    env: {
      ...process.env,
      pnpm_config_ignore_scripts: "true",
      pnpm_config_verify_deps_before_run: "false",
    },
  },
);
const archive = await readFile(
  path.join(output, "downloads/skillseal-cli-0.2.0.tgz"),
);
// Preserve the already-shared installation URL as a compatibility alias.
await cp(
  path.join(output, "downloads/skillseal-cli-0.2.0.tgz"),
  path.join(output, "downloads/skillseal-cli-0.1.1.tgz"),
);

await writeFile(
  path.join(output, "downloads/release.json"),
  JSON.stringify(
    {
      cliVersion: "0.2.0",
      cliSha256: sha256(archive),
      sampleSha256: SAMPLE_SHA256,
      license: "MIT",
      node: ">=24",
      payment:
        "Hosted Devnet HTTPS CLI purchase, recovery and refund verified; test assets only",
    },
    null,
    2,
  ),
);
await cp("site", output, { recursive: true });
await cp("app/style.css", path.join(output, "style.css"));
await cp("LICENSE", path.join(output, "LICENSE.txt"));
await cp("site-dist/downloads", "public/downloads", { recursive: true });
console.log(`Website and standalone CLI ready: ${output}`);
