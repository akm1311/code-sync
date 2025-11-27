
import { put, list } from '@vercel/blob';
import 'dotenv/config';

async function testBlobStorage() {
    const KEY = 'test-storage.json';
    const DATA = { hello: 'world', timestamp: Date.now() };

    console.log('1. Writing JSON to Blob...');
    try {
        const blob = await put(KEY, JSON.stringify(DATA), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: false, // Important: overwrite the same file
        });
        console.log('   Write success:', blob.url);

        console.log('2. Reading JSON via list()...');
        const { blobs } = await list({
            prefix: KEY,
            limit: 1,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        if (blobs.length === 0) {
            console.log('   File not found via list()');
            return;
        }

        const foundBlob = blobs[0];
        console.log('   Found blob:', foundBlob.url);

        console.log('3. Fetching content...');
        const response = await fetch(foundBlob.url);
        const json = await response.json();
        console.log('   Content:', json);

        if (json.timestamp === DATA.timestamp) {
            console.log('SUCCESS: Read/Write verified!');
        } else {
            console.log('FAILURE: Content mismatch');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testBlobStorage();
