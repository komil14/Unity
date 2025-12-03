/**
 * Unity Admin Logic
 * Handles status updates and interactions
 */

async function updateStatus(endpoint, id) {
    const select = document.getElementById(`status-${id}`);
    const newStatus = select.value;
    
    // UI Feedback: Loading State
    select.style.opacity = "0.5";
    select.style.cursor = "wait";
    
    try {
        const response = await axios.post(`/admin/${endpoint}`, {
            _id: id,
            // Map correct field based on endpoint type
            memberStatus: endpoint.includes('user') ? newStatus : undefined,
            eventStatus: endpoint.includes('event') ? newStatus : undefined,
            boardStatus: endpoint.includes('board') ? newStatus : undefined,
            commentStatus: endpoint.includes('comment') ? newStatus : undefined,
        });

        if (response.data.state === 'success') {
            // UI Feedback: Success Flash
            const originalBorder = select.style.borderColor;
            select.style.borderColor = "#10b981"; // Green border
            select.style.color = "#10b981";       // Green text
            
            // Reload page if it was an approval action to update counts/badges
            // Or just reset visual state after delay
            setTimeout(() => {
                select.style.borderColor = "";
                select.style.color = "";
                // Optional: location.reload() if you want to refresh stats immediately
            }, 1000);
        } else {
            alert("Failed to update: " + response.data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Server connection failed");
    } finally {
        select.style.opacity = "1";
        select.style.cursor = "pointer";
    }
}