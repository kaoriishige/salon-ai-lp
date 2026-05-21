const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        try {
          fs.unlinkSync(curPath);
        } catch (e) {
          console.warn(`Failed to delete file ${curPath}:`, e.message);
        }
      }
    });
    try {
      fs.rmdirSync(directoryPath);
      console.log(`Successfully deleted directory: ${directoryPath}`);
    } catch (e) {
      console.warn(`Failed to delete directory ${directoryPath}:`, e.message);
    }
  }
}

// 削除対象のディレクトリとファイル
const targets = [
  path.join(__dirname, '.netlify'),
  path.join(__dirname, '.next'),
  path.join(__dirname, 'diagnostic_result.json'),
  path.join(__dirname, 'diagnostic_api_error.json')
];

console.log('--- CLEARING OLD CACHES AND RESIDUAL FILES ---');
targets.forEach(target => {
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      deleteFolderRecursive(target);
    } else {
      try {
        fs.unlinkSync(target);
        console.log(`Successfully deleted file: ${target}`);
      } catch (e) {
        console.warn(`Failed to delete file ${target}:`, e.message);
      }
    }
  }
});
console.log('--- CLEARING COMPLETED ---');
