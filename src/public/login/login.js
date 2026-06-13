document.querySelector('#submitButton').addEventListener('click', async (event) => {
    event.preventDefault();
    const data = {
        username: document.querySelector("#username").value,
        password: document.querySelector("#password").value
    }
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        const result = await response.json();
        if (result.success) {
            // Save the username in the localstorage for fast login access
            localStorage.setItem('username', result.user?.username || result.username);
            window.location.href = '/app';
        } else {
            alert(result.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert(error.message || 'Login failed. Please try again.');
        return;
        
    }
})