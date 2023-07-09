const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require("fs")

module.exports = {
    fallback:true,
    run:async(data) => {
        let {command,message,ig,text} = data
        let imageDirectories = fs.readdirSync(`./media`,{encoding:"utf-8"})
        if(!imageDirectories.includes(command)){
          return await ig.realtime.direct.sendText({text:"Command Not Found",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
        }
        let imagePath = `./media/${imageDirectories.find(i => i==command)}/`
        let images = fs.readdirSync(imagePath,{encoding:"utf-8"})
        imagePath = imagePath +  images[Math.floor(Math.random() * images.length)]
        let resultantImage = await addTextToImage(imagePath,text)
        try{
          await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:resultantImage})
        }catch(err){
          await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:resultantImage})
        }
          
    }
}
async function addTextToImage(imagePath, text) {
    const image = await loadImage(imagePath);
    registerFont(`./Montserrat.ttf`,{family:"custom"})

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
  
    ctx.drawImage(image, 0, 0);
  
    let fontSize = Math.floor(canvas.width * 0.1);;
    const fontFamily = 'custom';

    const wrapText = (text, maxWidth) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];
      
        words.forEach((word) => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
      
          if (testWidth > maxWidth) {
            lines.push(line);
            line = word + ' ';
          } else {
            line = testLine;
          }
        });
      
        lines.push(line);
        return lines.join('\n');
    }

  
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
  
    ctx.font = `bold ${fontSize}px ${fontFamily}`;

    let wrappedText = wrapText(text,canvas.width - 100)
    
    const measureTextHeight = () => {
      const lines = wrappedText.split('\n');
      const lineHeight = fontSize + 4; // Adjust line height as needed
      return lines.length * lineHeight;
    }
  
    let textHeight = measureTextHeight();
  
    // Reduce the font size until the text fits within the image height
    while (textHeight > (canvas.height - 50)) {
      fontSize--;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      wrappedText = wrapText(text, canvas.width - 100);
      textHeight = measureTextHeight();
    }

    let strokeSize = Math.floor(fontSize * 0.07)

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = strokeSize;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    


    const lines = wrappedText.split('\n');
    const lineHeight = fontSize + 4; // Adjust line height as needed
    // Calculate vertical position to center the text
    textHeight = lines.length * lineHeight;
    const verticalOffset = (canvas.height - textHeight) / 2 + lineHeight / 2;

    lines.forEach((line, index) => {
        const yPos = verticalOffset + index * lineHeight;
        ctx.fillText(line, centerX, yPos);
        ctx.strokeText(line, centerX, yPos);
    });

    const buffer = canvas.toBuffer("image/jpeg");
  
    return buffer;
}
