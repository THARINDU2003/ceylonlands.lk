// Using built-in fetch
async function testAuth() {
    const name = 'Test User ' + Date.now();
    const email = 'test' + Date.now() + '@example.com';
    const password = 'password123';

    console.log('Testing Registration...');
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    const regData = await regRes.json();
    if (regRes.ok) {
        console.log('Registration Success:', regData);
    } else {
        console.error('Registration Failed:', regData);
        process.exit(1);
    }

    console.log('Testing Login...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const loginData = await loginRes.json();
    if (loginRes.ok) {
        console.log('Login Success:', loginData.user);
        if (loginData.token) {
            console.log('Token Received');
        } else {
            console.error('Token Missing');
            process.exit(1);
        }
    } else {
        console.error('Login Failed:', loginData);
        process.exit(1);
    }

    console.log('All Auth Tests Passed!');
}

testAuth().catch(err => {
    console.error('Test Error:', err);
    process.exit(1);
});
