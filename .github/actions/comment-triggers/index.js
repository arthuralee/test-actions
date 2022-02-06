const core = require('@actions/core');
const github = require('@actions/github');

const { context } = github;

async function run() {
	console.warn(context);
}

run().catch(error => {
	core.setFailed(error.message);
});
