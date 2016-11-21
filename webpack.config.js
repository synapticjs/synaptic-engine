var webpack = require('webpack')
var path = require('path')
module.exports = {
  context: __dirname,
  entry: './src/index.ts',
  output: {
    path: path.resolve('dist'),
    filename: 'synaptic.js',
    libraryTarget: 'umd',
    library: 'synaptic',
    publicPath: '/',
  },
  plugins: [
    new webpack.NoErrorsPlugin()/*,
    new webpack.optimize.UglifyJsPlugin({
        compress: {
            warnings: false
        }
    })*/
  ],
  resolve: {
    extensions: ['', '.js', '.ts', '.json'],
    modulesDirectories: ['.', 'node_modules']
  },
  module: {
    loaders: [
      { test: /\.tsx?$/, loader: 'ts-loader' },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
}
