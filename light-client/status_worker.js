// This worker constantly every 5 seconds updates sync status to the UI via an interface provided by QuantumPurse class

/* Function to request sync status from the main thread */
function requestSyncStatus() {
  return new Promise((resolve) => {
    // create & request
    const requestId = Math.random().toString(36).substring(7);
    self.postMessage({ command: "getSyncStatus", requestId });
    // fulfill & remove
    self.addEventListener("message", function handler(event) {
      if (event.data.requestId === requestId) {
        resolve(event.data.data);
        self.removeEventListener("message", handler);
      }
    });
  });
}

/* Start periodic sync status updates every 5 seconds */
async function startSyncStatusUpdates() {
  setInterval(async () => {
    syncStatus = await requestSyncStatus();
    console.log(
      "\x1b[37;44m INFO \x1b[0m \x1b[1mlight-client-sync-status\x1b[0m: ",
      syncStatus
    );
    // Send the sync status to the main thread
    self.postMessage({ type: "syncStatusUpdate", data: syncStatus });
  }, 5000);
}

/* This worker's persistent command receiver */
self.onmessage = async function (event) {
  const { command, requestId } = event.data;
  if (command === "start") {
    startSyncStatusUpdates();
    self.postMessage({ type: "started", requestId });
  }
};