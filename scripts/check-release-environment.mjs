const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token } = process.env;
if (!repo || !token)
  throw new Error("Release environment verification needs GitHub context");
async function api(endpoint) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!response.ok)
    throw new Error(
      `Cannot verify release protection (${response.status}): ${endpoint}`,
    );
  return response.json();
}
const environment = await api("environments/release");
const policies = await api("environments/release/deployment-branch-policies");
const rules = await api("rulesets");
const active = await Promise.all(
  rules
    .filter((rule) => rule.target === "tag" && rule.enforcement === "active")
    .map((rule) => api(`rulesets/${rule.id}`)),
);
assertReleaseProtections(environment, policies, active, process.env.GITHUB_REF);
console.log("Release environment and tag safeguards verified");

import { assertReleaseProtections } from "./release-policy.mjs";
