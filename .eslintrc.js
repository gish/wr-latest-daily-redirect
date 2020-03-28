module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"],
  extends: ["eslint-config-airbnb-typescript", "prettier/@typescript-eslint"],
  parserOptions: {
    project: "./tsconfig.json"
  }
};
