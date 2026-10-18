import path from "node:path";

export function assertReleaseProtections(environment, policies, rulesets, ref) {
  const reviewerRule = environment.protection_rules?.find(
    (rule) => rule.type === "required_reviewers" && rule.reviewers?.length,
  );
  if (
    !reviewerRule ||
    !environment.deployment_branch_policy?.custom_branch_policies ||
    policies.branch_policies?.length !== 1 ||
    policies.branch_policies[0].type !== "tag" ||
    policies.branch_policies[0].name !== "v*.*.*"
  )
    throw new Error(
      "Release environment must require reviewers and only allow v*.*.* tags",
    );
  if (!/^refs\/tags\/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(ref ?? ""))
    throw new Error("Invalid release tag");
  const matches = (pattern) =>
    pattern === "~ALL" || path.matchesGlob(ref, pattern);
  const protections = new Set(
    rulesets
      .filter(
        (rule) =>
          rule.target === "tag" &&
          rule.enforcement === "active" &&
          rule.conditions?.ref_name?.include?.some(matches) &&
          !rule.conditions.ref_name.exclude?.some(matches),
      )
      .flatMap((rule) => rule.rules?.map((item) => item.type) ?? []),
  );
  if (
    !["creation", "update", "deletion"].every((type) => protections.has(type))
  )
    throw new Error(
      "Release tag needs creation, update, and deletion protection",
    );
}
