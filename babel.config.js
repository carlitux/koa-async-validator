/*
 * This is babel configuration for server, for frontend webpack uses own config
 */

module.exports = {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: 10,
        },
      },
    ],
  ],
};
