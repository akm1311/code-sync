
async function testDelete() {
    try {
        // 1. List files
        console.log('Listing files...');
        const listRes = await fetch('http://localhost:5000/api/files');
        const files = await listRes.json();
        console.log(`Found ${files.length} files.`);

        if (files.length === 0) {
            console.log('No files to delete.');
            return;
        }

        // 2. Delete the first file
        const fileToDelete = files[0];
        console.log(`Attempting to delete file: ${fileToDelete.filename} (${fileToDelete.id})`);

        const deleteRes = await fetch(`http://localhost:5000/api/files/${fileToDelete.id}`, {
            method: 'DELETE',
        });

        if (!deleteRes.ok) {
            const error = await deleteRes.json();
            console.error('Delete failed:', deleteRes.status, error);
        } else {
            console.log('Delete successful!');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testDelete();
