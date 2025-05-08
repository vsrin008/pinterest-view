module.exports = {
  extends: [
    'airbnb',
    'plugin:flowtype/recommended',
  ],
  plugins: [
    'flowtype',
    'jest',
  ],
  parser: '@babel/eslint-parser',
  env: {
    browser: true,
    jest: true,
  },
  rules: {
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/__tests__/**',
        '**/jest/**',
        '**/test/**',
        '**/tests/**',
        '**/spec/**',
        '**/webpack.config.*.js',
        '**/jest.setup.js',
        '**/jest/setup.js'
      ]
    }]
  }
}; 