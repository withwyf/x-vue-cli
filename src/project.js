const inquirer = require('inquirer');
const fse = require('fs-extra');
const download = require('download-git-repo');
const { INJECT_FILES } = require('./constants');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const memFs = require('mem-fs');
const editor = require('mem-fs-editor');
const { getDirFileName } = require('./utils');
const { getGitTplUrl } = require('./utils');
const { exec } = require('child_process');

function Project(options) {
  this.config = Object.assign({
    projectName: '',
    description: '',
    domain: '',
  }, options);
  const store = memFs.create();
  this.memFsEditor = editor.create(store);
}

Project.prototype.create = function() {
  this.inquire()
    .then((answer) => {
      this.config = Object.assign(this.config, answer);
      this.generate();
    });
};

Project.prototype.inquire = function() {
  const prompts = [];
  const { projectName, description, domain } = this.config;
  if (typeof projectName !== 'string') {
    prompts.push({
      type: 'input',
      name: 'projectName',
      message: '请输入项目名：',
      validate(input) {
        if (!input) {
          return 'Please input Project Name';
        }
        if (fse.existsSync(input)) {
          return '当前目录已存在同名项目，请更换项目名';
        }
        return true;
      }
    });    
  } else if (fse.existsSync(projectName)) {
    prompts.push({
      type: 'input',
      name: 'projectName',
      message: '当前目录已存在同名项目，请更换项目名',
      validate(input) {
        if (!input) {
          return 'Project Name can not be empty';
        }
        if (fse.existsSync(input)) {
          return '当前目录已存在同名项目，请更换项目名';
        }
        return true;
      }
    });
  }

  if (typeof description !== 'string') {
    prompts.push({
      type: 'input',
      name: 'description',
      message: 'Please input desc'
    });
  }

  if (typeof domain !== 'string') {
      prompts.push({
        type: 'input',
        name: 'domain',
        message: 'Please input domain'
      });
  }

  return inquirer.prompt(prompts);
};

/**
 * 模板替换
 * @param {string} source 源文件路径
 * @param {string} dest 目标文件路径
 * @param {object} data 替换文本字段
 */
Project.prototype.injectTemplate = function(source, dest, data) {
  this.memFsEditor.copyTpl(
    source,
    dest,
    data
  );
}

Project.prototype.generate = function() {
  const { projectName, description, domain } = this.config;
  const projectPath = path.join(process.cwd(), projectName);
  const downloadPath = path.join(projectPath, '__download__');
  // projectPath = projectName/
  // downloadPath = projectName/__download__
  const GIT_TEMPLATE_REPO = getGitTplUrl(domain);
  console.log(chalk.green(`Download From URL: ${GIT_TEMPLATE_REPO}`));
  const downloadSpinner = ora('正在下载模板，请稍等...');
  downloadSpinner.start();
  // 下载git repo
  download(GIT_TEMPLATE_REPO, downloadPath, { clone: true }, (err) => {
    if (err) {
      downloadSpinner.color = 'red';
      downloadSpinner.fail(err.message);
      return;
    }

    downloadSpinner.color = 'green';
    downloadSpinner.succeed('下载成功');

    // 复制文件
    const copyFiles = getDirFileName(downloadPath);

    copyFiles.forEach((file) => {
      // copySync EQULS cp -r
      fse.copySync(path.join(downloadPath, file), path.join(projectPath, file));
      console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${projectName}/${file}`)}`);
    });

    INJECT_FILES.forEach((file) => {
      this.injectTemplate(path.join(downloadPath, file), path.join(projectName, file), {
        projectName,
        description
      });
    });

    this.memFsEditor.commit(() => {
      INJECT_FILES.forEach((file) => {
        console.log(`${chalk.green('✔ ')}${chalk.grey(`创建: ${projectName}/${file}`)}`);
      })

      fse.remove(downloadPath);
      // 转到projectPath去
      process.chdir(projectPath);

      // git 初始化
      console.log();
      const gitInitSpinner = ora(`cd ${chalk.green.bold(projectName)}目录, 执行 ${chalk.green.bold('git init')}`);
      gitInitSpinner.start();
      // 执行git init
      const gitInit = exec('git init');
      gitInit.on('close', (code) => {
        if (code === 0) {
          gitInitSpinner.color = 'green';
          gitInitSpinner.succeed(gitInit.stdout.read());
        } else {
          gitInitSpinner.color = 'red';
          gitInitSpinner.fail(gitInit.stderr.read());
        }

        // 安装依赖
        console.log();
        const installSpinner = ora(`安装项目依赖 ${chalk.green.bold('npm install')}, 请稍后...`);
        installSpinner.start();
        exec('npm install', (error, stdout, stderr) => {
          if (error) {
            installSpinner.color = 'red';
            installSpinner.fail(chalk.red('安装项目依赖失败，请自行重新安装！'));
            console.log(error);
          } else {
            installSpinner.color = 'green';
            installSpinner.succeed('安装依赖成功');
            console.log(`${stderr}${stdout}`);

            console.log();
            console.log(chalk.green('Create Project Success ！'));
            console.log(chalk.green('Enjoy your Coding ! Wow !'));
          }
        })
      })
    });
  });
}

module.exports = Project;