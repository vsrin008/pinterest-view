const path = require("path");

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: "./docs/js/index.js",
  output: {
    path: path.resolve(__dirname, "docs"),
    filename: "bundle.js",
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
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "docs"),
    },
    historyApiFallback: true,
    port: 3000,
    hot: true,
    open: true,
  },
  optimization: {
    minimize: process.env.NODE_ENV === "production",
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
};
