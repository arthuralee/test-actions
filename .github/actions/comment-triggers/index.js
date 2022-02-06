const core = require('@actions/core');
const github = require('@actions/github');

const githubToken = core.getInput('githubToken');
const octokit = github.getOctokit(githubToken);

const { context } = github;

async function run() {
	console.warn(context);
  const commentBody = context.payload.comment.body;
  const prNumber = context.payload.issue.number;

  await octokit.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: `You said: ${commentBody}`,
  })
}

run().catch(error => {
	core.setFailed(error.message);
});
