const { connectionHandler } = require("./utils/eventsHandler.js");
const {
 default: makeWASocket,
 DisconnectReason,
 downloadMediaMessage,
 useSingleFileAuthState
} = require('@adiwajshing/baileys');
const { state, saveState } = useSingleFileAuthState("./auth_info.json");

const mongoose = require('mongoose');
const config = require("./config.json");
const P = require('pino');
const brainly = require('brainly-scraper');
const fs = require('fs');
const logger = P();
const { tmpdir } = require("os");
const Crypto = require("crypto");
const ff = require('fluent-ffmpeg');
const webp = require("node-webpmux");
const path = require("path");

const Player = require("./models/PlayerSchema");
const format = require("./src/text.json");
const package = require("./package.json");

mongoose.connect(config.mongo).then((connected) => {
 console.log(`Connected With Zxra Database`)
}), { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: true };

async function connectWa () {
 const sock = makeWASocket({
  printQRInTerminal: true,
  auth: state,
  logger: P({level: "silent"})
 })
 sock.ev.on('connection.update', (update) => connectionHandler(sock, update, connectWa))
 sock.ev.on('creds.update', saveState);
 sock.ev.on('messages.upsert', async ({ messages, type }) => {

  const prefix = "+";

  console.log(messages[0])

  let msg = messages[0];
  if(msg.key.remoteJid == "status@broadcast" || msg.key.fromMe || msg.messageStubParameters || msg.message.audioMessage || msg.message.audioMessage || msg.message.stickerMessage || msg.message.protocolMessage) return
  const sender = msg.key.remoteJid;
  let id = msg.key.participant;
  if (!id) id = sender;

  let cmd = msg.message.conversation;
  if(!cmd && !msg.message.imageMessage && !msg.message.buttonsResponseMessage && msg.message.extendedTextMessage){
   cmd = msg.message.extendedTextMessage.text;
  } else if(msg.message.imageMessage && !msg.message.buttonsResponseMessage){
   cmd = msg.message.imageMessage.caption;
  } else if(msg.message.buttonsResponseMessage){
   cmd = msg.message.buttonsResponseMessage.selectedDisplayText;
  } else return

  let plyr = await Player.findOne({ userID: id });
  if (!plyr) {
   plyr = await new Player({
    _id: mongoose.Types.ObjectId(),
    userID: id
   })
   await plyr.save()
  }

  if(cmd.split("")[0] === prefix) {
   let txt = cmd.substring(1);
   let args = txt.split(" ");
   //console.log(args[0])

   let responseList = msg.message.listResponseMessage;

   switch(args[0]) {
    case "test":
     sock.sendMessage(sender, { text: "Testing Bot." })
     break;
    case "info":
     let dependencies = "";
     var module = Object.keys(package.dependencies)
     module.forEach(function(data) {
      dependencies += `-${data}\n`
     })
     sock.sendMessage(sender, { caption: `***Khyro Bot***\nBot yang dibuat oleh satu orang dan menggunakan 100% javascript\nKini sudah tersedia di Wa juga yang awalnya cuman bot discord\nNamun gara-gara banyak yang minta yaudah gw buat\n \nModul yang digunakan:\n${dependencies}\n \nSosial Media Creator\nFacebook: ${format.fb}\nGithub: ${package.author} ${format.github}\n \nVersion ${package.version}`, image: { url: "./src/img/mkx.jpg" }})
     break;
    case "p":
    case "profile":
     sock.sendMessage(sender, { text: `${messages[0].pushName}\n \nLevel ${plyr.level}\nXp ${plyr.xp}` })
     break;
    case "jadwal":
     let d = new Date();
     let days = d.getDay();
     let date = d.getDate();
     let month = d.getMonth();
     let year = d.getFullYear();

     let Day = days;
     switch(Day) {
      case 0:
       Day = "Minggu"
       break;
      case 1:
       Day = "Senin"
       break;
      case 2:
       Day = "Selasa"
       break;
      case 3:
       Day = "Rabu"
       break;
      case 4:
       Day = "Kamis"
       break;
      case 5:
       Day = "Jumat"
       break;
      case 6:
       Day = "Sabtu"
       break;
     }
     switch(month) {
      case 0:
       month = "Januari"
       break;
      case 1:
       month = "Februari"
       break;
      case 2:
       month = "Maret"
       break;
      case 3:
       month = "April"
       break;
      case 4:
       month = "Mei"
       break;
      case 5:
       month = "Juni"
       break;
      case 6:
       month = "Juli"
       break;
      case 7:
       month = "Agustus"
       break;
      case 8:
       month = "September"
       break;
      case 9:
       month = "Oktober"
       break;
      case 10:
       month = "November"
       break;
      case 11:
       month = "Desember"
       break;
     }

     let jadwal = `Jadwal Hari Ini:\n${Day},${date} ${month} ${year}\n \n`;
     if(!args[1] || !format.jadwal[args[1]]) {
      sock.sendMessage(sender, { text: "Kelas mana?" })
     } else {
      format.jadwal[args[1]][days].forEach(function(data) {
       jadwal += `${data}\n`;
      })
      sock.sendMessage(sender, { text: jadwal })
     }
     break;
    case "help":
    case "menu":
     let list = "";
     format.cmd.forEach(function(data){
      Object.keys(data).forEach(function(sdata) {
       list += `\n┟━━━━ 『 *${sdata}* 』`
       data[sdata].forEach(function(ddata) {
        list += `\n┟  ${ddata}`
       })
      })
     })
     let menuText = format.menu.replace("%s", list).replace("%a", package.version).replace("%d", package.description);
     const buttons = [
      {
       buttonId: '0',
       buttonText: { displayText: '+info'},
       type: 1
      }
     ]
     const buttonMessage = {
      text: menuText,
      footer: package.author,
      buttons: buttons,
      headerType: 1
     }
     sock.sendMessage(sender, buttonMessage)
     break;
    case "Sticker":
    case "Stiker":
    case "sticker":
    case "stiker":
     let buffer = await downloadMediaMessage(msg, "buffer", {}, {logger} );

     buffer = await writeExifImg(buffer, {packname: "Khyro Bot", author: "Khyro"})
     sock.sendMessage(sender, {sticker: {url: buffer} })
     break;
    case "brainly":
     let soal = txt.replace("brainly ", "");
     let jawaban = `Pencarian dari soal ${soal}:\n \n`;
     let jawabKe = ``;
     brainly(soal).then(res => {
      res.data.forEach(function(data) {
       data.jawaban.forEach(function(sdata) {
        jawabKe++
        jawaban += `Pencarian ${jawabKe}).\n*${data.pertanyaan}*\nJawab:\n${sdata.text}\n \n`
       })
      })
      sock.sendMessage(sender, { text: jawaban })
     })
     break;
    case "bot":
     let vcard = 'BEGIN:VCARD\n'
                 + 'VERSION:3.0\n'
                 + 'FN:Khyro Bot\n'
                 + 'N:Khyro Bot;;;\n'
                 + 'TEL;type=CELL;type=VOICE;waid=6283899161015:+62 838-9916-1015\n'
                 + 'END:VCARD'
     sock.sendMessage(sender, { contacts: { displayName: "Khyro Bot", contacts: [{vcard}]}})
     break;
    case "google":
     break;
    case "rng":
     let rng = Math.floor(Math.random() * Number(args[1]) );
     sock.sendMessage(sender, { text: `┎━━━━『 *Random Number Generator* 』\n╽\n╽    Didapatkan nilai *${rng}*\n╽    Dari ${args[1]}\n╽\n┕━━━━━━━━━━━━━━━━━━━━` })
     break;
    case "remind":
    case "reminder":
     sock.sendMessage(sender, { text: "Set Reminder" })
     let remindText = txt.replace(`${args[0]} ${args[1]} `, "")
     let remind = args[1];
     if(remind.includes("m")) {
      remind = Math.floor(60000 * Number(remind.replace("m", "")));
     } else if(remind.includes("h") || remind.includes("j")) {
      remind = Math.floor(3600000 * Number(remind.replace("h", "").replace("j", "")));
     } else if(remind.includes("d") || remind.includes("s")) {
      remind = Math.floor(1000 * Number(remind.replace("d", "").replace("s", "")));
     } else {
      remind = Number(remind)
     }

     setTimeout(function() {
      sock.sendMessage(sender, { text: remindText })
     }, remind)

     break;
    case "owner":
     let owner = 'BEGIN:VCARD\n'
                 + 'VERSION:2.0\n'
                 + 'FN:CrzxaExe3\n'
                 + 'ORG:Crzx;\n'
                 + 'TEL;type=CELL;type=VOICE;waid=62895392851501;+62 8953-9285-1501\n'
                 + 'END:VCARD'
     sock.sendMessage(sender, { contacts: { displayName: "Crzx(Owner Bot)", contacts: [{owner}] }})
     break;
   }
  }
 })
}

function timeConverter(data, text) {
 if(data.includes("m")) {
  data = Math.floor(60000 * Number(data.replace("m", "")));
 } else if(data.includes("h") || data.includes("j")) {
  data = Math.floor(3600000 * Number(data.replace("h", "").replace("j", "")));
 } else if(data.includes("d") || data.includes("s")) {
  data = Math.floor(1000 * Number(data.replace("d", "").replace("s", "")));
 } else {
  data = Number(data)
 }
 return data
}

async function imageToWebp (media) {

    const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`)

    fs.writeFileSync(tmpFileIn, media)

    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })

    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    return buff
}

async function writeExifImg (media, metadata) {
    let wMedia = await imageToWebp(media)
    const tmpFileIn = path.join("./src/stiker", `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join("./src/stiker", `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)

    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { "sticker-pack-id": `https://github.com/DikaArdnt/Hisoka-Morou`, "sticker-pack-name": metadata.packname, "sticker-pack-publisher": metadata.author, "emojis": metadata.categories ? metadata.categories : [""] }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

connectWa()
