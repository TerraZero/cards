const { src, dest, watch } = require('gulp');
const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
const browserSync = require("browser-sync").create();
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const FS = require('fs');
const FSP = require('fs/promises');
const Path = require('path');
const PugCompiler = require('pug');

const SYS = {

  root: __dirname,
  base: Path.join(__dirname, 'src/templates'),

  path(type, ...parts) {
    const last = parts.pop() + '.' + type;
    return Path.join(SYS.base, ...parts, last);
  },

  appendLocals(locals = {}, globals = {}) {
    locals.SYS = SYS;
    locals.GLOBALS = globals;
    for (const name in globals) {
      if (locals[name] === undefined) {
        locals[name] = globals[name];
      }
    }
    return locals;
  },

  embed(path, locals = {}, globals = {}) {
    const file = SYS.path('pug', path);
    let content = FS.readFileSync(file);
    const include = Path.relative(Path.dirname(file), SYS.path('pug', 'mixins'));
    
    content = "include " + include + "\n" + content;
    locals.filename = file;
    locals.comp = {
      name: Path.parse(file).name,
    };
    locals.comp.base = locals.comp.name.split('__').shift();

    const moduleFile = SYS.path('js', path);
    if (FS.existsSync(moduleFile)) {
      delete require.cache[require.resolve(moduleFile)];
      const module = require(moduleFile);

      if (typeof module.preprocess === 'function') {
        module.preprocess(locals, globals, SYS);
      }
      if (typeof module.classes === 'function') {
        const preClasses = module.classes(locals, globals, SYS);
        const classes = [];
        for (const modi in preClasses) {
          if (preClasses[modi] === true) {
            classes.push(locals.comp.base + '--' + modi);
          } else if (typeof preClasses[modi] === 'string') {
            classes.push(locals.comp.base + '--' + modi + '-' + preClasses[modi]);
          }
        }
        locals.classes = classes.join(' ');
      }
    }

    return PugCompiler.render(content, SYS.appendLocals(locals, globals));
  },

};

exports.pug = async function(done) {
  const files = await FSP.readdir('./src/info');
  const index = [];
  const promises = [];

  for (const file of files) {
    delete require.cache[require.resolve('./src/info/' + file)];

    const cards = require('./src/info/' + file);
    const name = Path.parse(file).name;

    index.push(name);

    promises.push(
      src('src/templates/cards.pug')
      .pipe(pug({
        locals: SYS.appendLocals(cards, { namespace: name }),
      }))
      .pipe(rename(name + '.html'))
      .pipe(dest('dest'))
    );
  }

  promises.push(
    src('src/templates/index.pug')
      .pipe(pug({
        locals: SYS.appendLocals({ index }),
      }))
      .pipe(dest('dest'))
  );

  Promise.all(promises).then(done);
}

exports.sass = function(done) {
  src(['src/styles/*.sass', '!src/styles/_*.sass'])
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('styles.css'))
    .pipe(dest('dest'))
    .pipe(browserSync.stream());
  done();
}

exports.serve = function(done) {
  browserSync.init({
    server: './dest',
  });

  watch('src/styles/*.sass', exports.sass);
  watch('src/templates/**/*.(pug|js)', exports.pug).on('change', browserSync.reload);
  watch('src/info/*.json', exports.pug).on('change', browserSync.reload);
}