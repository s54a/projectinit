#!/usr/bin/env node

import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    console.error("\nError: Please provide a folder path.");
    process.exit(1);
  }

  // Validate folder existence
  if (!fs.existsSync(folderPath)) {
    console.error("\nError: Folder does not exist.");
    process.exit(1);
  }

  // Create project name from folder path
  const projectName = path.basename(folderPath);

  // Create directory for new project if it doesn't exist
  const templateFolderPath = path.join(__dirname, "templates", projectName);
  if (!fs.existsSync(templateFolderPath)) {
    fs.mkdirSync(templateFolderPath);
  } else {
    console.log(`\nFolder '${templateFolderPath}' already exists.`);
    process.exit(1);
  }

  // Copy contents from folderPath to projectName/template
  createDirectoryContents(folderPath, projectName);

  // Inform user about successful operation
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
      process.exit(1);
    }

    createDirectoryContents(templatePath, projectName);
    console.log("\nTemplate successfully created.");
  });
} else {
  console.log("\nIf you want to add a Template Please use the '-a' Flag");
}
