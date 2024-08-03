document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Check credentials
    if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('loggedIn', 'true'); // Set session indicator
        window.location.href = 'register.html';
    } else {
        alert('Invalid username or password');
    }
});