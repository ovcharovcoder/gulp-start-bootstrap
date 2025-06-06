const gulp = require('gulp');
const { src, dest, watch, parallel, series } = gulp;
const fs = require('fs');
const plugins = {
  concat: require('gulp-concat'),
  uglify: require('gulp-uglify'),
  browserSync: require('browser-sync').create(),
  clean: require('gulp-clean'),
  webp: require('gulp-webp'),
  avif: require('gulp-avif'),
  newer: require('gulp-newer'),
  fonter: require('gulp-fonter'),
  ttf2woff2: require('gulp-ttf2woff2'),
  include: require('gulp-file-include'),
  sourcemaps: require('gulp-sourcemaps'),
  notify: require('gulp-notify'),
  plumber: require('gulp-plumber'),
  if: require('gulp-if'),
  postcss: require('gulp-postcss'),
  sass: require('gulp-sass')(require('sass')),
  cssnano: require('cssnano'),
  autoprefixer: require('autoprefixer'),
  purgecss: require('@fullhuman/postcss-purgecss'),
};

// File Paths
const paths = {
  imagesSrc: 'app/images/src/**/*.{jpg,jpeg,png,svg,webp}',
  scriptsSrc: ['app/vendor/js/bootstrap.bundle.min.js', 'app/js/main.js'],
  stylesSrc: ['app/vendor/css/bootstrap.min.css', 'app/scss/main.scss'], // Виправлено scs → scss
  htmlSrc: 'app/pages/**/*.html',
  fontsSrc: 'app/fonts/src/*.{ttf,otf}',
};

// Processing HTML with components
function pages() {
  return src(paths.htmlSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error HTML: <%= error.message %>'
        ),
      })
    )
    .on('data', file => console.log('Find HTML:', file.path))
    .pipe(
      plugins.include({
        prefix: '@@',
        basepath: 'app/',
        context: { debug: true },
      })
    )
    .pipe(dest('app'))
    .pipe(plugins.browserSync.stream())
    .on('data', file => console.log('Processing HTML:', file.path));
}

// Font optimization
function fonts() {
  return src(paths.fontsSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error fonts: <%= error.message %>'
        ),
      })
    )
    .pipe(plugins.fonter({ formats: ['woff', 'ttf'] }))
    .pipe(plugins.if(file => /\.woff$/.test(file.extname), dest('app/fonts')))
    .pipe(src(paths.fontsSrc))
    .pipe(plugins.if(file => /\.ttf$/.test(file.extname), plugins.ttf2woff2()))
    .pipe(dest('app/fonts'));
}

// Image optimization
function images() {
  return src(paths.imagesSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error images: <%= error.message %>'
        ),
      })
    )
    .pipe(plugins.newer('app/images'))
    .pipe(
      plugins.if(file => {
        console.log('Processing SVG/WebP:', file.path);
        return /\.(svg|webp)$/.test(file.extname);
      }, dest('app/images'))
    )
    .pipe(src(paths.imagesSrc, { allowEmpty: true }))
    .pipe(plugins.newer('app/images'))
    .pipe(
      plugins.if(file => {
        console.log('Processing AVIF:', file.path);
        return /\.(jpg|jpeg|png)$/.test(file.extname);
      }, plugins.avif({ quality: 50 }))
    )
    .pipe(dest('app/images'))
    .pipe(src(paths.imagesSrc, { allowEmpty: true }))
    .pipe(plugins.newer('app/images'))
    .pipe(
      plugins.if(file => {
        console.log('Processing WebP:', file.path);
        return /\.(jpg|jpeg|png)$/.test(file.extname);
      }, plugins.webp())
    )
    .pipe(dest('app/images'));
}

// Scripts
function cleanScripts() {
  return src(['app/js/main.min.js', 'app/js/main.min.js.map'], {
    allowEmpty: true,
  }).pipe(plugins.clean());
}

function scripts() {
  return src(paths.scriptsSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error scripts: <%= error.message %>'
        ),
      })
    )
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('main.min.js'))
    .pipe(plugins.if(process.env.NODE_ENV === 'production', plugins.uglify()))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(dest('app/js'))
    .pipe(plugins.browserSync.stream())
    .on('data', file => console.log('Processing script:', file.path));
}

function scriptsProduction() {
  return src(paths.scriptsSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error scripts: <%= error.message %>'
        ),
      })
    )
    .pipe(plugins.concat('main.min.js'))
    .pipe(plugins.uglify())
    .pipe(dest('app/js'));
}

