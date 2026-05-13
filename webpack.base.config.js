/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.json', '.js'],
  },

  output: {
    path: path.join(__dirname, '/dist'),
    filename: '[name]/[name].js',
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.DISABLE_UPDATES': JSON.stringify(process.env.DISABLE_UPDATES || 'false'),
      'process.env.TARGET_ENV': JSON.stringify(process.env.TARGET_ENV),
    }),
  ],
  externals: {
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
  },
};

