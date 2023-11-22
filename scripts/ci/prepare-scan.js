// determines which files need to be treated as legacy files and scanned differently within GitHub Action context
import execa from 'execa';
import fsExtra from 'fs-extra';
import path from 'path';

// File path identifier for Salesforce files
const FILE_PATH_IDENTIFIER = 'force-app';

// List of legacy code files
const LEGACY_METADATA_FILE_LIST = 'scripts/ci/legacy-metadata-files.txt';
const LEGACY_DESTINATION_DIR = 'legacy-metadata';

/**
 * Determines if the script is running in the context of a Pull Request.
 * @returns {boolean} True if in PR context, false otherwise.
 */
function isPullRequest() {
    return process.env.GITHUB_EVENT_NAME === 'pull_request';
}

/**
 * Determines the commit range for git diff based on GitHub Actions environment variables.
 * If the necessary environment variables are not available, it falls back to a default behavior.
 * @returns {string} The commit range.
 */
async function getRangeForDiff() {
    try {
        const baseRef = process.env.GITHUB_BASE_REF;
        const headRef = process.env.GITHUB_HEAD_REF;

        if (baseRef && headRef) {
            const fullBaseRef = `refs/remotes/origin/${baseRef}`;
            const fullHeadRef = `refs/remotes/origin/${headRef}`;
            return `${fullBaseRef}...${fullHeadRef}`;
        } else {
            console.warn('Not in a PR context. Exiting script.');
            process.exit(0);
        }
    } catch (error) {
        console.error('Error determining the commit range:', error);
        throw error;
    }
}

/**
 * Gets the modified files within the specified commit range.
 * @param {string} range - The commit range.
 * @returns {Promise<string[]>} A list of modified files.
 */
async function getModifiedFiles(range) {
    try {
        const { stdout } = await execa.command(`git diff --name-only --diff-filter=AMCR\ ${range}`);
        return stdout.split('\n');
    } catch (error) {
        console.error('Error retrieving modified files:', error);
        throw error;
    }
}

/**
 * Filters the files to include only those within the 'force-app' path.
 * @param {string[]} files - An array of file paths.
 * @returns {string[]} Filtered file paths.
 */
function filterFiles(files) {
    return files.filter(file => file.includes(FILE_PATH_IDENTIFIER));
}

/**
 * Reads the legacy code file list and returns it as an array.
 * @returns {Promise<string[]>} Array of legacy code file paths.
 */
async function readLegacyCodeFileList() {
    try {
        const data = await fsExtra.readFile(LEGACY_METADATA_FILE_LIST, 'utf8');
        return data.split('\n');
    } catch (error) {
        console.error('Error reading legacy code file list:', error);
        throw error;
    }
}

/**
 * Moves a file to a new destination, ensuring the destination directory exists.
 * @param {string} source - Source file path.
 * @param {string} destination - Destination file path.
 */
async function moveFile(source, destination) {
    try {
        await fsExtra.ensureDir(path.dirname(destination));
        await fsExtra.move(source, destination);
        return destination;
    } catch (error) {
        console.error(`Error moving file ${source} to ${destination}:`, error);
        throw error;
    }
}

/**
 * Processes modified files based on legacy code list. Moves legacy files to a specified directory.
 * Non-legacy files are left untouched.
 * @param {string[]} modifiedFiles - Array of modified file paths.
 * @param {string[]} legacyFiles - Array of legacy file paths.
 */
async function processLegacyFiles(modifiedFiles, legacyFiles) {
    const processedLegacyFiles = [];

    try {
        for (const file of modifiedFiles) {
            if (legacyFiles.includes(file)) {
                const destPath = path.join(LEGACY_DESTINATION_DIR, file);
                const newDestination = await moveFile(file, destPath);
                processedLegacyFiles.push(newDestination);
            }
        }
    } catch (error) {
        console.error('Error processing files:', error);
        throw error;
    }

    return processedLegacyFiles;
}

/**
 * Prints the full paths of legacy files.
 * @param {string[]} fileList - Array of legacy file paths.
 */
async function printFiles(fileList) {
    try {
        for (const file of fileList) {
            console.log(path.resolve(file));
        }
    } catch (error) {
        console.error('Error printing legacy files:', error);
        throw error;
    }
}

// Main execution function
async function main() {
    try {
        if (!isPullRequest()) {
            console.info('Script is not running in a Pull Request context. Exiting.');
            return;
        }

        const range = await getRangeForDiff();
        const modifiedFiles = await getModifiedFiles(range);
        const filteredFiles = filterFiles(modifiedFiles);
        const legacyFiles = await readLegacyCodeFileList();

        const processedLegacyFiles = await processLegacyFiles(filteredFiles, legacyFiles);

        console.log('**MODIFIED FILES**');
        await printFiles(modifiedFiles);

        console.log('**FILTERED FILES**');
        await printFiles(filteredFiles);

        console.log('**LEGACY FILES**');
        await printFiles(processedLegacyFiles);

        console.log('File processing complete.');
    } catch (error) {
        console.error('Error in main execution:', error);
        process.exit(1);
    }
}

// Run the main function
main();
