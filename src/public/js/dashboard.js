/**
 * Global Status Updater for Unity Admin
 */
async function updateStatus(endpoint, id) {
    const select = document.getElementById(`status-${id}`);
    const newStatus = select.value;
    const originalColor = select.style.borderColor;

    try {
        select.disabled = true;
        document.body.style.cursor = 'wait';

        const response = await axios.post(`/admin/${endpoint}`, {
            _id: id,
            memberStatus: endpoint.includes('user') ? newStatus : undefined,
            eventStatus: endpoint.includes('event') ? newStatus : undefined,
            boardStatus: endpoint.includes('board') ? newStatus : undefined,
            commentStatus: endpoint.includes('comment') ? newStatus : undefined,
        });

        if (response.data.state === 'success') {
            // Visual Success Feedback
            select.style.borderColor = '#10B981'; // Green
            select.style.backgroundColor = '#ECFDF5';
            setTimeout(() => {
                select.style.borderColor = '#E5E7EB';
                select.style.backgroundColor = 'white';
            }, 1500);
        } else {
            alert("Error: " + response.data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Connection Failed');
    } finally {
        select.disabled = false;
        document.body.style.cursor = 'default';
    }
}

/**
 * Theme Toggle Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = toggleBtn.querySelector('i');

    // 1. Check Local Storage
    const savedTheme = localStorage.getItem('unity-theme');
    if (savedTheme === 'light') {
        body.setAttribute('data-theme', 'light');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // 2. Toggle Event
    toggleBtn.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        
        if (currentTheme === 'light') {
            // Switch to Dark
            body.removeAttribute('data-theme');
            localStorage.setItem('unity-theme', 'dark');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            // Switch to Light
            body.setAttribute('data-theme', 'light');
            localStorage.setItem('unity-theme', 'light');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });
});