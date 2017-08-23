const https = require('https');
const path = require('path');
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = 'https://earthview.withgoogle.com';
const destPath = path.join(__dirname, 'wallpapers');
const selector = '.menu__item--download';
const prefix = 'google-earth-view-';
const wallpaperCount = 100;

function getPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => { resolve(rawData); });
            res.on('err', (err) => { reject(err); })
        })
    });
}

function download(pathname, filename) {
    return new Promise((resolve, reject) => {
        let file = fs.createWriteStream(path.join(destPath, prefix+filename));
        https.get(pathname, (res) => {
            res.pipe(file);

            res.on('end', () => {
                file.close();
                resolve();
            });

            res.on('err', (err) => { reject(err); });
        })
    });
}

fs.stat(destPath, (err, stats) => {
    if (err) {
        fs.mkdirSync(destPath);
    }
});

for (let i = 0; i < wallpaperCount; i++) {
    getPage(url)
        .then((content) => {
            const { document } = new JSDOM(content).window;
            const pathname = url+document.querySelector(selector).attributes.getNamedItem('href').value;
            const filename = path.basename(pathname);
            download(pathname, filename);
        });
}
