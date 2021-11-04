#!/usr/bin/env node
// console.log(process.argv)//gulp-cli拿到的参数
process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..'))//require是载入这个模块，resolve是找到这个模块所对应的路径
require('gulp/bin/gulp')
// console.log(process.argv)