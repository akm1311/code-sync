
import fs from 'fs';
import path from 'path';

async function testUpload() {
    const filename = 'test-upload.txt';
    const content = 'Hello, world! This is a test file.';
    const base64Content = Buffer.from(content).toString('base64');

    console.log('Attempting to upload file...');

    try {
        const response = await fetch('http://localhost:5000/api/files/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: filename,
                file: base64Content,
            }),
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Upload successful!', data);

        // Save metadata
        console.log('Saving metadata...');
        const metaResponse = await fetch('http://localhost:5000/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileURL: data.uploadURL,
                filename: filename,
                fileSize: 1024 // Dummy size
            })
        });

        if (!metaResponse.ok) {
            throw new Error(`Metadata save failed: ${metaResponse.status}`);
        }
        console.log('Metadata saved!');

    } catch (error) {
        console.error('Error uploading file:', error);
        fs.writeFileSync('error.log', JSON.stringify(error, null, 2) + '\n' + (error instanceof Error ? error.stack : String(error)));
    }
}

testUpload();
