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
    wss.on("connection", async (ws, request) => {
        console.log("Clients are now...");
        for (let [key] in clients) {
            console.log(key);
        }
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
            return;
        }
        let isAuthenticated = await authenticateUser(seltzer, username, connection);
        console.log("AUTHENTICATION STATUS IS %s", isAuthenticated);
        if (!isAuthenticated) {
            ws.send(JSON.stringify(
                {
                    messageType: "verificationStatus",
                    verificationStatus: false
                }
            ));
            return;
        } else {
            if (!clients.get(username)) {
                clients.set(username);
            }
            sendOnlineStatus(username, clients, connection);
        }
        ws.on("message", async (d) => {
            isAuthenticated = await authenticateUser(seltzer, username, connection);
            console.log("Received a message [%s] from websocket", JSON.parse[d]);
            const data = JSON.parse(d);
            seltzer = cookie.parse(data["cookieContent"] || "")["seltzer"];
            username = cookie.parse(data["cookieContent"] || "")["username"];
            switch (true) {
                case ["fetchFeedPosts", "verificationStatus", "uploadPost", "likePost", "searchUsers", "sendMessage", "followUser", "unFollowUser", "fetchImage", "fetchChat", "pingOnline", "allRecentChats"].includes(data["messageType"]): {
                    switch (data["messageType"]) {
                        case "verificationStatus": {
                            console.log("%s ASKED FOR VERIFICATION STATUS", username);
                            ws.send(JSON.stringify(
                                {
                                    "messageType": "verificationStatus",
                                    "verificationStatus": true
                                })
                            );
                        }
                        case "allRecentChats": {
                            console.log("Fetching all recent chats for %s", username);
                        } break;
                        case "fetchFeedPosts": {
                            console.log("Time to see about those posts in the feed...");
                            const { oldestPostID } = data;
                            sendFeedPosts(username, oldestPostID, ws, connection);
                        } break;
                        case "uploadPost": {
                            console.log("%s wants to upload a post", username);
                            const { postImage, caption } = data;
                            if (caption.trim().length === 0) {
                                caption = "NULL";
                            }
                            const uploadPostQuery = `INSERT INTO posts (post_caption, post_user, post_image, post_date) VALUE ("${caption}", "${username}", "${postImage}", NOW());`
                            console.log(uploadPostQuery);
                            //SEND RESULTS
                        } break;
                        case "searchUsers": {
                            const { usernameQuery } = data;
                            if (usernameQuery.trim().length === 0) {
                                return;
                            }
                            const searchUsersQuery = `SELECT id, username FROM users WHERE username LIKE "%usernameQuery%;`;
                            console.log(searchUsersQuery);
                            //SEND RESULTS
                        } break;
                        case "sendMessage": {
                            const { receiver, messageContent } = data;
                            const sendMessageQuery = `INSERT INTO chats (message_from, message_to, message_content, message_date) VALUE ("${username}", "${receiver}", "${messageContent}", NOW());`;
                            console.log(sendMessageQuery);
                            //SEND TRUE IF SUCCESSFUL
                            //SEND NEW_MESSAGE TO RECEIVER IF CONNECTED
                        } break;
                        case "followUser": {
                            const { target } = data;
                            const followUserQuery = `INSERT INTO follows (follower, followee) VALUE ((SELECT id FROM users WHERE username="${username}"), (SELECT id FROM users WHERE username="${target}"));`;
                            //SEND TRUE IF SUCCESSFUL
                            connection.query(followUserQuery, (error, result) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    ws.send(
                                        JSON.stringify(
                                            {
                                                "messageType": "followedUser",
                                                "target": target
                                            }
                                        )
                                    )
                                }
                            })
                        } break;
                        case "unFollowUser": {
                            const { target } = data;
                            console.log("request to unfollow user");
                            const unfollowUserQuery = `DELETE FROM follows WHERE (followee=(SELECT id FROM users WHERE username="${target}") AND follower=(SELECT id FROM users WHERE username="${username}"));`
                            console.log(unfollowUserQuery);
                            //SEND TRUE IF SUCCESSFUL
                            connection.query(unfollowUserQuery, (error, result) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    ws.send(
                                        JSON.stringify(
                                            {
                                                "messageType": "unFollowedUser",
                                                "target": target
                                            }
                                        )
                                    )
                                }
                            })
                        } break;
                        case "likePost": {
                            const { postID } = data;
                            const likePostQuery = `INSERT INTO likes (liker, post_id) VALUE ((SELECT id FROM users WHERE username="${username}"), ${postID});`;
                        }
                        case "fetchImage": {
                            const { imageID } = data;
                            const fetchImageQuery = `SELECT post_image FROM posts WHERE post_id=${imageID};`;
                            connection.query(fetchImageQuery, (error, result) => {
                                if (error) {
                                    console.log("Could not fetch imageBufferData");
                                    console.log(error);
                                } else {
                                    console.log("Image successfully fetched. Transferring to user...");
                                    const base64FormatImage = result[0]["post_image"].toString("utf8");
                                    res.json({
                                        image: base64FormatImage
                                    })
                                }
                            })
                            //SEND DATA IF SUCESSFUL
                            //ELSE SEND FAILURE MESSAGE (PERHAPS EVEN EXPLANATION ABOUT WHETHER IMAGE NOT FOUND (or) ERROR IN SERVER || FETCH QUERY ERROR)
                        } break;
                        case "fetchChat": {
                            const { target, oldestMessageID } = data;
                            const fetchedChat = await fetchChat(username, target, oldestMessageID, connection);
                            ws.send(JSON.stringify(
                                {
                                    "messageType": "fetchedChat",
                                    "target": target,
                                    "chats": fetchedChat
                                }
                            ));
                        } break;
                        case "pingOnline": {
                            console.log("User pingedOnline()");
                            if (ws.readyState == ws.CONNECTING || ws.readyState == ws.OPEN) {
                                clients.set(username, ws);
                            }
                            sendOnlineStatus(username, clients, connection, online = true);
                        }
                    }
                } break;
                //THESE SECTIONS ARE INVALID/BAD-CODED MESSAGES
                default: {
                    ws.send(JSON.stringify(
                        {
                            "messageType": "admonishment",
                            "requestMessageType": data["messageType"],
                            "messageContent": "Bad request made. Check your messageType, or cease the tomfoolery."
                        }
                    ));
                }
            }
        });
        ws.on("close", () => {
            console.log("Socket connection terminated.");
            clients.delete(username);
            sendOnlineStatus(username, clients, connection, false);
            //temporarily for debugging purposes
            // connection.query(`DELETE FROM cookies WHERE user_id=(SELECT id FROM users WHERE username="${username}");`, (error, result) => {
            //     if (error) {
            //         console.log(error);
            //     }
            // });
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


const sendFeedPosts = (username, oldestPostID, clientSocket, connection) => {
    console.log("Sending feed posts now");
    fetchFeedPosts(username, oldestPostID, connection).then(posts => {
        console.log("Fetched appropritate feed post details");
        console.log(posts);
        clientSocket.send(JSON.stringify(
            {
                "messageType": "userFeedContent",
                "userFeedContent": posts
            }
        ))
    })
}


const fetchFeedPosts = (username, oldestPostID, connection) => {
    return new Promise((resolve) => {
        const fetchFeedQuery = `SELECT post_id, (SELECT COUNT(*) FROM likes WHERE likes.post_id=posts.post_id) AS total_likes, post_caption, (SELECT username FROM users WHERE id=post_user) AS post_username, post_date FROM posts INNER JOIN (SELECT followee AS user_id FROM follows WHERE follower=(SELECT id AS user_id FROM users WHERE username="${username}")) AS follow_table ON posts.post_user=follow_table.user_id WHERE post_id > ${oldestPostID} ORDER BY post_id DESC LIMIT 20;`
        console.log(fetchFeedQuery);
        connection.query(fetchFeedQuery, (error, results) => {
            if (error) {
                console.log(error);
            } else {
                resolve(results);
            }
            //  else {
            //     results.map(r => feedResponse.posts.push(r));
            //     resolve(feedResponse);
            // }
        })
    })
}


// CHAT WITH ONE USER
const fetchChat = (username, target, oldestMessageID, connection) => {
    const fetchChatQuery = `
                    WITH userID AS (SELECT id FROM users WHERE username="${username}"), targetID AS (SELECT id FROM users WHERE username="${target}") SELECT message_content, message_date, chat_id, CASE WHEN message_from=(SELECT id FROM userID) THEN "self" ELSE "friend" END AS msg_owner FROM chats WHERE (message_from=(SELECT id FROM userID) AND message_to=(SELECT id FROM targetID)) OR (message_from=(SELECT id FROM targetID) AND message_to=(SELECT id FROM userID)) AND chat_id >${oldestMessageID} ORDER BY message_date DESC LIMIT 25;`;
    // console.log(fetchChatQuery);
    console.log(fetchChatQuery);
    return new Promise((resolve, reject) => {
        connection.query(fetchChatQuery, (error, results) => {
            if (error) {
                // resolve(error);
                console.log(error);
                reject(error);
            } else {
                resolve(results);
            }
        })
    });

}


const fetchRecentChatUsers = (username, connection) => {
    const fetchRecentChatUsersQuery = `with userID AS (SELECT id FROM users WHERE username="${username}") SELECT DISTINCT CASE WHEN message_from = (SELECT id FROM userID) THEN (SELECT username FROM users WHERE id=message_to) WHEN message_to = (SELECT id FROM userID) THEN (SELECT username FROM users WHERE id=message_from)END AS target_usernames FROM chats WHERE (message_from = (SELECT id FROM userID) OR message_to = (SELECT id FROM userID));`;
    return new Promise((resolve) => {
        connection.query(fetchRecentChatUsersQuery, (error, results) => {
            if (error) {
                console.log("query error in fetchRecentChatUsers()");
                console.log(error);
                return;
            } resolve(results);
        })
    })
}

const sendOnlineStatus = async (username, clients, connection, online) => {
    const recentChatUsers = await fetchRecentChatUsers(username, connection);
    console.log("inside sendOnlineStatus");
    recentChatUsers.map(user => {
        console.log("user is %s", user["target_usernames"]);
        // console.log(clients);
        if (clients.get(user["target_usernames"])) {
            console.log("%s is online", user["target_usernames"])
            console.log("sending online status to %s", user["target_usernames"]);
            clients.get(user["target_usernames"]).send(JSON.stringify(
                {
                    "messageType": online === true ? "userOnline" : "userOffline",
                    "username": username
                }
            ))
        }
    })
}

const setAsClient = (clientSocket, username, clients) => {

}


module.exports = { handleWebSocketConnections, sendOnlineStatus }