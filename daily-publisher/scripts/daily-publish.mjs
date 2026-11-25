// GENERATED from Workshop source by build-publisher-kit.mjs. Do not edit.
import {readOfficialDailyPackageDirectory} from './daily-package.mjs';
const manifestFile='manifest.json';const filenames=['easy.json','medium.json','hard.json','expert.json','manifest.json'];
async function loadPackage(directory) {
  const { ok, errors, files } = await readOfficialDailyPackageDirectory(directory);
  if (!ok) throw new Error(errors.join("\n"));
  return { files, date: JSON.parse(files.get(manifestFile).toString("utf8")).date };
}

export class PublicationConflict extends Error {
  constructor(message) { super(message); this.code = "INVESTIGATION_REQUIRED"; this.recoverable = false; }
}

export async function resumeDailyPublication(packageDirectory, websiteDirectory, options = {}) {
  const source = await loadPackage(packageDirectory);
  const adapter = options.transport || createPublicationTransport(websiteDirectory);
  const checkpoint = options.checkpoint || (async () => {});
  await checkpoint("PUBLISHING", { phase: "Reconcile repository and approved bytes" });
  const found = await adapter.inspect(source);
  const commit = found?.commit || await adapter.prepare(source);
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new PublicationConflict("Invalid publication commit identity.");
  if (!found?.remote) {
    await checkpoint("PUBLISHING", { commit, phase: "Push exact five-file commit" });
    await adapter.push(commit);
  }
  // A crash before this write is recovered by inspect(), independently of UI state.
  await checkpoint("COMMIT_PUSHED", { commit });
  await checkpoint("DEPLOYMENT_PENDING", { commit, phase: "Wait for GitHub Pages" });
  const deployment = await adapter.deployment(commit, { retry: Boolean(options.retryDeployment) });
  await checkpoint("VERIFICATION_PENDING", { commit, deployment, phase: "Verify all five public HTTPS files" });
  const url = String(await adapter.verify(source));
  return { commit, deployment, url, verifiedFiles: filenames.slice(), verifiedAt: new Date().toISOString() };
}
