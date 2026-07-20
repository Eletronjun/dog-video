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

            // Fix the double interpolation
            const badPattern = /\$\{process\.env\.REACT_APP_API_URL\s*\|\|\s*`\$\{process\.env\.REACT_APP_API_URL\s*\|\|\s*'http:\/\/localhost:3001'`\}`\}/g;
            if (badPattern.test(data)) {
                data = data.replace(badPattern, "${process.env.REACT_APP_API_URL || 'http://localhost:3001'}");
                modified = true;
            }

            // Fix the backticks after slash: }`/login' -> }/login`
            // Example: }`/login', { -> }/login`, {
            // Because fetch(`${...}/`login', ...) is invalid.
            // Let's use a simpler replace
            const backtickSlashBad = /\}\/`([^']+)'/g;
            if (backtickSlashBad.test(data)) {
                data = data.replace(backtickSlashBad, "}/$1`");
                modified = true;
            }
            
            // Fix fetch(`${...}/`passeadores')
            const backtickSlashBad2 = /\}\/`([^)]+)'\)/g;
            if (backtickSlashBad2.test(data)) {
                data = data.replace(backtickSlashBad2, "}/$1`)");
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
