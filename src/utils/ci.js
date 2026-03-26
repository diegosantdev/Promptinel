export function isCI() {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TF_BUILD
  );
}

export function getCIProvider() {
  if (process.env.GITHUB_ACTIONS) return 'GitHub Actions';
  if (process.env.GITLAB_CI) return 'GitLab CI';
  if (process.env.CIRCLECI) return 'CircleCI';
  if (process.env.TRAVIS) return 'Travis CI';
  if (process.env.JENKINS_URL) return 'Jenkins';
  if (process.env.BUILDKITE) return 'Buildkite';
  if (process.env.TF_BUILD) return 'Azure Pipelines';
  if (process.env.CI) return 'CI';
  return 'Unknown';
}

export function formatForCI(message) {
  if (!isCI()) return message;
  
  return message
    .replace(/[┌┬┐├┼┤└┴┘│─]/g, '-')
    .replace(/[^\u0020-\u007E]/g, '')
    .trim();
}

export function getExitCode(snapshots, threshold = 0.3) {
  if (!isCI()) return 0;
  
  const hasDrift = snapshots.some(snapshot => 
    snapshot.driftScore !== undefined && snapshot.driftScore > threshold
  );
  
  return hasDrift ? 1 : 0;
}
