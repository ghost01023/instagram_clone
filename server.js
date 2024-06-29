const express = require("express");
const app = express();
const mysql = require("mysql2");
const bodyparser = require("body-parser")
const httpTextLocation = __dirname + "\\http_text\\"

let connection;

/////////////////////////////////
//////IMPORTED CUSTOM MODULES////
/////////////////////////////////
const { handleWebSocketConnections } = require("./server_scripts/websocket_main");

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
))

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
            const clients = new Map();
            handleWebSocketConnections(clients, connection, httpTextLocation);
        }
    })
})


// MAIN GET ROUTE
app.get(["/", ""], (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})

app.post("/signup", (req, res) => {
    registerUser(req, res, connection);
})

app.post("/login", (req, res) => {
    loginUser(req, res, connection);
})


// INLINE FUNCTIONS FOR NOW

const registerUser = (req, res, connection) => {
    // let { email, fullName, username, password } = req.body;
    // let credentails = [email, fullName, username, password];
    const credentails = Object.values(req.body).map(val => {
        console.log(val);
        val = val.trim();
        if (val.length === 0) {
            return "NULL";
        } else {
            return val;
        }
    });
    const [email, fullName, username, password] = credentails;
    let firstName = fullName;
    let middleName = null;
    let lastName = null;
    let fullNameSplit = fullName.split(" ");
    if (fullNameSplit.length === 2) {
        firstName = fullNameSplit[0];
        lastName = fullNameSplit[1];
    } else if (fullNameSplit.length === 3) {
        firstName = fullNameSplit[0];
        middleName = fullNameSplit[1];
        lastName = fullNameSplit[2];
    }
    const registerUserQuery = `INSERT INTO users (email, first_name, middle_name, last_name, username, password) VALUE ("${email}","${firstName}","${middleName}","${lastName}","${username}", "${password}");`;
    console.log(registerUserQuery);
    connection.query(registerUserQuery, (error) => {
        if (error) {
            console.log(error);
            res.send(JSON.stringify(
                {
                    registerStatus: false
                }
            ));
        } else {
            console.log("User was successfully registered");
            res.send(JSON.stringify(
                {
                    registerStatus: true
                }
            ))
        }
    });
}

const loginUser = async (req, res, connection) => {
    console.log(req.body);
    const { usernameEmail, password } = req.body;
    let validCredentials = await checkLoginCredentials(usernameEmail, password, connection);
    if (!validCredentials) {
        res.send(JSON.stringify(
            {
                "loginStatus": false
            }
        ));
        return;
    }
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&'()*+,-./:<=>?@[]^_`{|}~";
    let result = '';
    for (let i = 0; i < 50; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log("Generated Session Cookie for %s is %s", usernameEmail, result);
    const cookieInsertionQuery = `INSERT INTO cookies (seltzer, user_id) VALUE ("${result}", (SELECT id FROM users WHERE (username="${usernameEmail}" OR email="${usernameEmail}")));`;
    connection.query(cookieInsertionQuery, (error) => {
        if (error) {
            console.log(error);
            res.send(
                {
                    "status": 300,
                    "loginStatus": false
                }
            );
        } else {
            res.cookie("seltzer", result, {
                // "httpOnly": true,
                "sameSite": 'strict'
            });
            res.cookie("username", usernameEmail, {
                "httpOnly": false,
                "sameSite": 'strict'
            })
            //SET seltzer and username IN SOCKET HERE
            res.send(JSON.stringify(
                {
                    "loginStatus": true
                }
            ))
        }
    })
}


const checkLoginCredentials = (usernameEmail, password, connection) => {
    const checkCredentialsQuery = `SELECT CASE WHEN COUNT(*)=1 THEN "true" ELSE "false" END AS validCredentials FROM users WHERE (username="${usernameEmail}" OR email="${usernameEmail}") AND password="${password}";`;
    console.log(checkCredentialsQuery);
    return new Promise((resolve) => {
        connection.query(checkCredentialsQuery, (error, result) => {
            if (error) {
                console.log(error);
            } else {
                console.log(result);
                validity = result[0]["validCredentials"];
                if (validity === "true") {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        })
    })
}