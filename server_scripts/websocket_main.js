const ws = require("ws");
const fs = require("fs");
const cookie = require("cookie")

const { authenticateUser } = require("./authenticate");

let httpTextLocation;

const handleWebSocketConnections = (clients, connection, httpTextLoc) => {
    //THE CLIENT MAP IS SOLELY FOR THE PURPOSES OF SENDING BATCH STATUS REPORTS AND MESSAGES TO ONLINE USERS. IT MUST NOT BE USED AS AN AUTHENTICATION TOOL. USE authenticateUser() FOR THAT PURPOSE
    httpTextLocation = httpTextLoc;
    const wss = new ws.Server({ port: 5050 });
    console.log("WebSocket is running on PORT 5050");
    wss.on("connection", (ws, request) => {
        let seltzer = cookie.parse(request.headers.cookie || "")["seltzer"];
        let username = cookie.parse(request.headers.cookie || "")["username"];
        if (!seltzer || !username) {
            console.log("User is not identifiable...");
            ws.send(JSON.stringify(
                {
                    messageType: "verificationStatus",
                    verificationStatus: false
                }
            ));
        } else {
            //IF AUTHENTICATED(LOGGED IN) SEND ONLINE STATUS TO ALL RECENT
            //CHAT USERS
        }
        ws.on("message", (d) => {
            seltzer = cookie.parse(d["cookie"] || "")["seltzer"];
            username = cookie.parse(d["cookie"] || "")["username"];
            console.log("Your username is %s and cookie is %s", username, seltzer);
            const data = JSON.parse(d);
            switch (data["messageType"]) {
                //THIS SECTION DOES NOT REQUIRE AUTHENTICATION
                case "innerHTML": {
                    const pageName = data["pageName"];
                    switch (pageName) {
                        case "logIn": {
                            sendPage(ws, "login_form.txt", "logIn");
                        } break;
                        case "signUp": {
                            sendPage(ws, "signup_form.txt", "signUp");
                        } break;
                        case "mainPage": {
                            sendPage(ws, "main_page.txt", "mainPage");
                        } break;
                        case "userFeed": {
                            sendPage(ws, "user_feed.txt", "userFeed");
                        }
                    }
                } break;
                case "fetchPostDetails": {
                    const { postID } = data["postID"];
                    const postDetailsQuery = `SELECT * FROM posts WHERE postID="${postID}";`;
                    console.log(postDetailsQuery);
                    //SEND RESULTS
                } break;
                //THESE CASES DO REQUIRE AUTHENTICATION
                case "fetchFeedPosts": {
                    console.log("Time to see about those posts in the feed...");
                    sendFeedPosts(data, ws, connection);
                } break;
                case "uploadPost": {
                    console.log("%s wants to upload a post", username);
                    const { postImage, caption } = data["postImage"];
                    if (caption.trim().length === 0) {
                        caption = "NULL";
                    }
                    const uploadPostQuery = `INSERT INTO posts (post_caption, post_user, post_image, post_date) VALUE ("${caption}", "${username}", "${postImage}", NOW());`
                    console.log(uploadPostQuery);
                    //SEND RESULTS
                } break;
                case "searchUsers": {
                    const { usernameQuery } = data["usernameQuery"];
                    if (usernameQuery.trim().length === 0) {
                        return;
                    }
                    const searchUsersQuery = `SELECT id, username FROM users WHERE username LIKE "%usernameQuery%;`;
                    console.log(searchUsersQuery);
                    //SEND RESULTS
                } break;
                case "sendMessage": {
                    const { receiver, messageContent } = data["receiver"];
                    const sendMessageQuery = `INSERT INTO chats (message_from, message_to, message_content, message_date) VALUE ("${username}", "${receiver}", "${messageContent}", NOW());`;
                    console.log(sendMessageQuery);
                    //SEND TRUE IF SUCCESSFUL
                    //SEND NEW_MESSAGE TO RECEIVER IF CONNECTED
                } break;
                case "followUser": {
                    const { target } = data["target"];
                    const followUserQuery = `INSERT INTO follows (follower, followee) VALUE ((SELECT id FROM users WHERE username="${username}"), (SELECT id FROM users WHERE username="${target}"));`;
                    //SEND TRUE IF SUCCESSFUL
                } break;
                case "unfollowUser": {
                    const { target } = data["target"];
                    const unfollowUserQuery = `DELETE FROM follows WHERE (followee=(SELECT id FROM users WHERE username="${username}") AND follower=(SELECT id FROM uses WHERE username="${target}"));`
                    //SEND TRUE IF SUCCESSFUL
                } break;
                case "fetchImage": {
                    const { imageID } = date["imageID"];
                    const fetchImageQuery = `SELECT post_image FROM posts WHERE post_id=${imageID};`;
                    //SEND DATA IF SUCESSFUL
                    //ELSE SEND FAILURE MESSAGE (PERHAPS EVEN EXPLANATION ABOUT WHETHER IMAGE NOT FOUND (or) ERROR IN SERVER || FETCH QUERY ERROR)
                }
                //THESE SECTIONS ARE INVALID/BAD-CODED MESSAGES
                default: {
                    ws.send(JSON.stringify(
                        {
                            "messageType": "admonishment",
                            "messageContent": "Bad request made. Check your messageType, or cease the tomfoolery."
                        }
                    ));
                }
            }
        });
        ws.on("close", () => {
            //IF AUTHENTICATED, ITERATE OVER ONLINE CLIENTS CHECK IF ANY OF THEM HAD HIM IN RECENT CHATS
            //SEND HIS OFFLINE STATUS IF THEY DID

        })
    })
}


