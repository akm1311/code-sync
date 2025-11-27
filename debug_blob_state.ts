
import { list } from '@vercel/blob';
import 'dotenv/config';

async function checkState() {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        console.error('No BLOB_READ_WRITE_TOKEN found in environment');
        return;
    }

    console.log('--- Vercel Blob Storage State ---');
    console.log('Listing all blobs...');

    try {
        const { blobs } = await list({ token });
        console.log(`Found ${blobs.length} total blobs.`);

        console.log('\n[Actual Files in Storage]:');
        blobs.forEach(b => {
            if (b.pathname !== 'shared-files.json' && b.pathname !== 'shared-code.json' && b.pathname !== 'users.json') {
                console.log(` - ${b.pathname} \n   (${b.url})`);
            }
        });

        console.log('\n[System Files]:');
        blobs.forEach(b => {
            if (b.pathname === 'shared-files.json' || b.pathname === 'shared-code.json' || b.pathname === 'users.json') {
                console.log(` - ${b.pathname}`);
            }
        });

        console.log('\n--- App Metadata State ---');
        const filesBlob = blobs.find(b => b.pathname === 'shared-files.json');
        if (filesBlob) {
            console.log('Reading shared-files.json...');
            const res = await fetch(filesBlob.url);
            if (res.ok) {
                const data = await res.json();
                const files = Object.values(data);
                console.log(`Metadata lists ${files.length} files:`);
                // @ts-ignore
                files.forEach(f => console.log(` - ${f.filename} (ID: ${f.id})`));
            } else {
                console.log('Failed to fetch shared-files.json content');
            }
        } else {
            console.log('CRITICAL: shared-files.json NOT found in blob storage. The app has no record of any files.');
        }

    } catch (error) {
        console.error('Error listing blobs:', error);
    }
}

checkState();
