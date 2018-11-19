const Crawler = require('crawler');
const piexifjs = require('piexifjs');
const fs = require('fs');
const path = require('path');
const https = require('https');

const baseUrl = 'https://earthview.withgoogle.com';
const prefix = 'google-earth-view-';

let c = new Crawler({
    maxConnections: 10
});

let download = (url ,dest) => {
    return new Promise((resolve, reject) => {
        let file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            })
        });
    });
};

c.options.callback = (err, res, done) => {
    let $ = res.$;
    let data = JSON.parse($('body').attr('data-photo'));
    let filename = path.join('exifs', `${prefix}${data.id}.jpg`);
    let url = encodeURI(baseUrl + data.nextUrl);

    console.log('Enqueuing ' + url);
    c.queue(url);

    // skip if file aloready exists
    if (fs.existsSync(filename)) {
        done();
        return;
    }

    download(data.photoUrl, filename).then(() => {
        let zeroth = {};
        zeroth[piexifjs.ImageIFD.Copyright] = data.attribution;

        let gps = {};
        let latitude = parseFloat(data.lat);
        gps[piexifjs.GPSIFD.GPSLatitude] = piexifjs.GPSHelper.degToDmsRational(Math.abs(latitude));
        gps[piexifjs.GPSIFD.GPSLatitudeRef] = latitude < .0 ? 'S' : 'N';
        let longitude = parseFloat(data.lng);
        gps[piexifjs.GPSIFD.GPSLongitude] = piexifjs.GPSHelper.degToDmsRational(Math.abs(longitude));
        gps[piexifjs.GPSIFD.GPSLongitudeRef] = longitude < .0 ? 'W' : 'E';

        let exif = {
            "0th": zeroth,
            "GPS": gps
        };
        let srcData = fs.readFileSync(filename);
        let exifData = piexifjs.dump(exif);
        let destData = piexifjs.insert(exifData, srcData.toString('binary'));
        fs.writeFileSync(filename, destData, {
            'encoding': 'binary'
        });

        done();
    });
};

c.queue(baseUrl);
