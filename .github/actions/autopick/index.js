const core = require("@actions/core");
const github = require("@actions/github");
const { execSync } = require("child_process");

const { GITHUB_REF } = process.env;
const githubToken = core.getInput("githubToken");
const prNumber = core.getInput("prNumber"); // convert to number
const targetVersion = core.getInput("targetVersion");
const octokit = github.getOctokit(githubToken);
const { context } = github;

async function run() {
  // Validation checks
  if (GITHUB_REF !== "refs/heads/main") {
    throw new Error(
      `Action must be invoked on the "main" branch (GITHUB_REF = ${GITHUB_REF}). Make sure to select "Branch: main" under "Use workflow from".`
    );
  }

  const pr = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: prNumber,
  });

  if (!pr.data.merged) {
    throw new Error("PR to cherry pick must already be merged");
  }

  if (pr.data.base.ref !== "main") {
    throw new Error("PR to cherry pick must be merged to main");
  }

  // Cherry-pick onto release branch
  const branchName = `cherry-pick/pr_${prNumber}`;
  const targetBranchName = `release-${targetVersion}`;
  execSync(`git checkout ${targetBranchName}`);
  execSync(`git checkout -b ${branchName}`);
  execSync(`git cherry-pick ${pr.merge_commit_sha}`);
  execSync(`git push --set-upstream origin ${branchName}`);

  // Create PR
  const newPr = await octokit.rest.pulls.create({
    ...context.repo,
    head: branchName,
    base: targetBranchName,
    title: `[🍒⛏ ${targetVersion}] ${pr.data.title}`,
    body: `Automatic cherry-pick PR based on #${prNumber}`,
  });

  await octokit.rest.pulls.requestReviewers({
    ...context.repo,
    pull_number: newPr.data.number,
    reviewers: [context.actor],
  });
}

run().catch((error) => {
  core.setFailed(error.message);
});
