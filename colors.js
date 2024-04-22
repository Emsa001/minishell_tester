const reset = "\x1b[0m";

const log = {
  green: (text) => console.log("\x1b[32m" + text + reset),
  red: (text) => console.log("\x1b[31m" + text + reset),
  blue: (text) => console.log("\x1b[34m" + text + reset),
  info: (text) => console.log("\x1b[36m" + text + reset),
  yellow: (text) => console.log("\x1b[33m" + text + reset),
  gray: (text) => console.log("\x1b[90m" + text + reset),
  errorMsg: (name, text) => console.log(`\x1b[91m${name}\x1b[0m \x1b[90m${text}\x1b[0m` + reset),
};

module.exports = {log};