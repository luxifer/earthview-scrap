const Crawler = require('crawler');
const piexifjs = require('piexifjs');
const fs = require('fs');
const path = require('path');
const https = require('https');

const baseUrl = 'https://earthview.withgoogle.com';
const prefix = 'google-earth-view-';
const c = new Crawler({ maxConnections: 10 });

const download = (url, dest) =>
  new Promise(resolve => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish',()=> file.close(resolve));
    });
  });

c.options.callback = (err, { $ }, done) => {
  const data = JSON.parse($('body').attr('data-photo'));
  const filename = path.join('exifs', `${prefix}${data.id}.jpg`);

  console.log('Enqueuing ' + data.nextUrl);
  c.queue(encodeURI(baseUrl + data.nextUrl));

  if (fs.existsSync(filename)) done();

  download(data.photoUrl, filename).then(() => {
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    const { degToDmsRational } = piexifjs.GPSHelper;

    fs.writeFileSync(
      filename,
      piexifjs.insert(
        piexifjs.dump({
          '0th': { [piexifjs.ImageIFD.Copyright]: data.attribution },
          GPS: {
            [piexifjs.GPSIFD.GPSLatitude]: degToDmsRational(Math.abs(lat)),
            [piexifjs.GPSIFD.GPSLatitudeRef]: lat < 0.0 ? 'S' : 'N',
            [piexifjs.GPSIFD.GPSLongitude]: degToDmsRational(Math.abs(lng)),
            [piexifjs.GPSIFD.GPSLongitudeRef]: lng < 0.0 ? 'W' : 'E',
          },
        }),
        fs.readFileSync(filename).toString('binary')
      ),
      { encoding: 'binary' }
    );
    done();
  });
};

c.queue(baseUrl);
