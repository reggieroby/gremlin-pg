var webpack = require("webpack");
var nodeExternals = require("webpack-node-externals");

export default {
  mode: "production",
  target: "node",
  entry: {
    index: "./src/query.js",
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/env"],
          },
        },
      },
    ],
  },
  node: {
    __dirname: false,
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].js",
    library: "gremlin-pg",
    libraryTarget: "umd",
  },
};
