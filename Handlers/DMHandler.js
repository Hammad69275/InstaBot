const axios = require("axios").default
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const config = require("../config.json")

module.exports = {
    run: async (data) => {
        let {ig,message} = data
        let isSongRequest = await new Promise((resolve,reject) => {
            const handler = (msg) => {
                if(msg.message.op == `add` && msg.message.thread_id == message.message.thread_id && msg.message.item_type == `text`){
                    if(msg.message.text.toLowerCase() !== `find song`) return
                    ig.realtime.off(`message`,handler)
                    resolve(true)
                }
            }
            ig.realtime.on(`message`, handler)
            setTimeout(() => {
                ig.realtime.off(`message`,handler)
                resolve(false)
            }, 2000);  
        })

        const sendVideo = async (clip) => {
            let video = clip.video_versions[0]
            if(isSongRequest){
                let audioURL = clip.clips_metadata?.original_sound_info?.progressive_download_url ||  clip.clips_metadata.music_info.music_asset_info.progressive_download_url
                let audio = await getMedia(audioURL)
                let EncodedAudio = await convertAudioToBase64(audio)
                let {data} = await axios.post(`https://shazam.p.rapidapi.com/songs/v2/detect`,EncodedAudio,{   
                headers: {
                        'content-type': 'text/plain',
                        'X-RapidAPI-Key': config.Shazam_API_Key,
                        'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
                    }
                })
                if(data.matches.length == 0) return ig.realtime.direct.sendText({text:"Song Not Found",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                return ig.realtime.direct.sendText({text:data.track.share.text,threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
            }else {
                await ig.realtime.direct.sendText({text:"Downloading Media... Please Wait A Few Minutes",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                let vid = await getMedia(video.url)
                return await ig.entity.directThread(message.message.thread_id).broadcastVideo({video:vid})
            }
        }
        const sendImage = async (image) => {
            let img = await getMedia(image.image_versions2.candidates[0].url)
            return await ig.entity.directThread(message.message.thread_id).broadcastPhoto({file:img})
        }
        if(message.message.item_type == "clip"){
            let clip = message.message.clip.clip
            return await sendVideo(clip)
        }else{
            if(message.message.item_type == "media_share"){
                if(message.message.media_share.media_type == 1){
                   let image = message.message.media_share
                   return await sendImage(image)
                }else if(message.message.media_share.media_type == 2){
                    let video = message.message.media_share
                    return await sendVideo(video)
                }else if(message.message.media_share.media_type == 8){
                    let items = message.message.media_share.carousel_media
                    let selectedItem = items.find(i => i.id == message.message.media_share.carousel_share_child_media_id)
                    if(selectedItem.media_type == 1){
                        return await sendImage(selectedItem)
                    }else if(selectedItem.media_type == 2){
                        return await sendVideo(selectedItem)
                    }
                }
            }else if(message.message.item_type == "story_share"){
                if(message.message.story_share?.title) return await ig.realtime.direct.sendText({text:"The story you sent is unavailable to me because I am not following the user",threadId:message.message.thread_id,reply:{item_id:message.message.item_id,client_context:message.message.client_context}})
                else if(message.message.story_share.media.media_type == 1){
                    let image = message.message.story_share.media
                    return await sendImage(image)
                 }else if(message.message.story_share.media.media_type == 2){
                     let video = message.message.story_share.media
                     return await sendVideo(video)
                 }
            }

        }
    }
}


async function getMedia(url){
    let img = await axios.get(url,{responseType:"arraybuffer"})
    return img.data
}

// Code generated with ChatGPT (I had to modify most of it though for it to actual work lol)

function convertAudioToBase64(arrayBuffer) {

  let name = `./tmp/${Date.now()}`
  // Convert ArrayBuffer to Buffer
  const buffer = Buffer.from(arrayBuffer);

  // Save the Buffer to a temporary WAV file
  fs.writeFileSync(`${name}.wav`, buffer);

  return new Promise((resolve, reject) => {
    // Convert the WAV file to raw format using fluent-ffmpeg
    ffmpeg(`${name}.wav`)
    .format(`s16le`)
    .audioCodec(`pcm_s16le`)
    .audioFrequency(44100)
    .audioChannels(1)
    .duration(`00:00:05.000`)
    .output(`${name}.raw`)
      .on('end', () => {
        try {
          // Read the converted raw audio file
          const convertedBuffer = fs.readFileSync(`${name}.raw`);

          // Convert the audio data to Base64
          const base64Data = convertedBuffer.toString('base64');

          // Delete the temporary files
          fs.unlinkSync(`${name}.wav`);
          fs.unlinkSync(`${name}.raw`);

          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      })
      .run();
  });
}