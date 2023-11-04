import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

export type DefaultCsvHeaderItem = {
    id: string;
    title: string;
}

const FETCH_URL: string = 'https://www.npmjs.com/package/cheerio';
const DIRECTORY_NAME: string = './files';
const DEFAULT_CSV_FILENAME: string = 'image_urls.csv';
const DEFAULT_CSV_HEADER: Array<DefaultCsvHeaderItem> = [{ id: 'url', title: 'Image URL' }];

const downloadFile = (url: string, fileName: string) => {
    // Create the download directory if it doesn't exist
    if (!fs.existsSync(DIRECTORY_NAME)) {
        fs.mkdirSync(DIRECTORY_NAME);
    }

    return new Promise((resolve, reject) => {
        axios({
            url: url,
            method: 'GET',
            responseType: 'stream',
        })
            .then((response) => {
                const filePath = `${DIRECTORY_NAME}/${fileName}`;
                const writer = fs.createWriteStream(filePath);

                writer.on('finish', () => {
                    // File downloaded successfully
                    resolve(true);
                });

                writer.on('error', (error) => {
                    // Error while writing the file
                    reject(`Error saving the file: ${error.message}`);
                });

                response.data.pipe(writer);
            })
            .catch((error) => {
                // Error while downloading the file
                reject(`Error downloading file from ${url}: ${error.message}`);
            });
    });
};

// Create a CSV file
const createCsvFile = (fileName = DEFAULT_CSV_FILENAME, header = DEFAULT_CSV_HEADER, fileContent: Array<any>) => {
    const csvWriter = createCsvWriter({
        path: `${DIRECTORY_NAME}/${fileName}`,
        header: header,
    });

    // Write the image URLs to the CSV file
    csvWriter.writeRecords(fileContent)
        .then(() => {
            console.log('CSV file created with image URLs.');
        })
        .catch(error => {
            console.error('Error writing CSV file:', error);
        });
}

const scrapeWebsite = async () => {
    try {
        // Fetch the HTML content of the website
        const response = await axios.get(FETCH_URL); // Replace with the URL you want to scrape

        // Load the HTML content into Cheerio
        const $ = cheerio.load(response.data);

        // Find all <a> tags
        const nofollowLinks = $('a');

        // Loop through the found links

        const imageUrls: Array<any> = [];

        let isSelect = false;

        const configureOutputCsvData = () => {

            return new Promise<void>((resolve) => {

                nofollowLinks.map((index, element) => {
                    const link: string = $(element).attr('href') ?? ''; // Get the href attribute of the <a> tag

                    if (link.includes('https://www.airbnb.com/')) {
                        isSelect = true;
                    }

                    if (isSelect) {
                        // Find the <img> element inside the current <a> element
                        const img = $(element).find('img');

                        // Get the src attribute of the <img> element
                        const imgSrc = img.attr('src');

                        if (img && imgSrc) {

                            // Download file
                            downloadFile(imgSrc, `${index}.jpg`)
                                .then((result) => {
                                    if (result) {
                                        console.log('File downloaded successfully.');
                                        imageUrls.push({ url: imgSrc });
                                    } else {
                                        console.error('File download failed.');
                                    }
                                })
                                .catch((error) => {
                                    console.error(error);
                                });

                        }
                    }
                });

                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }

        // CreateCsv file
        const generateCsvFile = () => {
            return new Promise<void>((resolve) => {
                const csvFileName = DEFAULT_CSV_FILENAME;
                const csvFileHeader = DEFAULT_CSV_HEADER;
                createCsvFile(csvFileName, csvFileHeader, imageUrls);

                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }

        configureOutputCsvData()
            .then(() => generateCsvFile())
            .catch((error) => console.log(error));

    } catch (error) {
        console.error('Error:', error);
    }
}

scrapeWebsite();
