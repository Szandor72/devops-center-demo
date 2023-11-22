import { promises as fs } from 'fs';
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
        .addHeading('SF(DX) Scanner Results')
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
 * Main function to process scan results.
 * @param {string} jsonFilePath - Path to the JSON file.
 * @param {string} csvFilePath - Path to the output CSV file.
 */
async function processScanResults(jsonFilePath, csvFilePath) {
    try {
        const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
        const dataArray = JSON.parse(jsonData);
        const flattenedData = flattenJsonData(dataArray);

        await convertJsonToCsv(flattenedData, csvFilePath);
        await createGithubTable(flattenedData);
        await createAnnotations(flattenedData);
    } catch (error) {
        console.error('Error processing scan results:', error);
    }
}

const jsonFilePath = process.argv[2] || 'scan-results.json';
const csvFilePath = process.argv[3] || 'scan-results.csv';

processScanResults(jsonFilePath, csvFilePath);
