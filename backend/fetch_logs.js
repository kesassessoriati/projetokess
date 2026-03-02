const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec('docker ps -a --filter name=atendzappy_atendzappy_backend -q | head -n 1 | xargs docker logs --tail 100', (err, stream) => { 
    if (err) throw err; 
    let out = ''; 
    let outErr = '';
    stream.on('data', data => out+=data.toString()).stderr.on('data', data=>outErr+=data.toString()).on('close', () => { 
      console.log('---STDOUT---');
      console.log(out);
      console.log('---STDERR---');
      console.log(outErr);
      conn.end();
    }); 
  }); 
}).on('error', (err) => {
  console.log("Connection error: " + err.message);
}).connect({ host: '62.169.17.13', port: 22, username: 'root', password: '7S4g66r8MOH0HW525TC' });
