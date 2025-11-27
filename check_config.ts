
async function checkConfig() {
    try {
        const response = await fetch('http://localhost:5000/api/upload/config');
        const data = await response.json();
        console.log('Upload Configuration:', data);

        if (data.isVercelBlob) {
            console.log('SUCCESS: Vercel Blob is configured!');
        } else {
            console.log('FAILURE: Vercel Blob is NOT configured (using local fallback).');
        }
    } catch (error) {
        console.error('Error checking config:', error);
    }
}

checkConfig();
