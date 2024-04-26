const fs = require("fs");
const { spawn } = require("child_process");
const { stringSimilarity } = require('string-similarity-js');

const DEBUG = (process.argv[3] || 'false') == 'true';
const testsPath = "./tests";

const minishellPath = "../minishell";
const PROMPT = "> ";

const reset = "\x1b[0m";
const log = {
  green: (text) => console.log("\x1b[92m" + text + reset),
  red: (text) => console.log("\x1b[91m" + text + reset),
  lightBlue: (text) => console.log("\x1b[94m" + text + reset),
  blue: (text) => console.log("\x1b[34m" + text + reset),
  info: (text) => console.log("\x1b[36m" + text + reset),
  yellow: (text) => console.log("\x1b[33m" + text + reset),
  gray: (text) => console.log("\x1b[90m" + text + reset),
  output: (success, bash, mini) => {
    if(success == false){
      console.log(`\x1b[31m     Mini:\x1b[0m \x1b[90m|${mini}|\x1b[0m` + reset);
      console.log(`\x1b[31m     Bash:\x1b[0m \x1b[90m|${bash}|\x1b[0m` + reset);
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

class Test {
    constructor(name, commands) {
        this.name = name;
        this.commands = commands;
    }

    async executeMinishell(minishell) {
        return new Promise((resolve, reject) => {
            let output = "";
            let error = "";
    
            const onData = (data) => {
                const strData = data.toString();
                output += strData;
            };

            const onStdErr = (data) => {
                const strData = data.toString();
                error += strData;
            };
    
            minishell.stdout.on("data", onData);
            minishell.stderr.on("data", onStdErr);
    
            const onError = (err) => {
                console.error("Error writing to minishell:", err.toString());
                reject(err.toString());
                cleanup();
            };
    
            minishell.stdin.on("error", onError);
    
            const cleanup = () => {
                minishell.stdout.off("data", onData);
                minishell.stderr.off("data", onStdErr);
                minishell.stdin.off("error", onError);
            };
    
            setTimeout(() => {
                cleanup();
                let outputArr = output.split("\n");
                outputArr.shift();
                if (outputArr.length > 1)
                    outputArr.pop();
                else if (outputArr.length == 1) {
                    outputArr[0] = outputArr[0].replaceAll(PROMPT, "");
                }

                const exitcode = parseInt(outputArr?.pop()) || 0;
                if(outputArr.length == 1)
                    outputArr[0] = outputArr[0].split(PROMPT)[0];
                else
                    outputArr.pop();

                resolve([outputArr.join("\n"), error.trim(), exitcode]);
            }, 10);
        });
    }

    async executeBash(shell) {
        return new Promise((resolve, reject) => {
            let output = "";
            let error = "";
    
            const onData = (data) => {
                const strData = data.toString();
                output += strData;
            };

            const onStdErr = (data) => {
                const strData = data.toString().trim();
                error += strData;
            };
    
            shell.stdout.on("data", onData);
            shell.stderr.on("data", onStdErr);
    
            const onError = (err) => {
                console.error("Error writing to shell:", err.toString());
                reject(err.toString());
                cleanup();
            };
    
            shell.stdin.on("error", onError);
    
            const cleanup = () => {
                shell.stdout.off("data", onData);
                shell.stderr.off("data", onStdErr);
                shell.stdin.off("error", onError);
            };
    
            setTimeout(() => {
                cleanup();
                let outputArr = output.split("\n");
                let exitcode;

                outputArr.pop();
                if(outputArr.length == 1){
                    exitcode = parseInt(outputArr[0].split("e_cooooddddeeeeee")[1]);
                    outputArr[0] = outputArr[0].split("e_cooooddddeeeeee")[0];
                }else
                    exitcode = parseInt(outputArr?.pop()?.split("e_cooooddddeeeeee")[1]) || 0;
                resolve([outputArr.join("\n"), error, exitcode]);
            }, 10);
        });
    }

    async runMinishell()
    {
        const shell = spawn(minishellPath, [], { shell: true });
        const output = [];

        for (const command of this.commands) {
            await shell.stdin.write(`${command}\n`);
            await shell.stdin.write(`echo $?\n`);
            const [stdout, stderr, exitcode] = await this.executeMinishell(shell);
            output.push({ command, stdout, stderr, exitcode});
        }
        shell.stdin.end();

        return output;
    }

    async runBash(){
        const shell = spawn("bash", [], { shell: true });
        const output = [];

        for (const command of this.commands) {
            await shell.stdin.write(`${command}\n`);
            await shell.stdin.write(`echo "e_cooooddddeeeeee$?"\n`);
            const [stdout, stderr, exitcode] = await this.executeBash(shell);
            output.push({ command, stdout, stderr, exitcode});
        }
        shell.stdin.end();

        return output;
    }

    async showResults(outputMinishell, outputBash){
        log.lightBlue(`\n==============[ ${this.name} ]==============\n`);
        
        let testNumber = 0;
        let stdOut = 0;
        let stdErr = 0;
        let exitCode = 0;

        for(const command of this.commands)
        {
            const minishellStdout = outputMinishell[testNumber].stdout;
            const bashStdout = outputBash[testNumber].stdout;
            const stdoutSuccess = minishellStdout == bashStdout;

            const minishellStderr = outputMinishell[testNumber].stderr;
            const bashStderr = outputBash[testNumber].stderr;
            let stderrSuccess;
            if(bashStderr.length > 0)
                stderrSuccess = stringSimilarity(bashStderr,minishellStderr) > 0.7;
            else
                stderrSuccess = minishellStderr == bashStderr;
            
            const minishellExitcode = outputMinishell[testNumber].exitcode;
            const bashExitcode = outputBash[testNumber].exitcode;
            const exitcodeSuccess = minishellExitcode == bashExitcode;
            
            if(stdoutSuccess && stderrSuccess && exitcodeSuccess)
                log.success(testNumber,command);
            else 
                log.error(testNumber,command);

            if(stdoutSuccess)
                stdOut++;
            else
                log.red(`   stdout: FAIL`);
            if(!stdoutSuccess || DEBUG)
                log.output(stdoutSuccess,bashStdout,minishellStdout);

            if(stderrSuccess > 0.8)
                stdErr++;
            else
                log.red(`   stderr: FAIL`);
            if(!stderrSuccess || DEBUG){
                log.output(stderrSuccess,bashStderr,minishellStderr);
            }

                
            if(exitcodeSuccess)
                exitCode++;
            else
            if(!exitcodeSuccess || DEBUG)
                log.output(exitcodeSuccess,bashExitcode,minishellExitcode);
            
            testNumber++;
        }

        console.log("");
        log.sumup("stdout", stdOut/testNumber);
        log.sumup("stderr", stdErr/testNumber);
        log.sumup("exitcode", exitCode/testNumber);
        log.sumup("Total", (stdOut + stdErr + exitCode)/(testNumber * 3)); 
        console.log("")
        return [outputBash,outputMinishell];
    }

    async runtestsPath() {
        const outputMinishell = await this.runMinishell();
        const outputBash = await this.runBash();

        return await this.showResults(outputMinishell, outputBash);
    }
}

async function checker(file) {
    try {
        const checkTestDir = await fs.existsSync(testsPath);
        const checkMinishell = await fs.existsSync(minishellPath);
        if(!checkTestDir)
            return console.error(`Error: ${testsPath} directory not found`);
        if(!checkMinishell)
            return console.error(`Error: ${minishellPath} not found`);

        if(file){
            const data = await fs.promises.readFile(`${testsPath}/${file}`, "utf8");
            const commands = data.split("\n").filter((line) => line.trim() !== "");
            commands.unshift(`export PS1="${PROMPT}"`)
            const test = new Test(file, commands);
            return test.runtestsPath();
        }

        const files = await fs.promises.readdir(testsPath);
         files.filter((file) => !file.startsWith("_"))
            .map(async (file) => {
                try {
                    const data = await fs.promises.readFile(`${testsPath}/${file}`, "utf8");
                    const commands = data.split("\n").filter((line) => line.trim() !== "");
                    commands.unshift(`export PS1="${PROMPT}"`)
                    const test = new Test(file, commands);
                    return test.runtestsPath();
                } catch (error) {
                    console.error(`Error reading file ${file}: ${error}`);
                }
            });
    } catch (error) {
        console.error(error);
    }
}

checker(process.argv[2]);