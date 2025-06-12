module.exports = function (config) {
  config.set({
    frameworks: ["mocha"],
    files: [
      "tests/*.test.ts",
      {
        pattern: "node_modules/quantum-purse-key-vault/quantum_purse_key_vault_bg.wasm",
        type: "wasm",
        served: true,
        included: false,
      },
    ],
    preprocessors: {
      "tests/**/*.ts": ["webpack"],
    },
    webpack: {
      mode: "development",
      module: {
        rules: [
          {
            test: /\.(ts|js)$/,
            use: [
              {
                loader: "babel-loader",
                options: {
                  presets: ["@babel/preset-env"],
                },
              },
              "ts-loader",
            ],
            exclude: /node_modules/,
          },
          {
            test: /\.wasm$/,
            type: "asset/resource",
          },
          {
            test: /\.toml$/,
            use: "file-loader",
          },
        ],
      },
      resolve: {
        extensions: [".ts", ".js"],
        fallback: {
          "stream": false
        }
      },
    },
    mime: {
      "application/wasm": ["wasm"],
    },
    browsers: ['ChromeWithFlags'],
    customLaunchers: {
      ChromeWithFlags: {
        base: 'Chrome',
        flags: ['--enable-features=SharedArrayBuffer'],
      },
    },
    singleRun: true,
    plugins: [
      "karma-mocha",
      "karma-chai",
      "karma-chrome-launcher",
      "karma-webpack",
    ],
    logLevel: config.LOG_INFO,
  });
};
