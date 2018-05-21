/*
 * @Author: zy9@github.com/zy410419243 
 * @Date: 2018-04-24 14:12:30 
 * @Last Modified by: zy9
 * @Last Modified time: 2018-05-21 15:19:57
 */
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const WebpackOnBuildPlugin = require('on-build-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

const buildPath = './dist/';
const dev = process.argv.includes('development') ? true : false;

module.exports = {
  devServer: {
    port: 9099
  },
  devtool: dev ? 'source-map' : '',
  entry: {
    Trunk: './main.js'
  },
  output: {
    path: __dirname + '/dist',
    filename: dev ? 'Trunk.[chunkHash:8].js' : 'Trunk.js'
  },
  // optimization: { // 分离插件代码
  //   splitChunks: {
  //     chunks: 'all',
  //     cacheGroups: {
  //       vendor: {
  //         test: /node_modules\//,
  //         name: 'dist/vendor',
  //         priority: 10,
  //         enforce: true
  //       }
  //     }
  //   },
  //   runtimeChunk: {
  //     name: 'dist/manifest'
  //   }
  // },
  plugins: [
    new HtmlWebpackPlugin({ // 生成html
      template: 'index.html'
    }),
    new WebpackOnBuildPlugin(stats => { // 删除dist下原有文件
      const newlyCreatedAssets = stats.compilation.assets;

      !dev && fs.readdir(path.resolve(buildPath), (err, files) => {
        files && files.forEach(file => {
          if (!newlyCreatedAssets[file]) {
            fs.unlink(path.resolve(buildPath + file), () => { });
          }
        });
      })
    }),
    new CopyWebpackPlugin([
      {
        from: __dirname + '/assets',
        to: __dirname + '/dist/assets'
      }
    ]),
  ],
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015', 'stage-0']
          }
        }
      }, {
        test: /\.(png|jpg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      }
    ]
  }
};
