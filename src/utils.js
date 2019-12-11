const path = require('path');
const fse = require('fs-extra');
const { INJECT_FILES, TEMPLATE_GIT_REPO } = require('./constants');

function getRootPath() {
  return path.resolve(__dirname, './..');
}

function getPackageVersion() {
  const version = require(path.join(getRootPath(), 'package.json')).version;
  return version;
}

function logPackageVersion() {
  const msg = `Amazing！x-vue-cli version: ${getPackageVersion()}`;
  console.log();
  console.log(msg);
  console.log();
}
exports.logPackageVersion = logPackageVersion;

function getDirFileName(dir) {
  try {
    const files = fse.readdirSync(dir);
    console.log(files);
    const filesToCopy = [];
    files.forEach((file) => {
      if (file.indexOf(INJECT_FILES) > -1) return;
      filesToCopy.push(file);
    });
    return filesToCopy;
  } catch (e) {
    return [];
  }
}
exports.getDirFileName = getDirFileName;

function getGitTplUrl(domain) {
  return TEMPLATE_GIT_REPO.replace('github', `github.${domain}`);
}
exports.getGitTplUrl = getGitTplUrl;