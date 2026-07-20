const fs = require('fs');
const path = require('path');

function fixUrls(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixUrls(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let data = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            const badStr = "`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`}`";
            const goodStr = "`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`";
            
            while (data.includes(badStr)) {
                data = data.replace(badStr, goodStr);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, data, 'utf8');
                console.log('Fixed', fullPath);
            }
        }
    }
}
fixUrls('./src');
console.log('Done');
