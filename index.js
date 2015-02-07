var path = require('path');
var fs = require('fs');

var through = require('through');
var gulp = require('gulp');
var gutil = require('gulp-util');
var gulpless = require('gulp-less');
var msg = require('msg');
var marked = require('marked');
var stats = require('stylestats');
var specificity = require('css-specificity-map');
var PluginError = gutil.PluginError;
var File = gutil.File;


/*
    This script is based and recycles a lot of code of the bin script of kss-node
    https://github.com/hughsk/kss-node/blob/master/bin/kss-node
 */
module.exports = stringify;

function getSerialize (fn, decycle) {
  var seen = [], keys = [];
  decycle = decycle || function(key, value) {
    return '[Circular ' + getPath(value, seen, keys) + ']';
  };
  return function(key, value) {
    var ret = value;
    if (typeof value === 'object' && value) {
      if (seen.indexOf(value) !== -1)
        ret = decycle(key, value);
      else {
        seen.push(value);
        keys.push(key);
      }
    }
    if (fn) ret = fn(key, ret);
    return ret;
  };
}

function getPath (value, seen, keys) {
  var index = seen.indexOf(value);
  var path = [ keys[index] ];
  for (index--; index >= 0; index--) {
    if (seen[index][ path[0] ] === value) {
      value = seen[index];
      path.unshift(keys[index]);
    }
  }
  return '~' + path.join('.');
}

function stringify(obj, fn, spaces, decycle) {
  return JSON.stringify(obj, getSerialize(fn, decycle), spaces);
}

stringify.getSerialize = getSerialize;

module.exports = function(opt) {
    'use strict';
    if (!opt) opt = {};
    if (!opt.templateDirectory) opt.templateDirectory = __dirname + '/node_modules/msg/lib/template';
    if (!opt.msgOpts) opt.msgOpts = {};

    var buffer = [];
    var firstFile = null;

    /* Is called for each file and writes all files to buffer */
    function bufferContents(file){
        if (file.isNull()) return; // ignore
        if (file.isStream()) return this.emit('error', new PluginError('gulp-msg',  'Streaming not supported'));

        if (!firstFile) firstFile = file;

        buffer.push(file.contents.toString('utf8'));
    }

    /* Is called when all files were added to buffer */
    function endStream(){

        var self = this;

        msg.parse(buffer, opt.msgOpts, function (err, styleguide) {
            if (err) console.log('Error', error);

                var sections = styleguide.section('*.'),
                    k, j, i, sectionCount = sections.length,
                    sectionRoots = [], currentRoot,
                    rootCount, childSections = [];


            // Accumulate all of the sections' first indexes
            // in case they don't have a root element.
            for (i = 0; i < sectionCount; i += 1) {
                currentRoot = sections[i].reference().match(/[0-9]*\.?/)[0].replace('.', '');

                if (!~sectionRoots.indexOf(currentRoot)) {
                    sectionRoots.push(currentRoot);
                }
            }


            sectionRoots.sort();
            rootCount = sectionRoots.length;


            // Output msg results as a json file
            gulp.src(opt.templateDirectory)
                .pipe(through(function (file) {

                    var content = stringify(sections, null, 2);

                    var joinedPath = path.join(firstFile.base, '/public/view/section.json');

                    var file = new File({
                        cwd: firstFile.cwd,
                        base: firstFile.base,
                        path: joinedPath,
                        contents: new Buffer(content)
                    });

                self.emit('data', file);
            }));

            // Output stylestats results as a json file
            gulp.src(opt.templateDirectory)
                .pipe(through(function (file) {

                    var statistics = new stats(path.join(firstFile.base, '../styleguide/public/styles.css'));

                    statistics.parse(function (error, result) {
                        var content = stringify(result, null, 2);

                        var joinedPath = path.join(firstFile.base, '/public/view/stats.json');

                        var file = new File({
                            cwd: firstFile.cwd,
                            base: firstFile.base,
                            path: joinedPath,
                            contents: new Buffer(content)
                        });

                    self.emit('data', file);

                    });
            }));

            // Output css-specificity-map results as a json file
            gulp.src(opt.templateDirectory)
                .pipe(through(function (file) {

                    function readModuleFile(path, callback) {
                        try {
                            var filename = require.resolve(path);
                            fs.readFile(filename, 'utf8', callback);
                        } catch (e) {
                            callback(e);
                        }
                    }

                    readModuleFile(path.join(firstFile.base, '../styleguide/public/styles.css'), function (err, css) {
                        var joinedPath = path.join(firstFile.base, '/public/view/specificity.json');
                        var spec = specificity.parse(css,true,false);
                        var content = stringify(spec, null, 2);

                        var file = new File({
                            cwd: firstFile.cwd,
                            base: firstFile.base,
                            path: joinedPath,
                            contents: new Buffer(content)
                        });

                        self.emit('data', file);
                    });



            }));


            // Copy template assets, sass compilation added because default template uses it
            gulp.src(path.join(opt.templateDirectory, '/**/*.css'))
                .pipe(through(function (file) {

                self.emit('data', file);
            }));

            gulp.src(path.join(opt.templateDirectory, '/*.html'))
                .pipe(through(function (file) {

                self.emit('data', file);
            }));

            gulp.src(path.join(opt.templateDirectory, '/**/*.html'))
                .pipe(through(function (file) {

                self.emit('data', file);
            }));

            gulp.src(path.join(opt.templateDirectory, '/**/*.js'))
                .pipe(through(function (file) {

                self.emit('data', file);
            }));

        });

    }

    function jsonSections(sections) {
        return sections.map(function(section) {
            return {
                header: section.header(),
                description: section.description(),
                reference: section.reference(),
                group: section.group(),
                depth: section.data.refDepth,
                deprecated: section.deprecated(),
                experimental: section.experimental(),
                modifiers: jsonModifiers(section.modifiers())
            };
        });
    }

    // Convert an array of `MsgModifier` instances to a JSON object.
    function jsonModifiers (modifiers) {
        return modifiers.map(function(modifier) {
            return {
                name: modifier.name(),
                description: modifier.description(),
                className: modifier.className(),
                markup: modifier.markup()
            };
        });
    }

    return through(bufferContents, endStream);
};