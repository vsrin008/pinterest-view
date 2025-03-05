const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: [
    "webpack-dev-server/client?http://localhost:3000",
    path.resolve(__dirname, "js/index.js"),
  ],

  output: {
    filename: "bundle.js",
    path: __dirname,
    publicPath: "/",
  },

  devtool: "inline-source-map",

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: ["babel-loader"],
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [
    new webpack.NamedModulesPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  ],

  devServer: {
    contentBase: __dirname,
    host: "0.0.0.0",
    port: 3000,
    historyApiFallback: true,
  },
};
