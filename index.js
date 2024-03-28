#!/usr/bin/env node

import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHOICES = fs.readdirSync(path.join(__dirname, "templates"));

const QUESTIONS = [
  {
    name: "project-choice",
    type: "list",
    message: "What project template would you like to generate?",
    choices: CHOICES,
  },
  {
    name: "project-name",
    type: "input",
    message: "Project name:",
    validate: function (input) {
      if (/^([A-Za-z\-\_\d])+$/.test(input)) return true;
      else
        return "Project name may only include letters, numbers, underscores and hashes.";
    },
  },
];

const CURR_DIR = process.cwd();

let nodeFlag = false; // Set nodeFlag as a global variable with a default value of false

// Command line arguments
const [, , condition, folderPath, nodeFlagParam] = process.argv;

// Update the value of nodeFlag based on the command line argument
if (nodeFlagParam === "-y") {
  nodeFlag = true;
}

function createDirectoryContents(templatePath, newProjectPath) {
  const filesToCreate = fs.readdirSync(templatePath);

  filesToCreate.forEach((file) => {
    const origFilePath = path.join(templatePath, file);

    // get stats about the current file
    const stats = fs.statSync(origFilePath);

    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, "utf8");

      // Rename
      if (file === ".npmignore") file = ".gitignore";

      if (condition === "-a") {
        fs.writeFileSync(
          path.join(__dirname, "templates", newProjectPath, file),
          contents,
          "utf8"
        );
      } else {
        fs.writeFileSync(
          path.join(CURR_DIR, newProjectPath, file),
          contents,
          "utf8"
        );
      }
    } else if (stats.isDirectory()) {
      if (condition === "-a") {
        if (file === "node_modules" && !nodeFlag) {
          return;
        } else {
          fs.mkdirSync(path.join(__dirname, "templates", newProjectPath, file));
        }
      } else {
        fs.mkdirSync(path.join(CURR_DIR, newProjectPath, file));
      }

      // Then recursively copy contents
      createDirectoryContents(
        path.join(templatePath, file),
        path.join(newProjectPath, file)
      );
    }
  });
}

