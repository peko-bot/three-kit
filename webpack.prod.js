/*
 * @Author: zy9@github.com/zy410419243
 * @Date: 2018-05-20 13:48:08
 * @Last Modified by: zy9
 * @Last Modified time: 2018-08-11 16:39:40
 */
const webpack = require('webpack');
const fs = require('fs');
const CleanWebpackPlugin = require('clean-webpack-plugin');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
// const TohoLogPlugin = require('toho-log-plugin');
const TohoLogPlugin = require('./plugins/toho-log-plugin');
const path = require('path');
const { commonModule, commonPlugin } = require('./webpack.common');

let plugins = commonPlugin;

// plugins.push(
//     new CopyWebpackPlugin([
//         {
//             from: __dirname + '/src/assets',
//             to: __dirname + '/dist/assets'
//         },
//     ])
// );

plugins.push(new TohoLogPlugin({ dev: false }));

plugins.push(new CleanWebpackPlugin(['dist'], {
	verbose: false
}));

const options = {
	mode: 'production',
	devServer: {
		port: 9099
	},
	resolve: {
		extensions: ['.js'],
	},
	externals: {
		'three': 'three'
	},
	devtool: 'source-map',
	entry: {
		Trunk: __dirname + '/src',
	},
	output: {
		path: __dirname + '/dist',
		filename: '[name].js',
		chunkFilename: 'vendor/[name].js',
		libraryTarget: 'umd'
	},
	plugins,
	module: commonModule
};

webpack(options).run();