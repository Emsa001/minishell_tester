const reset = "\x1b[0m";

const log = {
  green: (text) => console.log("\x1b[92m" + text + reset),
  red: (text) => console.log("\x1b[91m" + text + reset),
  blue: (text) => console.log("\x1b[34m" + text + reset),
  info: (text) => console.log("\x1b[36m" + text + reset),
  yellow: (text) => console.log("\x1b[33m" + text + reset),
  gray: (text) => console.log("\x1b[90m" + text + reset),
  output: (success, bash, mini) => {
    if(success == false){
      console.log(`\x1b[31m     Mini:\x1b[0m \x1b[90m${mini}\x1b[0m` + reset);
      console.log(`\x1b[31m     Bash:\x1b[0m \x1b[90m${bash}\x1b[0m` + reset);
    }
    else{
      console.log(`\x1b[32m     Mini:\x1b[0m \x1b[90m${mini}\x1b[0m` + reset);
      console.log(`\x1b[32m     Bash:\x1b[0m \x1b[90m${bash}\x1b[0m` + reset);
    }
  },
  success: (nb, command) => console.log(`\x1b[92m✅ ${nb}: ${command}` + reset),
  error: (nb, command) => console.log(`\x1b[31m❌ ${nb}: ${command}` + reset),
  sumup: (text,sum) => {
    sum = sum * 100;
    let color = "\x1b[32m";
    if(sum < 100){
      if(sum > 90)
        color = "\x1b[36m";
      else if(sum > 50)
        color = "\x1b[33m";
      else
        color = "\x1b[31m"
    }
    console.log(`${color}${text}: ${parseInt(sum)}%`)
  }
};

module.exports = {log};