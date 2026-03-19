module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Transpile @reactflow packages that ship ESM with modern syntax (??  ?.)
      // which babel-loader does not process for node_modules by default.
      const oneOfRule = webpackConfig.module.rules.find((r) => r.oneOf);
      if (oneOfRule) {
        const babelRule = oneOfRule.oneOf.find(
          (r) => r.loader && r.loader.includes("babel-loader") && r.include
        );
        if (babelRule && babelRule.include) {
          const includes = Array.isArray(babelRule.include)
            ? babelRule.include
            : [babelRule.include];
          babelRule.include = [
            ...includes,
            /node_modules\/@reactflow/,
            /node_modules\/reactflow\/node_modules\/@reactflow/
          ];
        }
      }
      return webpackConfig;
    }
  }
};
