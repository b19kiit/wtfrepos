var fs = require('fs');
var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "werwerwer",
    database: "videodb"
});
  
  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    fs.readFile("./setup/videodbsetup.json", "utf8", (err, data)=>{
      if(err) console.log(err);
      const sql = JSON.parse(data);
      for(var i=0; i<sql.length; i++){
        con.query(sql[i], function (err, result) {
          if (err) {console.log(err);return;}
          console.log(result);
        });
      }
    })
  });