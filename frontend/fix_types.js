const fs = require('fs');

function fixImportCsvModal() {
  const file = 'src/components/areas/finance/ImportCsvModal.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<Select\s+[^>]*>/g, match => {
    return match.replace(/className="[^"]*"\s*/g, '');
  });
  content = content.replace(/tone="critical"/g, 'tone="destructive"');
  fs.writeFileSync(file, content);
}

function fixTransactionsTab() {
  const file = 'src/components/areas/finance/TransactionsTab.tsx';
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove className from Select
  content = content.replace(/<Select\s+[^>]*>/g, match => {
    return match.replace(/className="[^"]*"\s*/g, '');
  });
  
  // Remove allowClear
  content = content.replace(/allowClear(\s|=)/g, '$1');
  content = content.replace(/allowClear>/g, '>');
  
  // Fix mode="tags" if any left
  content = content.replace(/mode="tags"/g, '');
  
  // Fix string values in options for number state
  content = content.replace(/value:\s*(\d+)/g, 'value: "$1"');
  
  // Fix ChangeEventHandler for Switch
  content = content.replace(/onChange=\{setRecurring\}/g, 'onChange={(val) => setRecurring(typeof val === "boolean" ? val : !!val?.target?.checked)}');
  
  // Fix size="sm" -> size="small"
  content = content.replace(/size="sm"/g, 'size="small"');
  
  fs.writeFileSync(file, content);
}

fixImportCsvModal();
fixTransactionsTab();
