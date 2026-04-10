const fs = require('fs');
const path = require('path');

const dir = 'frontend';
const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const videoTagNav = `<a href="/" class="logo-container flex items-center gap-2">
                    <video src="/images/Website_logo_animated_202604092122.mp4" autoplay loop muted playsinline class="h-16 rounded-lg pointer-events-none"></video>
                </a>`;

const videoTagLogin = `<a href="/" class="inline-block">
                <video src="/images/Website_logo_animated_202604092122.mp4" autoplay loop muted playsinline class="h-20 mx-auto mb-4 rounded-lg pointer-events-none"></video>
            </a>`;

const videoTagFooter = `<video src="/images/Website_logo_animated_202604092122.mp4" autoplay loop muted playsinline class="h-16 mx-auto mb-6 rounded-lg pointer-events-none"></video>`;

let modifiedCount = 0;

for (const file of htmlFiles) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    let original = content;

    // Replace navbar logo
    content = content.replace(/<a href="\/" class="logo-container">[\s\S]*?<\/div>\s*<\/div>\s*<\/a>/, videoTagNav);
    
    // Replace login/signup logo
    content = content.replace(/<a href="\/" class="inline-block">\s*<img src="\/images\/logo.png"[^>]*>\s*<\/a>/, videoTagLogin);

    // Replace footer logo
    content = content.replace(/<img src="\/images\/logo.png" alt="Footer Logo"[^>]*>/, videoTagFooter);

    if (content !== original) {
        fs.writeFileSync(fp, content);
        console.log(`Updated ${file}`);
        modifiedCount++;
    }
}

console.log(`Total files updated: ${modifiedCount}`);
