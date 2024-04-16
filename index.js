const fs = require("fs");
const { spawn } = require("child_process");

const SHOW_OUTPUT = (process.argv[3] || 'true') == 'true';
const tests = "./tests";
const bashDir = "/bin/bash";

const minishellDir = process.argv[2] || "../minishell";

let testNumber = 0;
let successNumber = 0;

class Test {
    constructor(name, commands) {
        this.name = name;
        this.commands = commands;
        this.prompt = null;
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

    async showResults(bashOutput, minishellOutput) {
        let success = 0;
        let tests = 0;
        const bashArr = bashOutput.join("").split("cmd\n");
        let minishellArr = minishellOutput.join("").split(this.prompt);
        minishellArr.pop();

        console.log(`\n=================[ \x1b[33m${this.name}\x1b[0m ]=================\n`);

        for (let i = 0; i < minishellArr.length; i++) {
            const miniLine = minishellArr[i].split("\n");
            const command = miniLine[0];

            let output = miniLine.slice(1).join("\n");
            const bashOutput = bashArr[i];

            if (command) {
                if (bashOutput === output) {
                    output = output.replace(/\n/g, " \\n ");
                    const outputFormatted = " " + output.trim().substring(0, 50) + (output.trim().length > 50 ? "..." : "");
                    console.log(`${i}. \x1b[32m✓\x1b[0m ${command}`);
                    if (output && SHOW_OUTPUT) console.log(`   \x1b[90m${outputFormatted}\x1b[0m`);
                    success++;
                } else {
                    console.log("-----------------------------------");
                    console.log(`\x1b[31mNumber:\x1b[0m ${i}`);
                    console.log(`\x1b[31mCommand:\x1b[0m ${command}`);
                    console.log(`\x1b[31mExpected:\x1b[0m ${bashOutput}`);
                    console.log(`\x1b[31mGot:\x1b[0m ${output}`);
                    console.log("-----------------------------------");
                }
                tests++;
            }
        }

        testNumber += tests;
        successNumber += success;

        let color = success === tests ? "\x1b[32m" : "\x1b[31m";
        console.log(`\n${color}${success}/${tests} \x1b[0mtests passed\n`);
    }

    async runTests() {
        this.prompt = await this.getPrompt();
        let minishellOutput = [];
        let bashOutput = [];

        let bashEnded = false;
        let minishellEnded = false;

        const minishell = spawn(minishellDir);
        const bash = spawn(bashDir);

        minishell.stdout.on("data", (data) => {
            minishellOutput.push(data.toString());
        });
        bash.stdout.on("data", (data) => {
            bashOutput.push(data.toString());
        });

        bash.stdout.on("close", () => {
            bashEnded = true;
            if (minishellEnded) {
                return this.showResults(bashOutput, minishellOutput);
            }
        });

        minishell.stdout.on("close", () => {
            minishellEnded = true;
            if (bashEnded) {
                return this.showResults(bashOutput, minishellOutput);
            }
        });

        for (const command of this.commands) {
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
        const testsPromises = files
            .filter((file) => !file.startsWith("_"))
            .map(async (file) => {
                try {
                    const data = await fs.promises.readFile(`${tests}/${file}`, "utf8");
                    const commands = data.split("\n").filter((line) => line.trim() !== "");
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
