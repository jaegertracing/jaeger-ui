#!/usr/bin/env node

const spawnSync = require('child_process').spawnSync;

const version = require('../package.json').version;

function cleanRemoteUrl(url) {
  return url.replace(/^(.*?@|.*?\/\/)|\.git\s*$/gi, '').replace(/:/g, '/');
}

function cleanBranchNames(pointsAt) {
  const branch = pointsAt.replace(/"/g, '').split('\n')[0];
  const i = branch.indexOf(' ');
  const objName = branch.slice(0, i);
  let refName = branch.slice(i + 1);
  if (refName.indexOf('detached') > -1) {
    refName = '(detached)';
  }
  return { objName, refName };
}

function getChanged(shortstat, status) {
  const rv = { hasChanged: false, files: 0, insertions: 0, deletions: 0, untracked: 0 };
  const joiner = [];
  const regex = /(\d+) (.)/g;
  let match = regex.exec(shortstat);
  while (match) {
    const [, n, type] = match;
    switch (type) {
      case 'f':
        rv.files = Number(n);
        joiner.push(`${n}f`);
        break;
      case 'i':
        rv.insertions = Number(n);
        joiner.push(`+${n}`);
        break;
      case 'd':
        rv.deletions = Number(n);
        joiner.push(`-${n}`);
        break;
      default:
        throw new Error(`Invalid diff type: ${type}`);
    }
    match = regex.exec(shortstat);
  }
  const untracked = status && status.split('\n').filter(line => line[0] === '?').length;
  if (untracked) {
    rv.untracked = untracked;
    joiner.push(`${untracked}?`);
  }
  rv.pretty = joiner.join(' ');
  rv.hasChanged = Boolean(joiner.length);
  return rv;
}

function getVersion(cwd) {
  const opts = { cwd, encoding: 'utf8' };
  const url = spawnSync('git', ['remote', 'get-url', '--push', 'origin'], opts).stdout;
  const branch = spawnSync(
    'git',
    ['branch', '--points-at', 'HEAD', '--format="%(objectname:short) %(refname:short)"'],
    opts
  ).stdout;
  const shortstat = spawnSync('git', ['diff-index', '--shortstat', 'HEAD'], opts).stdout;
  const status = spawnSync('git', ['status', '--porcelain', '-uall'], opts).stdout;

  const { objName, refName } = cleanBranchNames(branch);
  const remote = cleanRemoteUrl(url);
  const joiner = [version, remote, objName];
  const changed = getChanged(shortstat, status);
  if (changed.hasChanged) {
    joiner.push(changed.pretty);
  }
  joiner.push(refName);
  const rv = {
    version,
    remote,
    objName,
    changed,
    refName,
    pretty: joiner.join(' | '),
  };
  return rv;
}

if (require.main === module) {
  const vsn = getVersion(process.argv[2] || '.');
  process.stdout.write(JSON.stringify(vsn));
} else {
  module.exports = getVersion;
}
