const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec('docker ps', (err, stream) => { 
    if (err) throw err; 
    let out = ''; 
    stream.on('data', data => out+=data.toString()).on('close', () => { 
      console.log(out);
      conn.end();
    }); 
  }); 
}).on('error', (err) => {
  console.log("Connection error: " + err.message);
}).connect({ host: '62.169.17.13', port: 22, username: 'root', password: '7S4g66r8MOH0HW525TC' });
