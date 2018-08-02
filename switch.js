var ffmpeg = require('fluent-ffmpeg');
var inputPath = 'rtmp://live.hkstv.hk.lxdns.com/live/hks';
var outputPath = 'rtmp://video-center.alivecdn.com/pf/test?vhost=v.52ds.club&auth_key=1626013844-0-0-3702716987cb4f3635de3529289dcf43';
const cluster = require("cluster");
const fs = require("fs");


let cmd = `ffmpeg -i rtmp://live.hkstv.hk.lxdns.com/live/hks -r 30 -an -s 1280x720 -f flv "rtmp://video-center.alivecdn.com/pf/test?vhost=v.52ds.club&auth_key=1626013844-0-0-3702716987cb4f3635de3529289dcf43"`


if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // 仅作为测试
    // var http = require('http');
    // // 创建http server，并传入回调函数:
    // var server = http.createServer(function (request, response) {
    //     // 回调函数接收request和response对象,
    //     // 获得HTTP请求的method和url:
    //     console.log(request.method + ': ' + request.url);
    //     // 将HTTP响应200写入response, 同时设置Content-Type: text/html:
    //     response.writeHead(200, { 'Content-Type': 'text/html' });
    //     // 将HTTP响应的HTML内容写入response:
    //     response.end(fs.readFileSync("./player.html").toString());
    // });

    // // 让服务器监听8080端口:
    // server.listen(80);
    // console.log('Server is running at http://127.0.0.1:8080/');


    var cameraList = [
        {
            id: 212,
            name: "摄像机1",
           // source: "rtsp://admin:admin@192.168.3.111:554/11",
            source: "rtsp://admin:admin123@192.168.1.64:554/h264/ch1/main/av_stream",
             //source: "rtmp://live.hkstv.hk.lxdns.com/live/hks",
            dest: "rtmp://localhost/live/c1",
            s: "1280x720",
            isPush: 1,//如果 1 说明正常推流， 0 停止推流
        },
        {
            id: 213,
            name: "摄像机2",
            source: "rtmp://pull-g.kktv8.com/livekktv/100987038",
            dest: "rtmp://video-center.alivecdn.com/pf/test1?vhost=v.52ds.club&auth_key=1626080066-0-0-38fc4f12fed186cb70e571f14cf24144",
            s: "1280x720",
            isPush: 1,//如果 1 说明正常推流， 0 停止推流
        },

    ]

    var workers = new Map();
    //var cidToWorkersMap = new Map();// 摄像机id 和进程id对应关系
    var workersInfoMap = new Map();
    var cameraInfoMap = new Map();


    //启动推流子进程
    function forkWorker(info) {
        var worker = cluster.fork();
        worker.send({ code: "init", type: "down", data: info })
        worker.on('exit', (cid) => {
            console.log("子进程挂了", cid);
            // 检查 workersInfoMap 中该摄像机是否继续推流，如果继续 则需要重新启动
            let info = cameraInfoMap.get(cid);
            if (!info) {
                console.log("workersInfoMap 信息读取失败", cid);
                return;
            }

            if (info.isPush == 1) {
                // 继续推流
                forkWorker(info);
            }
            else {
                workers.delete(info.id);
            }

        });
        workers.set(info.id, worker);
        cameraInfoMap.set(info.id, info);
        //cidToWorkersMap.set(info.id, worker);

    }

    // 停止摄像机的推流 
    function stopPushByCid(cid) {
        if (cid) {
            let wid = cid;
            let info = cameraInfoMap.get(wid);
            info.isPush = 0;
            cameraInfoMap.set(wid, info);
            var worker = workers.get(wid);
            if (worker) {
                worker.send({ code: "die", type: "down", });
            }
        }
    }
    // 更新推流启动
    function updatePush() {
        for (let c of cameraList) {
            //var workerId = 1;
            var worker = workers.get(c.id);
            if (c.isPush == 1) {

                // 未启动推流，开始推流
                if (!worker) {
                    forkWorker(c);
                }

            }
            else {
                // 已经启动推流，结束推流
                if (worker) {
                    stopPushByCid(c.id);
                }
            }
        }
    }

    // 定时读取摄像机的推送状态 此处为模拟
    setInterval(() => {
        for (let i in cameraList) {
            cameraList[i].isPush = Number(fs.readFileSync("./" + cameraList[i].id + ".txt").toString());//禁止推流

        }
    }, 2 * 1000)

    // 定时更新推流状态
    setInterval(() => {
        updatePush();
    }, 3000)

} else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
    const { spawn } = require('child_process');
    var die = null; // 如果die为真，说明不需要继续推流
    var bat = null;
    var opt = null;
    var init = (opt) => {
        console.log("推流进程启动...");
        bat = spawn("ffmpeg", [
            //"-re",
            "-i",
            opt.source,
            "-r", 
            " 30",
            "-vcodec",
            "h264",
            "-b:v",
            "500k",
            "-an",
            "-s",
            opt.s,
            '-f',
            "flv",
            opt.dest
        ]);

        bat.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        var count = 0;
        bat.stderr.on('data', (data) => {
            //console.log(data.toString());
            //console.log(opt.name +"推流中...", count++);
        });

        bat.on('exit', (code) => {
            console.log(`Child exited with code ${code}`, die);
            if (die) {
                process.exit(opt.id);
            }
            else {
                init(opt);
            }
            //process.send({ code: "die", type: "up", msg: "进程退出" });
        });
        // setTimeout(function () {
        //     bat.kill('SIGTERM');
        //     console.log("模拟推流故障...");
        // }, 1000 * 5);

        // setTimeout(function () {
        //      console.log("子进程故障 《》《》...");
        //      process.exit(opt.id);

        // }, 1000 * 8);
    }

    process.on("message", (message) => {
        if (message.code == "init") {
            console.log("init worker", message);
            init(message.data);
            opt = message.data

        }
        else if (message.code == "die") {
            die = true;// 关闭该推进程
            if (bat) {
                bat.kill('SIGTERM'); // 杀死推流进程
            }
        }
        //console.log("get messafge from cluter", message);
    })
    // 定时播报推流信息
    var count = 0;
    setInterval(function () {
        if (opt) {
            console.log(`${opt.name} 转码中...`, ++count);
        }
    }, 3000);
    console.log(`Worker ${process.pid} started`);

    //const bat = spawn('cmd.exe', ['/c', 'my.bat']);


}

