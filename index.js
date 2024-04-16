const fs = require("fs");
const { spawn } = require("child_process");

const tests = "./tests";
const minishellDir = "../minishell/minishell";
const bashDir = "/bin/bash";

class Test {
    constructor(name, commands) {
        this.name = name;
        this.commands = commands;
    }

    async getPrompt() {
        return new Promise((resolve, reject) => {
            const minishell = spawn(minishellDir, [], { stdio: "pipe" });

            minishell.stdout.on("data", (data) => {
                const outputArr = data.toString().split("\n");
                resolve(outputArr[0].trim());
                minishell.kill();
            });

            minishell.stderr.on("data", (data) => {
                reject(data.toString());
            });

            minishell.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`Minishell exited with code: ${code}`));
                }
            });

            minishell.stdin.write("\n");
            minishell.stdin.end();
        });
    }

    outputFormat(array) {
        const result = [];
        let currentCommand = '';
        let currentOutput = '';

        for (const item of array) {
            if (item.startsWith('11_C_M_D_11_')) {
                // If it's a command, execute the previous command if any
                if (currentCommand !== '') {
                    result.push({ command: currentCommand, output: currentOutput });
                    currentCommand = '';
                    currentOutput = '';
                }
                currentCommand = item.replace('11_C_M_D_11_', '');
            } else {
                // If it's not a command, consider it as output
                if (currentOutput !== '') {
                    currentOutput += '\n' + item;
                } else {
                    currentOutput = item;
                }
            }
        }

        // Push the last command and output if any
        if (currentCommand !== '') {
            result.push({ command: currentCommand, output: currentOutput });
        }

        return result;
    }

    runMiniShell() {
        return new Promise(async (resolve, reject) => {
            const PROMPT = await this.getPrompt();
            let minishellOutput = [];
            let bashOutput = [];
            let result = [];

            const minishell = spawn(minishellDir);
            const bash = spawn(bashDir);

            minishell.stdout.on("data", (data) => {
                minishellOutput.push(data.toString());
            });

            bash.stdout.on("data", (data) => {
                bashOutput.push(data.toString());
            });

            minishell.stderr.on("close", () => {
                let bashArr = bashOutput.join("").split('\n');
                bashArr = this.outputFormat(bashArr);

                let minishellArr = minishellOutput.join("").split(PROMPT);
                minishellArr.pop();
                if(bashArr[bashArr.length -1] === "")
                    bashArr.pop();
            
                for (let i = 0; i < minishellArr.length; i++) {
                    const miniLine = minishellArr[i].split("\n");

                    const command = miniLine[0];
                    let output = miniLine.slice(1).join("\n").trim();
                    const bashOutput = bashArr[i - 1]?.output.trim();

                    if(command)
                        result.push({ command, output, expected: bashOutput });
                }
                resolve(result);
            });

            minishell.on("error", (error) => {
                console.log(error);
                // reject(error);
            });
            bash.on("error", (error) => {
                console.log(error);
                // reject(error);
            });

            for (const command of this.commands) {
                bash.stdin.write(`echo "11_C_M_D_11_${command}"\n`);
                bash.stdin.write(`${command}\n`);
                minishell.stdin.write(`${command}\n`);
            }

            bash.stdin.end()

            setTimeout(() => {
                minishell.stdin.end();
            }, 100);
        });
    }

    async showResults(results) {

        let success = 0;
        console.log(`\n=================[ \x1b[33m${this.name}\x1b[0m ]=================\n`)

        for(let i = 0; i < results.length; i++) {
            const minishellOutput = results[i].output;
            const bashOutput = results[i].expected;
            const command = results[i].command;

            if(minishellOutput === bashOutput) {
                console.log(`\x1b[32m✓\x1b[0m ${command}`);
                success++;
            }else{
                console.log("-----------------------------------");
                console.log(`\x1b[31mTest: \x1b[0m${i + 1}`)
                console.log(`\x1b[31mCommand:\x1b[0m ${command}`);
                console.log(`\x1b[31mExpected:\x1b[0m ${bashOutput}`);
                console.log(`\x1b[31mGot:\x1b[0m ${minishellOutput}`);
                console.log("-----------------------------------");
            }
        }

        console.log(`\n> ${success}/${results.length} tests passed\n`);
    }

    async runTestsV2(){
        let success = 0;
        let tests = 0;

        const PROMPT = await this.getPrompt();
        let minishellOutput = [];
        let bashOutput = [];

        const minishell = spawn(minishellDir);
        const bash = spawn(bashDir);

        minishell.stdout.on("data", (data) => {
            minishellOutput.push(data.toString());
        });
        bash.stdout.on("data", (data) => {
            bashOutput.push(data.toString());
        });

        minishell.stderr.on("close", () => {
            const bashArr = bashOutput.join("").split('cmd\n'); 
            let minishellArr = minishellOutput.join("").split(PROMPT);
            minishellArr.pop();
        
            console.log(`\n=================[ \x1b[33m${this.name}\x1b[0m ]=================\n`)

            for (let i = 0; i < minishellArr.length; i++) {
                const miniLine = minishellArr[i].split("\n");
                const command = miniLine[0];
                
                let output = miniLine.slice(1).join("\n");
                const bashOutput = bashArr[i];

                if(command){
                    if(bashOutput === output){
                        console.log(`\x1b[32m✓\x1b[0m ${command}`);
                        success++;
                    }else{
                        console.log("-----------------------------------");
                        console.log(`\x1b[31mCommand:\x1b[0m ${command}`);
                        console.log(`\x1b[31mExpected:\x1b[0m ${bashOutput}`);
                        console.log(`\x1b[31mGot:\x1b[0m ${output}`);
                        console.log("-----------------------------------");
                    }
                    tests++;
                }
            }

            let color = success === tests ? "\x1b[32m" : "\x1b[31m";
            console.log(`\n${color}${success}/${tests} \x1b[0mtests passed\n`);
        });

        for(const command of this.commands){
            minishell.stdin.write(`${command}\n`);
            bash.stdin.write(`echo cmd\n`);
            bash.stdin.write(`${command}\n`);
        }
        bash.stdin.end();
        minishell.stdin.end();
    }   
}


async function runSets() {
    try {
        const files = await fs.promises.readdir(tests);
        for (const file of files) {
            try {
                const data = await fs.promises.readFile(`${tests}/${file}`, "utf8");
                const commands = data.split("\n").filter((line) => line.trim() !== "");
                const test = new Test(file, commands);
                test.runTestsV2();
            } catch (error) {
                console.error(`Error reading file ${file}: ${error}`);
            }
        }
    } catch (error) {
        console.error("Error reading tests directory:", error);
    }
}

runSets();
