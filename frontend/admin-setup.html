<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CeylonTerrece - Admin Setup</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/css/style.css">
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="max-w-md w-full p-8 bg-white shadow-2xl rounded-2xl border-t-4 border-red-600">
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-800">Admin Initialization</h2>
            <p class="text-gray-500 text-sm mt-2">Securely set up your root admin account. This page will be disabled once an admin exists.</p>
        </div>

        <form id="setupForm" class="space-y-6">
            <div id="errorBox" class="hidden bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4"></div>
            
            <div class="relative">
                <label for="name" class="text-sm font-semibold text-gray-600 mb-1 block">Full Name</label>
                <i class="fas fa-user absolute left-4 bottom-3.5 text-gray-400"></i>
                <input type="text" id="name" required class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
            </div>

            <div class="relative">
                <label for="email" class="text-sm font-semibold text-gray-600 mb-1 block">Admin Email (Username)</label>
                <i class="fas fa-envelope absolute left-4 bottom-3.5 text-gray-400"></i>
                <input type="email" id="email" required class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
            </div>

            <div class="relative">
                <label for="password" class="text-sm font-semibold text-gray-600 mb-1 block">Admin Password</label>
                <i class="fas fa-lock absolute left-4 bottom-3.5 text-gray-400"></i>
                <input type="password" id="password" required class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
            </div>

            <button type="submit" class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2">
                <i class="fas fa-shield-alt"></i> Initialize Admin
            </button>
        </form>
    </div>

    <script>
        document.getElementById('setupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const name = document.getElementById('name').value;
            const btn = e.target.querySelector('button');
            const errorBox = document.getElementById('errorBox');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
            errorBox.classList.add('hidden');

            try {
                const response = await fetch(((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api') + '/auth/setup-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                
                if (response.ok) {
                    alert('Admin account created successfully! You can now log in.');
                    window.location.href = '/login.html';
                } else {
                    throw new Error(data.error || 'Failed to setup admin.');
                }
            } catch (err) {
                errorBox.textContent = err.message;
                errorBox.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-shield-alt"></i> Initialize Admin';
            }
        });
    </script>
</body>
</html>
