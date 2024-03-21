#!/usr/bin/env node

import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

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
        fs.mkdirSync(path.join(__dirname, "templates", newProjectPath, file));
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

// Command line arguments
const [, , condition, folderPath] = process.argv;

if (condition === "-a") {
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
  console.log("\nTemplate successfully created.");
} else if (!condition) {
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
        // fs.rmSync(gitFolderPath, { recursive: true });
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
  console.log(
    "\nIf you want to Create a New Template just type 'init' & press Enter at the Location of your Choice"
  );
  console.log("\nIf you want to Add a Template use the '-a' Flag");
  console.log(
    "\nIf you want to Clone a Repository & Add it as a Template use the '-c' Flag"
  );
  console.log("\nIf you want to Remove a Template use the '-r' Flag");
}
