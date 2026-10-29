const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(302, { Location: 'http://localhost:3000' + (req.url || '') });
  res.end();
});

server.listen(5173, '0.0.0.0', () => {
  console.log('Port 5173 redirecting to http://localhost:3000');
});

