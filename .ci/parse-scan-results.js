// receives scan results from sfdx scanner in json format within GitHub Action context and handles them accordingly
import execa from 'execa';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { AsyncParser } from '@json2csv/node';
import * as core from '@actions/core';

/**
 * Flattens JSON data for CSV, Markdown, and annotation processing.
 * @param {Array} dataArray - Array of data to flatten.
 * @returns {Array} Flattened data array.
 */
function flattenJsonData(dataArray) {
    let flattenedData = dataArray.flatMap(item =>
        item.violations.map(violation => ({
            engine: item.engine,
            fileName: item.fileName.substring(item.fileName.indexOf('force-app')),
            ...violation,
            message: violation.message.trim(),
        })),
    );
    return flattenedData;
}

/**
 * Converts flattened JSON data to CSV format and writes it to a file.
 * @param {Array} flattenedData - The array of flattened JSON objects.
 * @param {string} csvFilePath - Path to the output CSV file.
 */
async function convertJsonToCsv(flattenedData, csvFilePath) {
    const parser = new AsyncParser();
    const csvData = await parser.parse(flattenedData).promise();
    await fs.writeFile(csvFilePath, csvData);
    console.log(`Converted to CSV at ${csvFilePath}`);
}

/**
 * Creates a GitHub Markdown table from flattened JSON data.
 * @param {Array} flattenedData - The array of flattened JSON objects.
 */
async function createGithubTable(flattenedData) {
    const headers = Object.keys(flattenedData[0]).reduce(
        (acc, key) => {
            if (!['endLine', 'endColumn', 'url', 'normalizedSeverity'].includes(key)) {
                acc.push({ data: key, header: true });
            }
            return acc;
        },
        [{ data: 'PASSED?', header: true }],
    );

    const tableRows = flattenedData.map(row => {
        const rowValues = Object.entries(row).reduce(
            (acc, [key, value]) => {
                if (key === 'ruleName') {
                    acc.push(`<a href='${row.url}'>${value}</a>`);
                } else if (key === 'severity') {
                    // Combine replace severity with normalizedSeverity value
                    acc.push(row.normalizedSeverity.toString());
                } else if (!['endLine', 'endColumn', 'url', 'normalizedSeverity'].includes(key)) {
                    acc.push(value.toString());
                }
                return acc;
            },
            [':x:'],
        );
        return rowValues;
    });

    await core.summary
        .addHeading('Legacy Code: SF(DX) Scanner Results')
        .addTable([headers, ...tableRows])
        .write();

    console.log('GitHub table added to GitHub Step Summary');
}

/**
 * Creates annotations for each violation in the flattened JSON data.
 * @param {Array} flattenedData - The array of flattened JSON objects.
 */
async function createAnnotations(flattenedData) {
    flattenedData.forEach(row => {
        core.error(row.message, {
            title: row.ruleName,
            file: row.fileName,
            startLine: row.line,
            endLine: row.endLine,
            startColumn: row.column,
            endColumn: row.endColumn,
        });
    });
}

/**
 * Extracts PR number from GitHub reference
 * @param {string} githubRef
 * @returns {string|null}
 */
function extractPrNumber(githubRef) {
    const match = /refs\/pull\/(\d+)\/merge/.exec(githubRef);
    return match ? match[1] : null;
}

/**
 * Queries Salesforce for an existing ContentVersion record.
 * @param {string} prNumber
 * @param {string} hash
 * @returns {Promise<boolean>} Returns true if a matching record is found.
 */
async function queryExistingResultFiles(prNumber, hash) {
    try {
        const soqlQuery = `SELECT id FROM ContentVersion WHERE Title LIKE '%PR${prNumber}%' AND title LIKE '%${hash}%'`;
        const queryCommand = [
            'sf',
            'data',
            'query',
            '--query',
            `${soqlQuery}`,
            '--result-format',
            'json',
        ];

        const { stdout } = await execa(queryCommand[0], queryCommand.slice(1));
        const result = JSON.parse(stdout);

        return result.records && result.records.length > 0;
    } catch (error) {
        console.error('Error querying Salesforce:', error);
        throw error; // Rethrow to handle in the calling function
    }
}

/**
 * Will upload the CSV file to Salesforce as a ContentVersion record
 * Authentication is handled in github action yml file
 * @param {*} csvFilePath
 */
async function uploadCsvToSalesforce(csvFilePath) {
    try {
        const githubRef = process.env.GITHUB_REF;
        const prNumber = extractPrNumber(githubRef);

        if (!prNumber) {
            throw new Error('Pull Request number not found');
        }

        const csvContent = await fs.readFile(csvFilePath, 'utf8');
        const hash = crypto.createHash('md5').update(csvContent).digest('hex');

        const reportAlreadyExists = queryExistingResultFiles(prNumber, hash);

        if (reportAlreadyExists) {
            console.log('Report already exists in Salesforce. Skipping upload.');
            return;
        }

        const csvContentBase64 = Buffer.from(csvContent).toString('base64');

        let title = path.basename(csvFilePath, path.extname(csvFilePath));

        title = `${title}_PR${prNumber}_${hash}`;

        // Constructing the Salesforce CLI command
        const command = [
            'sf',
            'data',
            'record',
            'create',
            '--sobject',
            'ContentVersion',
            '--values',
            `Title='${title}' PathOnClient='${csvFilePath}' VersionData='${csvContentBase64}'`,
        ];
        // Execute the command
        const { stdout } = await execa(command[0], command.slice(1));

        console.log('Upload successful:', stdout);
    } catch (error) {
        console.error('Error uploading CSV to Salesforce:', error);
    }
}

/**
 * Main function to process scan results.
 * @param {string} jsonFilePath - Path to the JSON file.
 * @param {string} csvFilePath - Path to the output CSV file.
 */
async function processScanResults(jsonFilePath, csvFilePath) {
    try {
        const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
        const dataArray = JSON.parse(jsonData);
        const flattenedData = flattenJsonData(dataArray);

        // Check if 'legacy' is in the jsonFilePath
        if (jsonFilePath.includes('legacy')) {
            await convertJsonToCsv(flattenedData, csvFilePath);
            await createGithubTable(flattenedData);
            await uploadCsvToSalesforce(csvFilePath);
        } else {
            await createAnnotations(flattenedData);
        }
    } catch (error) {
        console.error('Error processing scan results:', error);
    }
}

const jsonFilePath = process.argv[2] || 'scan-results.json';
const csvFilePath = process.argv[3] || 'scan-results.csv';

processScanResults(jsonFilePath, csvFilePath);