if (!condition) {
  inquirer.prompt(QUESTIONS).then((answers) => {
    const projectChoice = answers["project-choice"];
    const projectName = answers["project-name"];
    const templatePath = path.join(__dirname, "templates", projectChoice);
    const projectPath = path.join(CURR_DIR, projectName);

    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath);
    } else {
      console.log(`\nProject directory '${projectName}' already exists.`);
      {
        process.exit(1);
      }
    }

    createDirectoryContents(templatePath, projectName);
    console.log("\nTemplate successfully created.");
  });
} else if (condition === "-a") {
  // Validate folder path
  if (!folderPath) {
    console.error("\nError: provide a folder path.");
    {
      process.exit(1);
    }
  }

  // Validate folder existence
  if (!fs.existsSync(folderPath)) {
    console.error("\nError: Folder does not exist.");
    {
      process.exit(1);
    }
  }

  // Create project name from folder path
  const projectName = path.basename(folderPath);

  // Create directory for new project if it doesn't exist
  const templateFolderPath = path.join(__dirname, "templates", projectName);
  if (!fs.existsSync(templateFolderPath)) {
    fs.mkdirSync(templateFolderPath);
  } else {
    console.log(`\nFolder '${templateFolderPath}' already exists.`);
    {
      process.exit(1);
    }
  }

  // Copy contents from folderPath to projectName/template
  createDirectoryContents(folderPath, projectName);

  // InformSync user about successful operation
  if (nodeFlag) {
    console.log("\nTemplate successfully created with node_modules.");
  } else {
    console.log("\nTemplate successfully created.");
  }
} else if (condition === "-r") {
  const templateToRemove = process.argv[3];

  // Validate if the template exists
  const templatePathToRemove = path.join(
    __dirname,
    "templates",
    templateToRemove
  );
  if (!fs.existsSync(templatePathToRemove)) {
    console.error(`\nError: Template '${templateToRemove}' does not exist.`);
    {
      process.exit(1);
    }
  }

  // Remove the template directory
  fs.rmSync(templatePathToRemove, { recursive: true });

  // InformSync user about successful operation
  console.log(`\nTemplate '${templateToRemove}' was successfully removed.`);
} else if (condition === "-c") {
  const runCommand = (command) => {
    return new Promise((resolve, reject) => {
      try {
        execSync(command, { stdio: "inherit" });
        resolve(); // Resolve the promise when the command completes successfully
      } catch (error) {
        console.error(`Failed to Execute ${command}`, error);
        reject(error); // Reject the promise with the error if the command fails
      }
    });
  };

  const repoLink = process.argv[3];
  const gitCommand = `git clone --depth 1 ${repoLink}`;
  let projectName;

  // Check if a changed name is provided in the clone command
  if (repoLink.includes(" ")) {
    // Extract the project name from the clone command
    const cloneCommandParts = repoLink.split(" "); // Split the clone command by whitespace
    projectName = cloneCommandParts[cloneCommandParts.length - 1]; // Get the last part as the project name
  } else {
    // Extract the project name from the repository link
    projectName = path.basename(repoLink, ".git");
  }

  runCommand(gitCommand)
    .then(async () => {
      console.log("\nRepository Cloned");

      // Remove the .git folder
      const clonedFolderPath = path.join(CURR_DIR, projectName);
      const gitFolderPath = path.join(clonedFolderPath, ".git");
      if (fs.existsSync(gitFolderPath)) {
        await fs.promises.rm(gitFolderPath, { recursive: true });
      }

      // Run the 'init -a' command with the cloned folder path
      const initCommand = `init -a "${clonedFolderPath}"`;
      await runCommand(initCommand);

      // Remove the cloned project folder asynchronously
      await fs.promises.rm(clonedFolderPath, { recursive: true });
    })
    .catch((error) => {
      console.error("Error cloning repository:", error);
      process.exit(1); // Exit the script with an error status code
    });
} else if (condition === "-h") {
  // Clear the terminal by printing ANSI escape codes
  process.stdout.write("\u001b[2J\u001b[0;0H");

  const message = `
${chalk.bold.underline.white("Package Commands:")}

    ${chalk.green("Create a New Template:")}
      - Type ${chalk.cyan("'init'")} and press Enter at your desired location.

    ${chalk.green("Add a Template:")}
      - Use the ${chalk.cyan(
        "-a"
      )} flag followed by the path in quotes. By default it skips the node_modules folder.
      ${chalk.yellow("Example:")} ${chalk.cyan("init -a")} ${chalk.yellow(
    '"C:\\Users\\{User}\\Desktop\\Projects\\Ongoing Projects"'
  )}
      - But if you want to add node_modules folder with the template you are creating then ${chalk.cyan(
        "-y"
      )} flag after the command.
      ${chalk.yellow("Example:")} ${chalk.cyan("init -a")} ${chalk.yellow(
    '"C:\\Users\\{User}\\Desktop\\Projects\\Ongoing Projects"'
  )} ${chalk.cyan("-y")}

    ${chalk.green("Clone a Repository and Add as a Template:")}
      - Use the ${chalk.cyan(
        "-c"
      )} flag followed by the repository link in quotes.
      ${chalk.yellow("Example:")} ${chalk.cyan("init -c")} ${chalk.yellow(
    '"https://github.com/user/repoitoryName"'
  )}

    ${chalk.green("Remove a Template:")}
    - Use the ${chalk.cyan(
      "-r"
    )} flag followed by the exact name of the template in quotes.
      ${chalk.yellow("Example:")} ${chalk.cyan("init -r")} ${chalk.yellow(
    '"Template Name"'
  )}
        
    ${chalk.green("Help:")}
    - Use ${chalk.cyan("init -h")} to see help.


    Made By Sooraj Gupta
    Email : soorajgupta00@gmail.com
    Github Repository : https://github.com/s54a/s54a-init

`;

  console.log(message);
} else if (condition) {
  console.log(
    chalk.red(
      `
      Invalid command: "${condition}".
      
      Please use one of the supported commands.
      
      Run ${chalk.yellow("init -h")} to see help.
      
      `
    )
  );
} else {
  console.log(
    chalk.red(
      `An error occurred or an invalid command was provided.
      Run ${chalk.yellow("init -h")} to see help.`
    )
  );
}
