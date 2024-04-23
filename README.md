
# MiniShell Tester

MiniShell Tester is a tool designed to aid in testing the functionality of the MiniShell project. Built using Node.js with child_process, this tester allows you to run commands in a single session.

`export PS1="> "` must work correctly in order to run tester
## Installation

Clone the repository in your minishell directory

```bash
git clone https://github.com/Emsa001/minishell_tester
```

Install minishell with npm

```bash
cd minishell_tester
npm install
```

You're done!
## Running Tests

To run tests, run the following command
```bash
node index.js <PATH_TO_MINISHELL> [SHOW_LOGS]
```
Default values:
```bash
PATH_TO_MINISHELL: "../minishell"
SHOW_OUTPUT: false
```

PS: Try to not get upset after running tests
## Add new tests

To add new tests create a new file in **./tests** directory.
Each file is a seperate minishell session.

Example test file:
```txt
ls
pwd
cd ..
pwd
echo $USER
echo '$USER'
echo -n "Hello, World!"
```

You can disable tests by adding `_` to the beggining of the file name: `_disabledTests`

That's it!
## Demo

![Demo](https://github.com/Emsa001/minishell_tester/blob/main/data/demo.gif?raw=true)


## Feedback

If you have any feedback, please reach out to us at discord: emsa001