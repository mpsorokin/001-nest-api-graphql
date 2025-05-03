#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const SEPARATOR = '====================================\n';

/**
 * Recursively traverses a directory, reads file contents, and writes them
 * to the output file handle.
 * @param {string} currentPath The current directory or file path to process.
 * @param {fs.FileHandle} outputFileHandle The handle for the output file.
 */
async function traverseDirectory(currentPath, outputFileHandle) {
  try {
    const stats = await fs.stat(currentPath);

    if (stats.isFile()) {
      // Process the file
      try {
        const content = await fs.readFile(currentPath, 'utf8');
        const formattedContent =
          SEPARATOR + currentPath + '\n' + SEPARATOR + content + '\n\n'; // Add extra newline for better separation between files

        await outputFileHandle.write(formattedContent);
      } catch (err) {
        // Handle file reading errors (e.g., permissions)
        console.warn(
          `Warning: Could not read file "${currentPath}". Skipping.`,
          err.message,
        );
      }
    } else if (stats.isDirectory()) {
      // Process the directory recursively
      try {
        const entries = await fs.readdir(currentPath);
        const processingPromises = entries.map((entry) => {
          const fullPath = path.join(currentPath, entry);
          // Recurse into subdirectories or process files
          return traverseDirectory(fullPath, outputFileHandle);
        });

        // Wait for all parallel operations within this directory level
        await Promise.all(processingPromises);
      } catch (err) {
        // Handle directory reading errors (e.g., permissions)
        console.warn(
          `Warning: Could not read directory "${currentPath}". Skipping.`,
          err.message,
        );
      }
    }
    // Ignore other types (symlinks, etc.)
  } catch (err) {
    // Handle errors during fs.stat (e.g., path doesn't exist after check, broken symlink)
    console.warn(
      `Warning: Could not access path "${currentPath}". Skipping.`,
      err.message,
    );
  }
}

async function main() {
  const args = process.argv.slice(2); // Remove 'node' and script path

  const foldersToProcess = [];
  let outputFilePath = null;

  // Basic argument parsing
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      if (i + 1 < args.length) {
        outputFilePath = args[i + 1];
        i++; // Skip the next argument as it's the value for the flag
      } else {
        console.error('Error: --output or -o flag requires a file path.');
        process.exit(1);
      }
    } else {
      foldersToProcess.push(args[i]);
    }
  }

  // Validation
  if (foldersToProcess.length === 0) {
    console.error('Error: No source folders specified.');
    console.log(
      'Usage: node script.js <folder1> [<folder2> ...] --output <output_file>',
    );
    process.exit(1);
  }

  if (!outputFilePath) {
    console.error('Error: Output file not specified.');
    console.log(
      'Usage: node script.js <folder1> [<folder2> ...] --output <output_file>',
    );
    process.exit(1);
  }

  let outputFileHandle = null;
  try {
    // Open the output file for writing (overwrites if it exists)
    outputFileHandle = await fs.open(outputFilePath, 'w');

    for (const folder of foldersToProcess) {
      try {
        const stat = await fs.stat(folder);
        if (!stat.isDirectory()) {
          console.warn(
            `Warning: Input path "${folder}" is not a directory. Skipping.`,
          );
          continue; // Skip to the next input path
        }
      } catch (err) {
        console.warn(
          `Warning: Could not access input path "${folder}". Skipping.`,
          err.message,
        );
        continue; // Skip to the next input path
      }

      console.log(`Processing folder: "${folder}"`);
      await traverseDirectory(folder, outputFileHandle);
    }

    console.log(`\nSuccessfully generated "${outputFilePath}"`);
  } catch (err) {
    console.error('\nAn unexpected error occurred:', err);
    process.exit(1);
  } finally {
    // Ensure the file handle is closed
    if (outputFileHandle) {
      await outputFileHandle.close();
    }
  }
}

// Execute the main function
main();
