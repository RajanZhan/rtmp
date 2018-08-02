const { NodeMediaServer } = require('node-media-server');
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 60,
    ping_timeout: 30
  },
  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*'
  },
  trans: {
    ffmpeg: 'H:/app/ffmpeg/bin/ffmpeg.exe',
    tasks: [
      {
        app: 'live',
        ac: 'aac',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  }
};

var nms = new NodeMediaServer(config)
nms.run();


// const { NodeMediaCluster } = require('node-media-server');
// const numCPUs = require('os').cpus().length;
// const config = {
//   rtmp: {
//     port: 1935,
//     chunk_size: 600000,
//     gop_cache: true,
//     ping: 60,
//     ping_timeout: 30
//   },
//   http: {
//     port: 8000,
//     allow_origin: '*'
//   },
//   cluster: {
//     num: 3
//   },
//    trans: {
//     ffmpeg: 'H:/app/ffmpeg/bin/ffmpeg',
//     tasks: [
//       {
//         app: 'live',
//         ac: 'aac',
//         hls: true,
//         hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
//         dash: true,
//         dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
//       }
//     ]
//   }
// };

// var nmcs = new NodeMediaCluster(config)
// nmcs.run();