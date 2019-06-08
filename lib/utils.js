const path = require('path')
const fs = require('fs-extra')
const { gzipSync } = require('zlib')
const logger = require('./logger')
const globby = require('globby').sync

/**
 * Type of paths passed as arguments
 * @type {object}
 */
let pathtype = {
  SOURCES: 'sources',
  TEMPLATES: 'templates'
}

module.exports.pathtype = pathtype

/**
 * Filter all existing files
 * @param  {object} files files to be added
 * @param  {string} pathtype  pathtype of files for logging
 * @return {object}       filtered list
 */
function getExisting(files, pathtype) {
  if (files && files.length) {
    return files.map(file => path.resolve(file)).filter(fs.existsSync)
  } else {
    logger.warn(`Using current directory for ${pathtype}`)
    return [process.cwd()]
  }
}

module.exports.getExisting = getExisting

/**
 * Check if a file is inside one of the folders of a list
 * @param  {string} file file to check existence
 * @param  {object} list list of paths to look inside
 * @return {string}      path containing file
 */
module.exports.isInside = (file, list) => {
  const _file = path.resolve(file)
  let parent = false
  list.forEach(item => {
    if (_file.includes(item)) {
      parent = parent && item.includes(parent) ? parent : item
    }
  })
  return parent
}

/**
 * Convert gzip file size to human readable format
 * @param  {string} file file to calculate size for
 * @return {string}      human readable size
 */
module.exports.humanSize = file => {
  const size = gzipSync(fs.readFileSync(file, 'utf8')).length
  if (size >> 20) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }
  if (size >> 10) {
    return `${(size / 1024).toFixed(2)} KB`
  }
  return `${size} B`
}

/**
 * convert time difference of `process.hrtime` to human readable time
 * @param  {object} td time difference of `process.hrtime`
 * @return {string}    human readable time
 */
module.exports.humanTime = td => {
  if (td[0]) {
    return `${(td[0] + td[1] / 1e9).toFixed(2)}s`
  }
  return `${(td[1] / 1e6).toFixed(2)}ms`
}


function getFiles(dirExpression) {
  return globby(dirExpression, { absolute: true })
}

module.exports.getFiles = getFiles;

function getDirs(dirExpression, infoMsg) {
    // list of files to process
  const files = getExisting(
    getFiles(dirExpression),
    infoMsg
  )

  // get template paths
  const dirs = files.map(f => (fs.lstatSync(f).isDirectory())
                                  ? f
                                  : path.dirname(f))

  return dirs
}

module.exports.getDirs = getDirs;

function getRootDirs(dirExpression) {
  return getDirs(
    dirExpression,
    pathtype.SOURCES
  )
}

module.exports.getRootDirs = getRootDirs;

function getTemplatesDirs(dirExpression) {
  return getDirs(
    dirExpression,
    pathtype.TEMPLATES
  )
}

module.exports.getTemplatesDirs = getTemplatesDirs;
