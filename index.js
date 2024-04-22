const fs = require("fs");
const { spawn } = require("child_process");
const { log } = require("./colors.js");

const SHOW_OUTPUT = (process.argv[3] || 'false') == 'true';
const tests = "./tests";
const bashDir = "/bin/bash";

const minishellDir = process.argv[2] || "../minishell/minishell";
const PROMPT = "> ";

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

                const exitcode = parseInt(outputArr.pop());
                if(outputArr.length == 1)
                    outputArr[0] = outputArr[0].split(PROMPT)[0];
                else
                    outputArr.pop();

                resolve([outputArr.join("\n"), error.trim(), exitcode]);
            }, 10);
        });
    }
    
    async runMinishell()
    {
        const shell = spawn(minishellDir, [], { shell: true });
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
                    exitcode = parseInt(outputArr.pop().split("e_cooooddddeeeeee")[1]);
                resolve([outputArr.join("\n"), error, exitcode]);
            }, 10);
        });
    }

    async runBash(){
        const shell = spawn(bashDir, [], { shell: true });
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
        let testNumber = 0;
        log.yellow(`\n===[ Test ${this.name} started ]===\n`);

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
            const stderrSuccess = minishellStderr == bashStderr;
            
            const minishellExitcode = outputMinishell[testNumber].exitcode;
            const bashExitcode = outputBash[testNumber].exitcode;
            const exitcodeSuccess = minishellExitcode == bashExitcode;
            
            const nb = testNumber + 1;
            log.info(`Test ${nb}: ${command}`)

            if(stdoutSuccess){
                log.green(`  stdout: OK`);
                stdOut++;
            }
            else
                log.red(`  stdout: FAIL`);
            if(!stdoutSuccess || SHOW_OUTPUT){
                log.errorMsg("    Minishell:",minishellStdout);
                log.errorMsg("    Bash:",bashStdout);
            }

            if(stderrSuccess){
                log.green(`  stderr: OK`);
                stdErr++;
            }
            else
                log.red(`  stderr: FAIL`);
            if(!stderrSuccess || SHOW_OUTPUT){
                log.errorMsg("    Minishell:",minishellStderr);
                log.errorMsg("    Bash:",bashStderr);
            }

            if(exitcodeSuccess){
                log.green(`  exitcode: OK`);
                exitCode++;
            }
            else
                log.red(`  exitcode: FAIL`);
            if(!exitcodeSuccess || SHOW_OUTPUT){
                log.errorMsg("    Minishell:",minishellExitcode);
                log.errorMsg("    Bash:",bashExitcode);
            }
            

            testNumber++;
            console.log("");
        }

        log.info(`====================\n`);

        log.gray(`stdout: ${stdOut}/${testNumber}`);
        log.gray(`stderr: ${stdErr}/${testNumber}`);
        log.gray(`exitcode: ${exitCode}/${testNumber}`);
        log.gray(`Total: ${stdOut + stdErr + exitCode}/${testNumber * 3}\n\n`); 
    }

    async runTests() {
        const outputMinishell = await this.runMinishell();
        const outputBash = await this.runBash();

        this.showResults(outputMinishell, outputBash);
    }
}

async function runSets() {
    try {
        const files = await fs.promises.readdir(tests);
        const testsPromises = files
            .filter((file) => !file.startsWith("_"))
            .map(async (file) => {
                try {
                    const data = await fs.promises.readFile(`${tests}/${file}`, "utf8");
                    const commands = data.split("\n").filter((line) => line.trim() !== "");
                    commands.unshift(`export PS1="${PROMPT}"`)
                    const test = new Test(file, commands);
                    return test.runTests();
                } catch (error) {
                    console.error(`Error reading file ${file}: ${error}`);
                }
            });
    } catch (error) {
        console.error("Error reading tests directory:", error);
    }
}

runSets();