// Styles from Bootstrap 5
function styles() {
  fs.mkdirSync('app/css', { recursive: true });
  return src(paths.stylesSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error styles: <%= error.message %>'
        ),
      })
    )
    .pipe(plugins.sourcemaps.init())
    .pipe(
      plugins.if(
        file => file.extname === '.scss',
        plugins
          .sass({ outputStyle: 'compressed' })
          .on('error', plugins.sass.logError)
      )
    )
    .pipe(plugins.postcss([plugins.autoprefixer(), plugins.cssnano()]))
    .pipe(plugins.concat('style.min.css'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(dest('app/css'))
    .pipe(plugins.browserSync.stream())
    .on('data', file => console.log('Processing styles:', file.path));
}

function stylesProduction() {
  fs.mkdirSync('app/css', { recursive: true });
  return src(paths.stylesSrc, { allowEmpty: true })
    .pipe(
      plugins.plumber({
        errorHandler: plugins.notify.onError(
          'Error styles: <%= error.message %>'
        ),
      })
    )
    .pipe(
      plugins.if(
        file => file.extname === '.scss',
        plugins
          .sass({ outputStyle: 'compressed' })
          .on('error', plugins.sass.logError)
      )
    )
    .pipe(
      plugins.postcss([
        plugins.autoprefixer(),
        plugins.cssnano(),
        plugins.purgecss({
          content: ['app/**/*.html', 'app/js/**/*.js'],
          safelist: [
            /^modal/,
            /^carousel/,
            /^dropdown/,
            /^collapse/,
            /^show/,
            /^fade/,
            /^active/,
            /^disabled/,
            /^tooltip/,
            /^popover/,
            /^list-unstyled/,
            /^fw-bold/,
            /^btn/,
            /^card/,
            /^container/,
            /^row/,
            /^col/,
            /^nav/,
            /^navbar/,
            /^form/,
            /^alert/,
            /^badge/,
            /^breadcrumb/,
            /^pagination/,
            /^table/,
            /^list-group/,
            /^d-/,
            /^m-/,
            /^p-/,
            /^text-/,
            /^bg-/,
            /^border-/,
          ],
        }),
      ])
    )
    .pipe(plugins.concat('style.min.css'))
    .pipe(dest('app/css'));
}

// Continuous synchronization
function sync(done) {
  plugins.browserSync.init(
    {
      server: {
        baseDir: 'app/',
        middleware: [
          function (req, res, next) {
            res.setHeader(
              'Content-Security-Policy',
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:3000; img-src 'self' data:; font-src 'self'"
            );
            next();
          },
        ],
      },
      notify: false,
      port: 3000,
      open: true,
      ui: false,
    },
    err => {
      if (err) {
        console.error('BrowserSync error:', err);
        return done(err);
      }
      console.log('BrowserSync запущено');
      done();
    }
  );
}

// Watching
function watching() {
  watch(
    [
      'app/vendor/css/*.css',
      'app/scss/**/*.scss',
      'app/components/**/*.html',
      'app/pages/**/*.html',
    ],
    parallel(styles, pages)
  );
  watch(paths.scriptsSrc, { delay: 100 }, series(cleanScripts, scripts));
  watch(
    paths.imagesSrc,
    { delay: 500 },
    series(images, cb => {
      plugins.browserSync.reload();
      cb();
    })
  );
  watch(paths.fontsSrc, series(fonts));
}

// Cleaning
function cleanDist() {
  return src('dist/*', { allowEmpty: true }).pipe(plugins.clean());
}

// Build for production
function building() {
  return src(
    [
      'app/css/*.css',
      'app/images/*.{svg,webp,avif}',
      'app/fonts/*.{woff,woff2}',
      'app/js/main.min.js',
      'app/*.html',
    ],
    { base: 'app', allowEmpty: true }
  ).pipe(dest('dist'));
}

exports.styles = styles;
exports.images = images;
exports.fonts = fonts;
exports.pages = pages;
exports.scripts = series(cleanScripts, scripts);
exports.watching = watching;
exports.cleanDist = cleanDist;
exports.scriptsProduction = scriptsProduction;
exports.stylesProduction = stylesProduction;
exports.build = series(
  cleanDist,
  images,
  fonts,
  stylesProduction,
  scriptsProduction,
  pages,
  building
);
exports.default = series(
  parallel(styles, images, fonts, scripts, pages),
  sync,
  watching
);
