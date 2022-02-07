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

- \`/cherrypick [version]\` Request a cherry-pick into the release branch of version [version]. E.g. \`/cherrypick 5.101\`
- \`/help\` Show this help screen`

async function runHelp(command) {
  if (command) {
    await comment(`Sorry, I did not recognize the *${command}* command.\n${HELP_STRING}`);
  } else {
    await comment(HELP_STRING);
  }
}

async function runCherrypick(args) {
	const pr = await octokit.pulls.get({
		...context.repo,
		pull_number: prNumber,
	});

  if (pr.data.state !== 'closed' || !pr.data.merged) {
    await comment('Error: Only PRs that have been merged can be cherry-picked.');
    return;
  }

  if (pr.data.base.ref !== pr.data.head.repo.default_branch) {
    await comment(`Error: Only PRs merged to ${pr.data.head.repo.default_branch} can be cherry-picked.`);
    return;
  }

  const version = args[0];

  if (!version) {
    await comment('Error: Please specify version to cherry pick to, e.g. `/cherrypick 5.101`');
    return;
  }

  await octokit.actions.createWorkflowDispatch({
    ...context.repo,
    workflow_id: 'autopick.yml',
    ref: 'main',
    inputs: {
      targetVersion: version,
      prNumber: prNumber.toString(),
    }
  });

  await comment(`Sit tight! We've kicked off a cherry-pick for ${version}.`);
}

async function dispatchCommand(command, args) {
  switch (command) {
    case 'cherrypick':
    case 'pick':
      await runCherrypick(args);
      break;
    case 'help':
      await runHelp();
      break;
    default:
      await runHelp(command);
      break;
  }
}

async function run() {
  const argv = commentBody.split('\n')[0].substring(1).split(' ');
  const command = argv[0];
  const args = argv.slice(1);

  await dispatchCommand(command, args);
}

run().catch(error => {
  const url = process.env.RUN_URL;
  comment(`Oh no! Something went wrong and I couldn't process your command.

\`\`\`
${error}
\`\`\`
${url}`);
});
