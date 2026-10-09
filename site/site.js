const origin = new URL('.', window.location.href).href.replace(/\/$/, '');
const tool = `npm install --ignore-scripts -g ${origin}/downloads/skillseal-cli-0.1.1.tgz`;
const sample = `skillseal sample --server ${origin} --destination ./skills/research-brief`;
document.getElementById('tool-command').textContent = tool;
document.getElementById('sample-command').textContent = sample;
document.getElementById('prefix-command').textContent = `npm install --ignore-scripts --prefix ./skillseal-tool ${origin}/downloads/skillseal-cli-0.1.1.tgz\n./skillseal-tool/node_modules/.bin/skillseal sample --server ${origin} --destination ./skills/research-brief`;
for (const button of document.querySelectorAll('[data-copy]')) button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent); document.getElementById('copy-status').textContent = 'Command copied.'; }
  catch { document.getElementById('copy-status').textContent = 'Select and copy the command above.'; }
});
