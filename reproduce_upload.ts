
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
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

testUpload();
