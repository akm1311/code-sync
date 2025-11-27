
async function testTokenGen() {
    console.log('Testing /api/upload/token...');
    try {
        const response = await fetch('http://localhost:5000/api/upload/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'blob.generate-client-token',
                payload: {
                    pathname: 'test-file.txt',
                    callbackUrl: 'http://localhost:5000/api/upload/callback',
                    clientPayload: null,
                    multipart: false,
                }
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token generation failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        console.log('Token generation successful!', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testTokenGen();
