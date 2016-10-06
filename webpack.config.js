var path    = require('path');
var webpack = require('webpack');
var fs      = require('fs');
var pkg     = require('./package.json');

module.exports = {
  entry: [
    './'
  ],
  output: {
    path:          path.join(__dirname, 'dist'),
    filename:      pkg.name + '.min.js',
    publicPath:    '',
    library:       'Sandbox',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel',
      include: path.join(__dirname, 'src')
    }]
  },
  plugins: [
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      mangle: {
        except: ['CronJob', 'Webtask']
      }
    })
  ]
};