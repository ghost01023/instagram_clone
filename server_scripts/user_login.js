const { sendOnlineStatus } = require("./websocket_main")


const loginUser = async (req, res, connection, clients) => {
    console.log("inside loginUser");
    console.log(req.body);
    // console.log(req);
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
            console.log("calling sendOnlineStatus() from inside loginUser()");
            sendOnlineStatus(usernameEmail, clients, connection);
        }
    })
}


const checkLoginCredentials = (usernameEmail, password, connection) => {
    const checkCredentialsQuery = `SELECT CASE WHEN COUNT(*)=1 THEN "true" ELSE "false" END AS validCredentials FROM users WHERE (username="${usernameEmail}" OR email="${usernameEmail}") AND password="${password}";`;
    console.log(checkCredentialsQuery);
    connection.c
    return new Promise((resolve) => {
        try {
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
        }
        catch (e) {
            console.log(e);
        }
    })
}


module.exports = { loginUser }