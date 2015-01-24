# gulp-msg

Gulp plugin for [MSG (Magnificent styleguide)](https://github.com/mpeutz/msg) an enhanced version of KSS ([Knyle Style Sheets](http://warpspire.com/kss/)) documentation generation.

This plugin is based on [kss-node](https://github.com/hughsk/kss-node) and generates a styleguide based on code documentation. The plugin is mainly a fork of `kss-nodes`'s bin script.

This plugin currently lacks tests.

## Install

```
npm install gulp-msg
```

## Usage

Documentation to come

## Options

* `overview`: Absolute path to markdown file which is used for styleguide home page
* `templateDirectory`: Absolute path to template directory, by default `kss-node` default template is used.
* `msg`: Options supported by [`msg-node`](https://github.com/mpeutz/msg)
