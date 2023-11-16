// Import necessary libraries
import execa from 'execa';
import fsExtra from 'fs-extra';
import path from 'path';

/**
 * Determines the commit range for git diff based on GitHub Actions environment variables.
 * @returns {string} The commit range.
 */
/**
 * Determines the commit range for git diff based on GitHub Actions environment variables.
 * If the necessary environment variables are not available, it falls back to a default behavior.
 * @returns {string} The commit range.
 */
async function getRangeForDiff() {
    try {
        // Check for pull request environment variables
        const baseRef = process.env.GITHUB_BASE_REF;
        const headRef = process.env.GITHUB_HEAD_REF;

        if (baseRef && headRef) {
            // For PRs, compare head ref with the base ref
            return `${baseRef}...${headRef}`;
        } else {
            // For direct pushes or other scenarios
            const currentCommit = process.env.GITHUB_SHA;
            const previousCommit = await execa
                .command('git rev-parse HEAD^')
                .then(result => result.stdout)
                .catch(() => '');

            if (previousCommit && currentCommit) {
                // Compare with the previous commit if available
                return `${previousCommit}...${currentCommit}`;
            } else {
                // Fall back to comparing the last two commits
                console.warn('Falling back to the last two commits for diff range.');
                return 'HEAD~1...HEAD';
            }
        }
    } catch (error) {
        console.error('Error determining the commit range:', error);
        throw error;
    }
}

/**
 * Gets the modified files (excluding added files) within the specified commit range.
 * @param {string} range - The commit range.
 * @returns {Promise<string[]>} A list of modified files.
 */
async function getModifiedFiles(range) {
    try {
        // Only include Modified, Copied, and Renamed files
        const { stdout } = await execa.command(`git diff --name-only --diff-filter=MCR ${range}`);
        return stdout.split('\n');
    } catch (error) {
        console.error('Error retrieving modified files:', error);
        throw error;
    }
}

/**
 * Gets the added files within the specified commit range.
 * @param {string} range - The commit range.
 * @returns {Promise<string[]>} A list of added files.
 */
async function getAddedFiles(range) {
    try {
        // Only include Added files
        const { stdout } = await execa.command(`git diff --name-only --diff-filter=A ${range}`);
        return stdout.split('\n');
    } catch (error) {
        console.error('Error retrieving added files:', error);
        throw error;
    }
}

/**
 * Copies files to the specified destination directory.
 * @param {string[]} files - An array of file paths.
 * @param {string} destination - The destination directory.
 */
async function copyFiles(files, destination) {
    try {
        await fsExtra.ensureDir(destination); // Ensure the destination directory exists
        for (const file of files) {
            const destPath = path.join(destination, file);
            await fsExtra.ensureDir(path.dirname(destPath));
            await fsExtra.copy(file, destPath);
        }
    } catch (error) {
        console.error('Error copying files:', error);
        throw error;
    }
}

async function printFilesInDirectory(directory, parentPath = '') {
    try {
        const filesAndDirs = await fsExtra.readdir(directory);

        for (const fileOrDir of filesAndDirs) {
            const fullPath = path.join(directory, fileOrDir);
            const stat = await fsExtra.stat(fullPath);

            if (stat.isDirectory()) {
                // If it's a directory, recurse into it
                await printFilesInDirectory(fullPath, path.join(parentPath, fileOrDir));
            } else {
                // Print the file path, prepended with parent paths
                console.log(path.join(parentPath, fileOrDir));
            }
        }
    } catch (error) {
        console.error(`Error listing files in directory ${directory}:`, error);
        throw error;
    }
}

// Main execution function
async function main() {
    try {
        const range = await getRangeForDiff();
        const modifiedFiles = await getModifiedFiles(range);
        const addedFiles = await getAddedFiles(range);

        await copyFiles(modifiedFiles, 'modified-files-to-scan');
        await copyFiles(addedFiles, 'new-files-to-scan');

        // For testing purposes, print the files in the directories
        console.log('**MODIFIED FILES**');
        await printFilesInDirectory('modified-files-to-scan');

        console.log('**NEW FILES**');
        await printFilesInDirectory('new-files-to-scan');

        console.log('File processing complete.');
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

// Run the main function
main();
