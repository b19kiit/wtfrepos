var fs = require('fs');
var mysql = require('mysql');
var jwt = require('jsonwebtoken');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "werwerwer",
    database: "cityblog"
});

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var formidable = require('formidable');
var cookieParser = require('cookie-parser');
app.use(cookieParser())

var serverconfig;
fs.readFile("./setup/serverconfig.json", "utf8", (err, data)=>{
    serverconfig = JSON.parse(data);
})

/*con.connect(function(err) {
    if (err) throw err;
    console.log("DB Connected!");
    server.listen(80);
    console.log("Listening on PORT:80");
    //con.destroy();
});*/
class DB{
    constructor(callback){
        this.users = [/* {username, fullname, college, password, key:BLOB} */]
        callback()
    }
    userexists(uname){
        for(const u in this.users){
            if(this.users[u].username == uname){
                return true
            }
        }
        return false
    }
    createNewUser(uname, name, col, pass, callback){
        var key = Math.random();
        const user = {username:uname, fullname:name, college:col, password:pass, private:key+""}
        this.users.push(user);
        callback(user.private)
    }
    login(uname, pass){
        for(const u in this.users){
            if(this.users[u].username == uname){
                if(this.users[u].password == pass){
                    return {err:false, user:{username:uname, name:this.users[u].fullname, college:this.users[u].college}, private:this.users[u].private}
                }else{
                    return {err:true, errmsg:"incorrect password"}
                }
            }
        }
        return {err:true, errmsg:"no such username"}
    }
    changepass(uname, op, np){
        for(const u in this.users){
            if(this.users[u].username == uname){
                if(this.users[u].password == op){
                    this.users[u].password = np;
                    return {err:false}
                }else{
                    return {err:true, errmsg:"incorrect password"}
                }
            }
        }
    }
}
var db = new DB(()=>{
    server.listen(80);
    console.log("Listening on PORT:80");
})

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/htmls/index.html');
});
app.get('/en/\*', function (req, res) {
    res.sendFile(__dirname + '/htmls/index.html');
});

app.get('/open/\*', function (req, res) {
    res.sendFile(__dirname + '/open/' + req.url.substring(6, req.url.length));
});

io.on('connection', function (socket) {
    socket.emit("connected", {})
    socket.on("page", (req)=>{
        fs.readFile("./htmls/comp/comp.json", (err, comp)=>{
            if(err){return}
            comp = JSON.parse(comp)
            const index = comp.keys.indexOf(req.url);
            if(index>=0){
                fs.readFile(`./htmls/comp/${comp.files[index]}`, 'utf8', (err2, page)=>{
                    if(err2)return;
                    socket.emit("page", {"url":comp.url[index], "data":page});
                })
            }
            else
            socket.emit("page", {"url":":-(", "data":`Page not found`});
        })
    })

    socket.on("signup", (data)=>{
        console.log(data)
        if(data.username.length){
            if(db.userexists(data.username)){
                socket.emit("signup", {err:true, errmsg:"user name exists"}); return;
            }else{
                db.createNewUser(data.username, data.name, data.college, data.password, (res)=>{
                    jwt.sign({username:data.username, name:data.name, college:data.college}, serverconfig.PRIVATE,  { algorithm: 'HS256' }, (err, token)=>{
                        console.log(err)
                        socket.emit("signup", {JWT:token})
                        console.log(db.users)
                    });
                })
            }
        }
    })

    socket.on("login", (data)=>{
        if(data.username.length){
            var lout=db.login(data.username, data.password)
            if(lout.err){
                socket.emit("login", {err:true, errmsg:lout.errmsg})
            }else{
                console.log(lout)
                    jwt.sign({username:data.username, name:lout.user.name, college:lout.user.college}, serverconfig.PRIVATE,  { algorithm: 'HS256' }, (err, token)=>{
                        socket.emit("login", {err:false, JWT:token})
                    });
            }
        }
    })

    socket.on("profile", (data)=>{
        jwt.verify(data.JWT, serverconfig.PRIVATE, { algorithm: 'HS256' }, (err, data)=>{
            socket.emit("profile", data);
        });
    })

    socket.on("changepass", (req)=>{
        jwt.verify(req.JWT, serverconfig.PRIVATE, { algorithm: 'HS256' }, (err, data)=>{
            const res = db.changepass(data.username, req.opass, req.npass)
            socket.emit("changepass", res)
        });
    })
})