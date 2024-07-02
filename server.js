const express = require("express");
const app = express();
const cookie = require("cookie")
const mysql = require("mysql2");
const multer = require("multer");
const upload = multer();
const fs = require("fs");
const bodyparser = require("body-parser")
const httpTextLocation = __dirname + "\\http_text\\"

let connection;

/////////////////////////////////
//////IMPORTED CUSTOM MODULES////
/////////////////////////////////
const { handleWebSocketConnections } = require("./server_scripts/websocket_main");
const { loginUser } = require("./server_scripts/user_login");
const { registerUser } = require("./server_scripts/user_signup");
const { authenticateUser } = require("./server_scripts/authenticate");
// const { MySQLConnectionManager } = require("./server_scripts/try_conn");
/////////////////////////////////
/////////////////////////////////
/////////////////////////////////


app.use(express.static(__dirname + "/public"));
app.use(bodyparser.urlencoded(
    {
        extended: false,
    }
));
app.use(bodyparser.json(
    {
        limit: "25mb"
    }
));
app.use((_req, res, next) => {
    res.setHeader("Access-Content-Allow-Origin", "http://localhost:5000/*");
    next();
});

let clients;

app.listen(5000, () => {
    console.log("Listening on PORT 5000...");
    connection = mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: "",
        database: "test"
    });
    connection.connect((error) => {
        if (error) {
            console.log("FAILED TO CONNECT TO MY_SQLSERVER");
            console.log(error);
        } else {
            console.log("Connected to MySql Server...");
            clients = new Map();
            handleWebSocketConnections(clients, connection, httpTextLocation);
        }
    })
    connection.on("end", () => {
        console.log("connection is in closed state");
    })
})


// GET ROUTE FOR MESSAGES/CHATS HTML
app.get("/messagesInnerHTML", (_req, res) => {
    console.log("XMLHttp request made for chat.html");
    sendInnerHTML("chat.html", res);
}
)

// GET ROUTE FOR FEED POSTS INNER HTML
app.get("/feedPostsInnerHTML", (req, res) => {

})

//GET ROUTE FOR MAIN PAGE INNER HTML
app.get("/mainPageInnerHTML", (_req, res) => {
    console.log("XMLHttp request made for mainPage.html");
    sendInnerHTML("main_page.html", res);
})

//GET ROUTE FOR LOGIN PAGE
app.get("/logInPageInnerHTML", (_req, res) => {
    console.log("XMLHttp request made for loginpage.html");
    sendInnerHTML("login_form.html", res);
})

//GET ROUTE FOR SIGNUP PAGE
app.get("/signUpPageInnerHTML", (_req, res) => {
    console.log("XMLHttp request made for signup.html");
    sendInnerHTML("signup_form.html", res);
})

//GET ROUTE FOR POST UPLOAD HTML
app.get("/imageUploadInnerHTML", (_req, res) => {
    console.log("XMLHttp request made for upload_area.html");
    sendInnerHTML("upload_area.html", res);
})


const sendInnerHTML = (pageName, res) => {
    fs.readFile("./html_pages/" + pageName,
        {
            encoding: "utf-8",
            flag: "r"
        }, (err, data) => {
            if (err) {
                console.log("Failed to read html_file %s", pageName);
                res.send(JSON.stringify(
                    {
                        status: 300,
                        messageText: "There was an error fetching your page"
                    }
                ))
            } else {
                console.log("Sending innerHTML of %s", pageName);
                res.send(data)
            }
        }
    )
}

// GET ROUTE FOR POST IMAGES

app.get("/postImage/:postID", (req, res) => {
    console.log("user has made postimage request");
    const postID = req.params.postID;
    const fetchImageBlobQuery = `SELECT post_image FROM posts WHERE post_id=${postID};`;
    console.log(fetchImageBlobQuery);
    connection.query(fetchImageBlobQuery, (error, result) => {
        if (error) {
            console.log("Error in fetchImageBlobQuery");
            console.log(error);
            return;
        }
        console.log(result[0]);
        const base64Image = result[0]["post_image"].toString("utf8");
        console.log(base64Image.substring(1, 50));
        res.json(
            {
                postImage: base64Image
            }
        )

    })
})


app.post("/uploadPost", upload.none(), async (req, res) => {
    console.log("Received Image to Upload.");
    const imageCaption = req.body["imageCaption"];
    let imageBlob = req.body["base64Image"];
    let seltzer = cookie.parse(req.headers.cookie || "")["seltzer"];
    let username = cookie.parse(req.headers.cookie || "")["username"];
    const isValid = await authenticateUser(seltzer, username, connection);
    if (!isValid) {
        return;
    }
    if (imageBlob.length < 1000) {
        return;
    }
    else {
        console.log("image blob received.");
        imageBlob = imageBlob.replaceAll('"', '\\"');
    }
    // let username, password;
    let postInsertionQuery = `INSERT INTO posts (post_image, post_caption, post_date, post_user) VALUE ("${imageBlob}", "${imageCaption}", NOW(), (SELECT user_id FROM cookies WHERE seltzer="${seltzer}"));`
    // console.log(postInsertionQuery);
    // return
    connection.query(postInsertionQuery, (error) => {
        if (error) {
            console.log("Error during photo upload...");
            console.log(error);
            return;
        }
        res.send({
            status: 200,
            message: "Post Was Uploaded Successfully!"
        })
    })
})


app.post("/signup", upload.none(), (req, res) => {
    registerUser(req, res, connection);
})

app.post("/login", upload.none(), (req, res) => {
    console.log("login post request has been made");
    loginUser(req, res, connection, clients);
})


//DIRECT HTML PAGE RENDERING PATHS
//THESE WILL BE PASSED AS FLAGS MAYBE?
//NOT IMPORTANT RIGHT NOW. FOCUS ON
//CREATING A PROPER POST ELEMENT IN
//A USER FEED.


// MAIN GET ROUTE FOR WEBAPP HTML
app.get("*", (_req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})