const sendPage = (clientSocket, pageName, responsePageName) => {
    fs.readFile((httpTextLocation + pageName),
        {
            encoding: "utf-8",
            flag: "r"
        }, (err, data) => {
            if (err) {
                console.log("Error opening http_text/" + pageName);
                console.log(err.toString());
            } else {
                clientSocket.send(JSON.stringify({
                    messageType: "pageInnerHTML",
                    pageName: responsePageName,
                    pageContent: data
                }))
            }
        })
}


const sendFeedPosts = (data, clientSocket, connection) => {
    console.log("Authenticating before generating feed...");
    // IF HE WANTS A FEED, HE MUST HAVE VALID COOKIES
    const documentCookie = data["cookieContent"];
    const postsOffset = data["postsOffset"];
    console.log(documentCookie);
    seltzer = cookie.parse(documentCookie)["seltzer"];
    username = cookie.parse(documentCookie)["username"];
    console.log("Seltzer is %s and username is %s from documentCookie", seltzer, username);
    //AUTHENTICATE USER
    authenticateUser(seltzer, username, connection).then(isValid => {
        if (!isValid) {
            console.log("You are not logged in");
        } else {
            console.log("Sending feed posts now");
            fetchFeedPosts(seltzer, username, postsOffset, connection).then(posts => {
                console.log("Fetched appropritate feed post details");
                console.log(posts);
                clientSocket.send(JSON.stringify(
                    {
                        "messageType": "userFeedContent",
                        "userFeedContent": posts
                    }
                ))
            })
            // ws.send(JSON.stringify(
            //     {
            //         "messageType": "userFeedStatus",
            //         "userFeedStatus": true
            //     }
            // ));
            //NOW SEND FEED POSTS VIA SOCKET
            // sendFeedPosts
        }
    })
}


const fetchFeedPosts = (seltzer, username, oldestPostID, connection) => {
    return new Promise((resolve) => {
        authenticateUser(seltzer, username, connection).then(isValid => {
            if (!isValid) {
                console.log("Cannot authenticate in fetchFeedPosts()");
                return;
            }
            const feedResponse = {
                posts: []
            }
            const fetchFeedQuery = `SELECT post_id, post_caption, post_date FROM posts INNER JOIN (SELECT followee AS user_id FROM follows WHERE follower=(SELECT id AS user_id FROM users WHERE username="${username}")) AS follow_table ON posts.post_user=follow_table.user_id ORDER BY post_id DESC LIMIT 20 OFFSET ${oldestPostID};`
            console.log(fetchFeedQuery);
            connection.query(fetchFeedQuery, (error, results) => {
                if (error) {
                    console.log(error);
                } else {
                    results.map(r => feedResponse.posts.push(r));
                    resolve(feedResponse);
                }
            })
        })
    })
}


module.exports = { handleWebSocketConnections }