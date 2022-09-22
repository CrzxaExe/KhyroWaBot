const { DisconnectReason } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');

module.exports = {
 connectionHandler(sock, update, connectWa) {
  const { connection, lastDisconnect } = update;
  if(connection === 'close') {
   const error = new Boom(lastDisconnect.error);
   const errorst = error?.output?.statusCode;
   if(errorst === DisconnectReason.loggedOut){
    sock.logout();
   } else {
    connectWa();
   }

  } else if(connection === 'open'){
   console.log("Connection")
  }
 }
}
