// popup.js — DHIS2 Auto Filler Presets & Runner

const presets = {
  dst: {
    name: "DST Summary Form",
    tables: Array.from({ length: 22 }, (_, i) => i + 2),
    rows: [0,1,3,4,6,7,9,10,12,13]
  },
  drtb: {
    name: "DRTB",
    tables: [25,26],
    rows: [0,1,3,4,6,7,9,10,12,13,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43]
  },
  tpt: {
    name: "TPT Completion",
    tables: [27,28,29,30,31,32,33,34],
    rows: [0,1,3,4,6,7,9,10]
  },
  txsuccess: {
    name: "Treatment Success",
    tables: [36,37,38,39,40,41,42],
    rows: [0,1,3,4,6,7,9,10]
  },
  contact: {
    name: "Contact Investigation",
    tables: [44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59],
    rows: [0,1,3,4,6,7,9,10]
  },
  tbhiv: {
    name: "TB/HIV",
    tables: [61],
    rows: Array.from({ length: 47 }, (_, i) => i)
  }
};

// Tag the tables with their IDs and rows
function tagTablesWithClassNames() {
//   if (typeof $ === 'undefined') return alert("jQuery not available. Please ensure you're on a DHIS2 data entry page.");

    console.log("Tagging tables with class names...");
    const tables = document.querySelectorAll('table');
  tables.forEach((table, index) => {
    const tableClass = 't' + (index + 1);
    table.classList.add(tableClass);

    const rows = table.querySelectorAll('tbody tr');
    console.log(`Table .${tableClass} has ${rows.length} rows.`);

    rows.forEach((row, rowIndex) => {
      const firstCell = row.querySelector('td:first-child');
      if (!firstCell) return;

      let numberSpan = firstCell.querySelector('.row-number');
      if (!numberSpan) {
        numberSpan = document.createElement('span');
        numberSpan.className = 'row-number';
        firstCell.prepend(numberSpan);
      }

      numberSpan.textContent = (rowIndex + 1) + '. ';
      numberSpan.style.fontWeight = 'bold';
      numberSpan.style.marginRight = '6px';
      numberSpan.style.color = '#007bff';
    });
  });


}

document.getElementById('tagBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: tagTablesWithClassNames
    });
  });
});


// Preview button behavior
document.getElementById('previewBtn').addEventListener('click', () => {
  const selected = getSelectedPresets();
  const commands = selected.map(
    p => `updateTablesAndRows(${JSON.stringify(p.tables)}, ${JSON.stringify(p.rows)});`
  ).join('\n\n');
  document.getElementById('preview').textContent = commands || 'No selection.';
});

// Run button behavior
document.getElementById('runBtn').addEventListener('click', () => {
  const selected = getSelectedPresets();
  if (!selected.length) return alert('Please select at least one section.');

  const config = selected.map(p => ({ tables: p.tables, rows: p.rows }));

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "runUpdates", config });
  });
});

// Helper to get selected options
function getSelectedPresets() {
  const select = document.getElementById('sectionSelect');
  return Array.from(select.selectedOptions).map(opt => presets[opt.value]);
}
