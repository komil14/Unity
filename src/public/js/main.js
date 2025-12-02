/**
 * Generic Status Updater
 * Used by: Users, Events, Boards, Comments pages
 */
async function updateStatus(endpoint, id, statusId) {
  const select = document.getElementById(statusId);
  const newStatus = select.value;

  try {
    // Show loading state (optional)
    select.disabled = true;

    const response = await axios.post(`/admin/${endpoint}`, {
      _id: id,
      // Determine the key based on endpoint (user -> memberStatus, event -> eventStatus)
      memberStatus: endpoint.includes("user") ? newStatus : undefined,
      eventStatus: endpoint.includes("event") ? newStatus : undefined,
      boardStatus: endpoint.includes("board") ? newStatus : undefined,
      commentStatus: endpoint.includes("comment") ? newStatus : undefined,
    });

    if (response.data.state === "success") {
      select.disabled = false;
      // Visual feedback
      select.style.borderColor = "#1cc88a";
      setTimeout(() => (select.style.borderColor = "#d1d3e2"), 2000);
    } else {
      alert(response.data.message);
      select.disabled = false;
    }
  } catch (err) {
    console.error(err);
    alert("Update Failed");
    select.disabled = false;
  }
}
