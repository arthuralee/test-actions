const core = require('@actions/core');
const github = require('@actions/github');

const githubToken = core.getInput('githubToken');
const octokit = github.getOctokit(githubToken);

const { context } = github;

const commentBody = context.payload.comment.body;
const prNumber = context.payload.issue.number;

async function comment(body) {
  await octokit.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body
  });
}

const HELP_STRING = `Here are the commands you can use:

- \`/cherrypick [version]\` Request a cherry-pick into the release branch of version [version]. E.g. `/cherrypick 5.101`
- \`/help\` Show this help screen`

async function runHelp(command) {
  if (command) {
    await comment(`Sorry, I did not recognize the *${command}* command.\n${HELP_STRING}`);
  } else {
    await comment(HELP_STRING);
  }
}

async function runCherrypick(args) {
  await octokit.actions.createWorkflowDispatch({
    ...context.repo,
    workflow_id: 'autopick.yml',
    inputs: {
      targetVersion: args[0],
      prNumber,
    }
  })
}

async function dispatchCommand(command, args) {
  switch (command) {
    case 'cherrypick':
    case 'pick':
      await runCherrypick(args);
      break;
    case 'help':
      await runHelp();
    default:
      await runHelp(command);
  }
}

async function run() {
  const argv = commentBody.substring(1).split(' ');
  const command = argv[0];
  const args = argv.slice(1);

  await dispatchCommand(command, args);
}

run().catch(error => {
	core.setFailed(error.message);
});
