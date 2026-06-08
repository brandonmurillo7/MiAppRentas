const http = require('http');
const url = 'http://127.0.0.1:8084/index.bundle?platform=android&dev=true&minify=false';

http.get(url, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', JSON.stringify(res.headers, null, 2));
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('---BODY START---');
    console.log(data);
    console.log('---BODY END---');
  });
}).on('error', (e) => {
  console.error('ERROR', e.message);
});
