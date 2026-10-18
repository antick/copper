import assert from "node:assert/strict";
import { assertReleaseProtections } from "../apps/desktop/scripts/release-protection-policy.mjs";

const { GITHUB_REPOSITORY: repository, GITHUB_TOKEN: token } = process.env;
assert.ok(
  repository && token,
  "Release environment check needs GitHub context",
);

function environmentValue(name) {
  return process.env[name];
}

const apiBase = environmentValue("GITHUB_API_URL") || "https://api.github.com";
async function api(endpoint) {
  const response = await fetch(`${apiBase}/repos/${repository}/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok)
    throw new Error(
      `Cannot verify release protection (${response.status}): ${endpoint}`,
    );
  return response.json();
}

const [environment, policies, rules] = await Promise.all([
  api("environments/release"),
  api("environments/release/deployment-branch-policies"),
  api("rulesets"),
]);
const activeTagRules = await Promise.all(
  rules
    .filter((rule) => rule.target === "tag" && rule.enforcement === "active")
    .map((rule) => api(`rulesets/${rule.id}`)),
);
assertReleaseProtections(
  environment,
  policies,
  activeTagRules,
  process.env.GITHUB_REF,
);
console.log("Release environment and immutable tag protections verified");
