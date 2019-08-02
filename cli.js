#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const cli = require('commander')
const chokidar = require('chokidar')
const chalk = require('chalk')
const logger = require('./lib/logger')
const getData = require('./lib/get-data')
const globby = require('globby').sync
const { isInside, getExisting, pathtype, getFiles, getRootDirs, getTemplatesDirs } = require('./lib/utils')
const api = require('./')

cli
  .version(
    chalk`
    {yellow njk}: ${require('./package.json').version}
    {yellow nunjucks}: ${require('nunjucks/package.json').version}
  `
  )
  .arguments('<files|dirs|globs>')
  .usage(chalk`{green <files|dirs|globs>} [options]`)
  .option('-v, --verbose', 'print additional log')
  .option('-k, --keepTree', 'keep the source folder structure in the output directory')
  .option('-s, --src <dirs>', 'the src files location\n')
  .option('-b, --block', 'wrap a content block in files')
  .option('-c, --clean', 'use clean urls for output files')
  .option('-w, --watch', 'watch for file changes\n')
  .option('-d, --data <file|dir>', 'JSON data or JSON/yaml directory')
  .option(
    '-t, --template <dirs>',
    'Template directories (same as searchPaths)\n',
    t => t.split(',')
  )
  .option('-o, --out <dir>', 'Output directory', 'dist')
  .on('--help', () => {
    console.log(chalk`
    Having troubles ? Just file an issue:
    {cyan https://github.com/mohitsinghs/njk/issues/new}
    Or look at some examples:
    {cyan https://github.com/mohitsinghs/njk/wiki}
    `)
  })
  .parse(process.argv)


const srcPaths = [path.resolve(cli.src)]
const files = getFiles(cli.args)
const rootPaths = getRootDirs(cli.args)
const templates = getTemplatesDirs(cli.template)

const opts = {
  verbose: cli.verbose,
  block: cli.block,
  clean: cli.clean,
  data: getData(cli.data),
  src: srcPaths,
  keepTree: cli.keepTree,
  rootPaths,
  templates,
  out: cli.out,
  watch: cli.watch,
  minify: !cli.watch,
  minifyOpts: {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    keepClosingSlash: true,
    sortAttributes: true,
    sortClassName: true
  }
}

api(files, opts)

// list of files and directories to watch
const watchList = []

if (cli.watch) {
  watchList.push(...templates, ...rootPaths, ...srcPaths)
  
  // set up watcher and watch for file chanegs
  logger.log('Running in watch mode')
  const watcher = chokidar.watch(watchList, {
    ignored: /(^|[/\\])\../,
    ignoreInitial: true
  })

  watcher.on('add', file => {
    opts['rootPaths'] = getRootDirs(cli.args);
    opts['templates'] = getTemplatesDirs(cli.template);
    opts['data'] = getData(cli.data);

    if (isInside(file, templates)) {
      // if a template is changed render everything again
      logger.log(chalk`Add template {yellow ${path.relative(process.cwd(), file)}}`)
      api(
        getFiles(cli.args),
        opts
      )
    } else if (/\.njk|\.html|\.md|\.mdown|\.markdown/.test(path.extname(file))) {
      logger.log(chalk`Add {yellow ${path.relative(process.cwd(), file)}}`)
      api(
        file,
        opts
      )
    }
  })

  watcher.on('change', file => {
      api(files, opts);
  })
}
