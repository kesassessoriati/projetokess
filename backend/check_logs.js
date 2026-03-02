const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec('docker ps -a --filter name=atendzappy_atendzappy_backend -q', (err, stream) => { 
    if (err) throw err; 
    let ids = ''; 
    stream.on('data', data => ids+=data.toString()).on('close', () => { 
      const id = ids.split('\n')[0].trim(); 
      if(id) { 
        conn.exec('docker logs --tail 200 ' + id, (err2, stream2) => { 
          stream2.on('data', d=>console.log(d.toString())).stderr.on('data', d=>console.log('ERR: '+d.toString())).on('close',()=>conn.end()); 
        }); 
      } else conn.end(); 
    }); 
  }); 
}).connect({ host: '62.169.17.13', port: 22, username: 'root', password: '7S4g66r8MOH0HW525TC' });
