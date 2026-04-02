const http = require('http');

const testRoute = (path) => {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:5000${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`TEST ${path}: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    console.log(`JSON valid for ${path}`);
                    resolve(json);
                } catch (e) {
                    console.log(`JSON invalid for ${path}`);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.log(`Error testing ${path}: ${err.message}`);
            resolve(null);
        });
    });
};

async function runTests() {
    console.log('Starting verification tests...');
    await testRoute('/api/properties');
    await testRoute('/api/featured');
    await testRoute('/api/dashboard-stats');
    console.log('Verification finished.');
}

runTests();
