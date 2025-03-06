const path = require("path");

module.exports = {
  mode: "development",
  entry: "./docs/js/index.js",
  output: {
    path: path.resolve(__dirname, "docs/dist"),
    filename: "bundle.js",
    publicPath: "/dist/",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-flow",
            ],
          },
        },
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "docs"),
    },
    compress: true,
    port: 3000,
    open: true,
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
};
