const { createCanvas, loadImage } = require('canvas');
const youtubesearchapi = require("youtube-search-api");
const axios = require("axios").default

module.exports = {
    name:"youtube",
    replyOnly:true,
    run:async(data) => {
        let {ig,message,text} = data
        let image = message.message?.replied_to_message?.media.image_versions2?.candidates[0].url
        if(!image) return ig.realtime.direct.sendText({text:"You need to reply to an image in order to use this command",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        let arg = text.substring(1).replace("!youtube","")?.match(/(['"])(?:(?!\1|\\).|\\.)*\1/g) || []
        let channel = arg[0]?.replace(/"/g,"")
        let title = arg[1]?.replace(/"/g,"")
        if(!channel) return ig.realtime.direct.sendText({text:"Youtube channel not found",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        if(!title) return ig.realtime.direct.sendText({text:"No video title given",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        channel = await youtubesearchapi.GetListByKeyword(channel,false,10,[{type:"channel"}])
        if(channel?.items?.length < 1)return ig.realtime.direct.sendText({text:"Youtube channel not found",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        channel = channel.items[0]
        let thumbnail = await getMedia(channel.thumbnail.thumbnails[0].url)
        channel = {
            name:channel.title,
            pfp:thumbnail
        }
        let targetImage = await getMedia(image)
        let generateImage = await editImage(targetImage,title,channel)
        try{
            await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:generateImage})
        }catch(err){
            await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:generateImage})
        }
    }
}
async function getMedia(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return img.data
}
async function editImage(targetImage,text,channel){

    let image = await loadImage(`./tmp/template.PNG`)
    let canvas = createCanvas(image.width,image.height)
    let ctx = canvas.getContext(`2d`)

    const wrapText = (text, maxWidth) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        let done = false
      
        words.forEach((word, index) => {
          if(done) return
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
      
          if (testWidth > maxWidth) {
            if (lines.length === 1) {
              done = true
              line += '...';
            }
            lines.push(line);
            line = word + ` `
            return;
          }
      
          line = testLine;
      
          if (lines.length === 1 && ctx.measureText(line + words[index + 1] + '...').width > maxWidth) {
            lines.push(line + '...');
            done = true
            return;
          }
        });
      
        if (lines.length < 2) {
          lines.push(line);
        }
        return lines;
      };
      
    ctx.drawImage(image,0,0);

    let overlay = await loadImage(targetImage)

    let destX = 15;   // X-coordinate of the destination canvas
    let destY =15;   // Y-coordinate of the destination canvas
    let destW = canvas.width-30
    let destH = canvas.height-106
    let radius = 16

    ctx.save()

    ctx.beginPath();
    ctx.moveTo(destX + radius, destY);
    ctx.lineTo(destX + destW - radius, destY);
    ctx.quadraticCurveTo(destX + destW, destY, destX + destW, destY + radius);
    ctx.lineTo(destX + destW, destY + destH - radius);
    ctx.quadraticCurveTo(destX + destW, destY + destH, destX + destW - radius, destY + destH);
    ctx.lineTo(destX + radius, destY + destH);
    ctx.quadraticCurveTo(destX, destY + destH, destX, destY + destH - radius);
    ctx.lineTo(destX, destY + radius);
    ctx.quadraticCurveTo(destX, destY, destX + radius, destY);
    ctx.closePath();
    
    ctx.clip()

    ctx.drawImage(overlay,0,0,overlay.width,overlay.height,destX,destY,destW,destH)
    
    ctx.restore()

    let pfp = await loadImage(channel.pfp)

    radius = 14

    const centerX = (canvas.width / 2) - 122; // X-coordinate of the center of the canvas
    const centerY = (canvas.height / 2) + 63; 
    
    const scale = Math.max(radius * 2 / pfp.width, radius * 2 / pfp.height); // Scale factor
    const scaledWidth = pfp.width * scale;
    const scaledHeight = pfp.height * scale;
    const offsetX = centerX - scaledWidth / 2; // X-coordinate of the top-left corner of the scaled image
    const offsetY = centerY - scaledHeight / 2; // Y-coordinate of the top-left corner of the scaled image
  
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(pfp, offsetX, offsetY, scaledWidth, scaledHeight)
    ctx.restore()

    ctx.font = `bold 12px Roboto`
    ctx.fillStyle = `#f1f1f1`

    let wrappedText = wrapText(text,canvas.width - 75)

    ctx.fillText(wrappedText.join("\n"),centerX+25,centerY)

    ctx.font = `10px Roboto`

    ctx.fillStyle = `#aaa`
    ctx.fillText(channel.name,centerX+25,wrappedText.length > 1 ? centerY + 35 : centerY + 15)
    let Suffixes = ["K","M"]
    ctx.fillText(`${Math.floor(Math.random() * 100) + 1}${Suffixes[Math.floor(Math.random() * Suffixes.length)]} views • ${Math.floor(Math.random() * 24) + 1} hours ago`,centerX+25,wrappedText.length > 1 ? centerY + 49:centerY + 29)

    ctx.fillStyle = `rgba(0, 0, 0, 0.8)`
    
    ctx.beginPath();

    ctx.roundRect((canvas.width / 2) + 106,(canvas.height / 2)+22,27,15,2)
    ctx.fill();

    ctx.fillStyle = `#FFFFFF`
    ctx.font = `bold 9px Roboto`

    ctx.fillText(`${Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60) + 1}`,(canvas.width / 2) + 108,(canvas.height / 2)+33)
    
    let buffer = canvas.toBuffer(`image/jpeg`)
    return buffer
}