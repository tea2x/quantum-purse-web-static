const { merge } = require("webpack-merge");
const CompressionWebpackPlugin = require("compression-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const common = require("./webpack.common");

let publicPath = "/";
if (process.env.DEPLOY_TARGET === "electron") {
  publicPath = "./";
}

module.exports = merge(common, {
  mode: "production",
  output: {
    publicPath: publicPath,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [new CompressionWebpackPlugin()],
});