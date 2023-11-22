// parse-results.js
import { promises as fs } from 'fs';
import { AsyncParser } from '@json2csv/node';
import * as core from '@actions/core';

/**
 * Flattens JSON data for CSV and Markdown conversion.
 * @param {Array} dataArray - Array of data to flatten.
 * @returns {Array} Flattened data array.
 */
function flattenJsonData(dataArray) {
    let flattenedData = dataArray.flatMap(item =>
        item.violations.map(violation => ({
            engine: item.engine,
            fileName: item.fileName,
            ...violation,
        })),
    );

    for (const row of flattenedData) {
        // message contains newlines
        row.message = row.message.trim();
        // fileNames needs to be trimmed, we need to cut off everything before 'force-app'
        row.fileName = row.fileName.substring(row.fileName.indexOf('force-app'));
    }

    return flattenedData;
}

/**
 * Converts JSON data to CSV format and writes it to a file.
 * @param {string} jsonFilePath - Path to the JSON file.
 * @param {string} csvFilePath - Path to the output CSV file.
 */
async function convertJsonToCsv(jsonFilePath, csvFilePath) {
    try {
        const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
        const dataArray = JSON.parse(jsonData);
        const flattenedData = flattenJsonData(dataArray);

        const parser = new AsyncParser();
        const csvData = await parser.parse(flattenedData).promise();

        await fs.writeFile(csvFilePath, csvData);
        console.log(`Converted ${jsonFilePath} to ${csvFilePath}`);
    } catch (error) {
        console.error('Error during CSV conversion:', error);
    }
}

/**
 * Creates a markdown table from JSON data and adds it to GitHub Step Summary.
 * @param {string} jsonFilePath - Path to the JSON file.
 */
async function createMarkdownTableFromJson(jsonFilePath) {
    try {
        const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
        const dataArray = JSON.parse(jsonData);
        const flattenedData = flattenJsonData(dataArray);

        let markdownTable = `| :x: | ${Object.keys(flattenedData[0]).join(' | ')} |\n`;
        markdownTable += `| --- | ${Object.keys(flattenedData[0])
            .map(() => '---')
            .join(' | ')} |\n`;

        for (const row of flattenedData) {
            const rowData = Object.values(row).join(' | ');
            markdownTable += `| :x: | ${rowData} |\n`; // Prefixing each row with a red X icon
        }

        await core.summary
            .addHeading('SF(DX) Scanner Results')
            .addTable(markdownTable, 'markdown')
            .write();

        console.log('Markdown table added to GitHub Step Summary');
    } catch (error) {
        console.error('Error during Markdown table creation:', error);
    }
}

const jsonFilePath = process.argv[2] || 'scan-results.json';
const csvFilePath = process.argv[3] || 'scan-results.csv';

convertJsonToCsv(jsonFilePath, csvFilePath);
createMarkdownTableFromJson(jsonFilePath);
