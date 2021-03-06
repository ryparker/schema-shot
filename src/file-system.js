'use strict'

const fs = require('fs')
const path = require('path')
const debug = require('debug')('snap-shot')
const la = require('lazy-ass')
const is = require('check-more-types')
const mkdirp = require('mkdirp')
const vm = require('vm')
const {stringify} = require('./utils')

const cwd = process.cwd()
const fromCurrentFolder = path.relative.bind(null, cwd)
const snapshotsFolder = fromCurrentFolder('__snapshots__')

function loadSnaps (snapshotPath) {
  const full = require.resolve(snapshotPath)
  if (!fs.existsSync(snapshotPath)) {
    return {}
  }

  const sandbox = {
    exports: {}
  }
  const source = fs.readFileSync(full, 'utf8')
  try {
    vm.runInNewContext(source, sandbox)
    return sandbox.exports
  } catch (e) {
    console.error('Could not load file', full)
    console.error(source)
    console.error(e)
    return {}
  }
}

function fileForSpec (specFile) {
  const specName = path.basename(specFile)
  const filename = path.join(snapshotsFolder, specName + '.schema-shot')
  return path.resolve(filename)
}

function loadSnapshots (specFile) {
  la(is.unemptyString(specFile), 'missing specFile name', specFile)
  const filename = fileForSpec(specFile)
  debug('loading snapshots from %s', filename)
  let snapshots = {}
  if (fs.existsSync(filename)) {
    snapshots = loadSnaps(filename)
  } else {
    debug('could not find snapshots file %s', filename)
  }
  return snapshots
}

function saveSnapshots (specFile, snapshots) {
  mkdirp.sync(snapshotsFolder)
  const filename = fileForSpec(specFile)
  const specRelativeName = fromCurrentFolder(specFile)
  debug('saving snapshots into %s for %s', filename, specRelativeName)

  let s = ''
  Object.keys(snapshots).forEach(testName => {
    const value = snapshots[testName]
    const serialized = stringify(value)
    s += `exports['${testName}'] = ${serialized}\n\n`
  })
  fs.writeFileSync(filename, s, 'utf8')
  return snapshots
}

module.exports = {
  readFileSync: fs.readFileSync,
  fromCurrentFolder,
  loadSnapshots,
  saveSnapshots
}
