module.exports = function(config) {
  config.set({
    logLevel: config.LOG_DEBUG,
    browsers: ['Chrome'],
    frameworks: ['jasmine'],
    
    files: [
      'test/helpers/**/*.js',
      'src/*/**/*.js',
      'test/**/*.js'
    ],

    reporters: ['dots']
  });
};
