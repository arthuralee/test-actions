const core = require('@actions/core');
const github = require('@actions/github');

const githubToken = core.getInput('githubToken');
const octokit = github.getOctokit(githubToken);

const { context } = github;

const commentBody = context.payload.comment.body;
const prNumber = context.payload.issue.number;

async function run() {

  const argv = commentBody.substring(1).split(' ');
  const command = argv[0];
  const args = argv.slice(1);

  await octokit.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: `Command: ${command}\nArguments: ${args}`,
  })
}

run().catch(error => {
	core.setFailed(error.message);
});
