module.exports = {
    "parserOptions": {
        "ecmaVersion": 6,
    },
    "env": {
        "node": true,
    },
    "extends": "eslint:recommended",
    "rules": {
       "indent": ["warn", 4],
       "global-require": 0,
       "camelcase": 0,
       "curly": 0,
       "no-undef": ["error"],
    }
}