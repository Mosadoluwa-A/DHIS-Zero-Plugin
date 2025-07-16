// filler.js

// Listen for forwarded messages from the content script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.source !== "DHIS2 Auto Filler") return;

  if (event.data.action === "runUpdates" && Array.isArray(event.data.config)) {
    event.data.config.forEach(({ tables, rows }) => {
      updateTablesAndRows(tables, rows);
    });
  }
});




// Core logic, uses jQuery from the host page
function updateTablesAndRows(tableNumbers, rowIndices) {
  function createProgressUI() {
    const barContainer = document.createElement('div');
    barContainer.id = 'batchProgressBarContainer';
    barContainer.style = 'position:fixed;top:0;left:0;width:100%;height:8px;background:#eee;z-index:9999';

    const bar = document.createElement('div');
    bar.id = 'batchProgressBar';
    bar.style = 'width:0%;height:100%;background:#4caf50;transition:width 0.2s ease';
    barContainer.appendChild(bar);

    const label = document.createElement('div');
    label.id = 'batchProgressLabel';
    label.style = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:4px 10px;font-size:13px;border-radius:4px;z-index:10000;font-family:Arial,sans-serif';

    const memoryBox = document.createElement('div');
    memoryBox.id = 'memoryMonitorBox';
    memoryBox.style = 'position:fixed;bottom:12px;right:12px;background:#f1f1f1;border:1px solid #ccc;padding:8px 12px;font-size:13px;font-family:monospace;color:#333;border-radius:6px;box-shadow:0 0 5px rgba(0,0,0,0.2);z-index:10000';

    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style = 'position:absolute;top:2px;right:6px;cursor:pointer;color:#888;font-weight:bold;font-size:14px';
    closeButton.onclick = () => memoryBox.remove();
    memoryBox.appendChild(closeButton);

    document.body.appendChild(barContainer);
    document.body.appendChild(label);
    document.body.appendChild(memoryBox);
  }

  function updateProgressUI(percent, etaSeconds, inputCount) {
    const bar = document.getElementById('batchProgressBar');
    const label = document.getElementById('batchProgressLabel');
    const memoryBox = document.getElementById('memoryMonitorBox');
    const estimatedMB = ((inputCount * 30) / 1024).toFixed(1);

    if (bar) bar.style.width = percent + '%';
    if (label) label.textContent = `${percent}% complete — approx ${etaSeconds}s remaining`;
    if (memoryBox) {
      memoryBox.innerHTML = `Processed: ${inputCount} inputs<br>Est. memory: ${estimatedMB} MB<br>ETA: ${etaSeconds}s`;
      memoryBox.style.background = estimatedMB > 150 ? '#ffe0e0' : '#f1f1f1';
      memoryBox.style.borderColor = estimatedMB > 150 ? '#ff4d4d' : '#ccc';
    }
  }

  function sampleInitialMemory() {
    window.initialMemory = performance.memory?.usedJSHeapSize ?? null;
    window.lastMemorySample = window.initialMemory;
  }

  function sampleFinalMemory() {
    const memBox = document.getElementById('memoryMonitorBox');
    const final = performance.memory?.usedJSHeapSize ?? null;
    if (!memBox || final === null || !window.initialMemory) return;

    const deltaMB = (final - window.initialMemory) / 1024 / 1024;
    const estText = memBox.innerHTML.match(/Est\. memory:\s([\d.]+)/);
    const estMB = estText ? parseFloat(estText[1]) : 0;
    const efficiency = estMB > 0 ? Math.min(100, (estMB / deltaMB) * 100).toFixed(1) : 'N/A';

    const rating = efficiency === 'N/A' ? ' (N/A)' : efficiency >= 90 ? ' ✅ Excellent' : efficiency >= 70 ? ' ⚠️ Good' : ' ❌ Poor';
    const summary = `<div style="margin-top:10px;padding:8px;border-top:1px solid #ccc;background:${deltaMB > 200 ? '#ffcccc' : '#e8f5e9'}">
        <strong>Actual JS Heap Growth:</strong> ${deltaMB.toFixed(2)} MB<br>
        <strong>Memory Accuracy:</strong> ${efficiency}% ${rating}
    </div>`;

    memBox.innerHTML += summary;
  }

  function estimateRemainingTime(start, done, total) {
    const elapsed = (Date.now() - start) / 1000;
    const progress = done / total;
    return progress === 0 ? 60 : Math.max(1, Math.round((elapsed / progress) - elapsed));
  }

  createProgressUI();
  sampleInitialMemory();

  const rowSet = new Set(rowIndices);
  let totalInputs = 0, processed = 0;
  const startTime = Date.now();
  let batchSize = 30, growthWindow = [];

  function sampleLiveMemory() {
    return performance.memory?.usedJSHeapSize ?? null;
  }

  function trackBatchGrowth() {
    const current = sampleLiveMemory();
    if (current && window.lastMemorySample) {
      const delta = (current - window.lastMemorySample) / 1024 / 1024;
      growthWindow.push(delta);
      if (growthWindow.length > 5) growthWindow.shift();
      const avg = growthWindow.reduce((a, b) => a + b, 0) / growthWindow.length;
      if (avg > 15 && batchSize > 10) batchSize -= 10;
      if (avg < 5 && batchSize < 100) batchSize += 10;
    }
    window.lastMemorySample = current;
  }

  tableNumbers.forEach(t => {
    const tableClass = `.t${t}`;
    const rows = $(tableClass + ' tbody tr').filter((i) => rowSet.has(i));
    const inputs = rows.find('input[type="text"]');
    totalInputs += inputs.length * 2;

    let idx = 0;

    function processBatch() {
      const end = Math.min(idx + batchSize, inputs.length);
      for (; idx < end; idx++) {
        $(inputs[idx]).val('0').data('triggerEvents', true);
        processed++;
      }
      updateProgressUI(Math.floor((processed / totalInputs) * 100), estimateRemainingTime(startTime, processed, totalInputs), processed);
      trackBatchGrowth();
      if (idx < inputs.length) setTimeout(processBatch, 50);
      else triggerEvents();
    }

    function triggerEvents() {
      let triggerIdx = 0;
      const triggerBatch = () => {
        const end = Math.min(triggerIdx + 20, inputs.length);
        for (; triggerIdx < end; triggerIdx++) {
          const $input = $(inputs[triggerIdx]);
          if ($input.data('triggerEvents')) {
            $input.removeData('triggerEvents');
            $input.trigger('input').trigger('change').trigger('dhis2');
            processed++;
          }
        }
        updateProgressUI(Math.floor((processed / totalInputs) * 100), estimateRemainingTime(startTime, processed, totalInputs), processed);
        if (triggerIdx < inputs.length) setTimeout(triggerBatch, 50);
        else {
          setTimeout(() => localStorage.removeItem('datavalues'), 2000);
          setTimeout(sampleFinalMemory, 1500);
        }
      };
      triggerBatch();
    }

    setTimeout(processBatch, 0);
  });
}
