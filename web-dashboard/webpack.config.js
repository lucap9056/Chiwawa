const path = require('path');
const fs = require("fs");

const CompressionPlugin = require('compression-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: 'development', //development | production
    entry: './src/index.tsx',
    output: {
        filename: 'bundle[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            "@src": path.resolve(__dirname, 'src/'),
            "@home": path.resolve(__dirname, 'src/Home'),
            "@routes": path.resolve(__dirname, 'src/Routes'),
            "@components": path.resolve(__dirname, 'src/Components/'),
            "@services": path.resolve(__dirname, 'src/Services/'),
            "@utils": path.resolve(__dirname, 'src/Utils/'),
        }
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin(),
        ],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new CompressionPlugin({
            test: /\.ts(\?.*)?$/i,
            algorithm: 'gzip',
            threshold: 10240,
            minRatio: 0.8,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public', to: '' },
            ],
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        hot: true,
        host: 'localhost',
        port: 443,
        server: {
            type: "https",
            options: {
                cert: fs.readFileSync("./ssl/localhost.crt"),
                key: fs.readFileSync("./ssl/localhost.key")
            }
        },
        proxy: [
            {
                context: ["/api"],
                target: "http://localhost:4000",
                changeOrigin: true,
                pathRewrite: {
                    '^/api': '',
                },
            }

        ]
    }
};