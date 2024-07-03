const ws = require("ws");
const fs = require("fs");
const cookie = require("cookie")

const {authenticateUser} = require("./authenticate");

let httpTextLocation;

const handleWebSocketConnections = (clients, connection, httpTextLoc) => {
    //THE CLIENT MAP IS SOLELY FOR THE PURPOSES OF SENDING BATCH STATUS REPORTS AND MESSAGES TO ONLINE USERS. IT MUST NOT BE USED AS AN AUTHENTICATION TOOL. USE authenticateUser() FOR THAT PURPOSE
    httpTextLocation = httpTextLoc;
    const wss = new ws.Server({port: 5050});
    console.log("WebSocket is running on PORT 5050");
    wss.on("connection", async (ws, request) => {
        let seltzer = cookie.parse(request.headers.cookie || "")["seltzer"];
        let username = cookie.parse(request.headers.cookie || "")["username"];
        // for (let [key] in clients) {
        //     console.log(key);
        // }
        if (!seltzer || !username) {
            console.log("User is not identifiable...");
            ws.send(JSON.stringify(
                {
                    messageType: "verificationStatus",
                    verificationStatus: false
                }
            ));
        }
        console.log("SOCKET CONNECTION MADE");
        //NOW SWITCH TO FINDING USERNAME AND SELTZER THROUGH DOCUMENT COOKIES
        ws.on("message", async (d) => {
            const data = JSON.parse(d);
            seltzer = cookie.parse(data["cookieContent"] || "")["seltzer"];
            username = cookie.parse(data["cookieContent"] || "")["username"];
            console.log("RECEIVED MESSAGE FROM SOCKET WITH USERNAME %s. WILL CHECK FOR AUTHENTICATION NOW.", username);
            const isAuthenticated = await authenticateUser(seltzer, username, connection);
            if (!isAuthenticated) {
                ws.send(JSON.stringify(
                    {
                        messageType: "verificationStatus",
                        verificationStatus: false
                    }
                ))
                return;
            } else {
                if (!clients.get(username)) {
                    clients.set(username, ws);
                    sendOnlineStatus(username, clients, connection, true);
                }
            }
            switch (true) {
                case ["fetchFeedPosts", "verificationStatus", "uploadPost", "likePost", "unLikePost", "searchUsers", "sendMessage", "followUser", "unFollowUser", "fetchImage", "fetchChat", "pingOnline", "latestAllChats", "typing", "notTyping"].includes(data["messageType"]): {
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
                            break;
                        case "latestAllChats": {
                            console.log("Fetching all recent chats for %s", username);
                            const results = await fetchLatestAllChats(username, connection);
                            console.log(results);
                            ws.send(
                                JSON.stringify(
                                    {
                                        "messageType": "latestAllChats",
                                        "allChatsContent": results
                                    }
                                )
                            )
                        }
                            break;
                        case "fetchFeedPosts": {
                            console.log("Time to see about those posts in the feed...");
                            const {oldestPostID} = data;
                            sendFeedPosts(username, oldestPostID, ws, connection);
                        }
                            break;
                        case "uploadPost": {
                            console.log("%s wants to upload a post", username);
                            let {postImage, caption} = data;
                            if (caption.trim().length === 0) {
                                caption = "NULL";
                            }
                            const uploadPostQuery = `INSERT INTO posts (post_caption, post_user, post_image, post_date) VALUE ("${caption}", "${username}", "${postImage}", NOW());`
                            console.log(uploadPostQuery);
                            //SEND RESULTS
                        }
                            break;
                        case "searchUsers": {
                            const name = data["name"].trim();
                            if (name.length === 0) {
                                return;
                            }
                            const userSearchQuery = `SELECT u.username, u.profile_picture, IF(f.followee IS NOT NULL, 'true', 'false') AS is_followed FROM users u LEFT JOIN follows f ON f.followee = u.id AND f.follower = (SELECT id FROM users WHERE username = '${username}') WHERE u.username LIKE '%${name}%';`;
                            // console.log(userSearchQuery);
                            connection.query(userSearchQuery, (error, results) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log(results);
                                    ws.send(
                                        JSON.stringify(
                                            {
                                                "messageType": "userSearchResults",
                                                "userSearchResults": results
                                            }
                                        )
                                    )
                                }
                            })
                        }
                            break;
                        case "sendMessage": {
                            const {receiver, messageContent} = data;
                            console.log("%s wants to send a message to %s", username, receiver);
                            const sendMessageStatus = await sendMessage(username, receiver, messageContent, connection);
                            //SEND TRUE IF SUCCESSFUL
                            //SEND NEW_MESSAGE TO RECEIVER IF CONNECTED
                            if (sendMessageStatus === true) {
                                //SENDER MANAGED
                                ws.send(
                                    JSON.stringify(
                                        {
                                            "messageType": "messageSentStatus",
                                            "messageSentStatus": true,
                                            "messageContent": messageContent,
                                            "messageDate": getCurrentDateTimeString(),
                                            "target": receiver
                                        }
                                    )
                                )
                                //RECEIVER MANAGED
                                if (clients.get(receiver)) {
                                    clients.get(receiver).send(
                                        JSON.stringify(
                                            {
                                                "messageType": "newMessage",
                                                "sender": username,
                                                "messageContent": messageContent,
                                                "messageDate": getCurrentDateTimeString()
                                            }
                                        ))
                                }
                            }

                        }
                            break;
                        case "typing": {
                            const {target} = data;
                            console.log("received typing status for %s and will send this to %s", username, target);
                            if (clients.get(target)) {
                                clients.get(target).send(
                                    JSON.stringify(
                                        {
                                            "messageType": "userTyping",
                                            "target": username
                                        }
                                    )
                                )
                            }
                        }
                            break;
                        case "notTyping": {
                            const {target} = data;
                            if (clients.get(target)) {
                                clients.get(target).send(
                                    JSON.stringify(
                                        {
                                            "messageType": "userNotTyping",
                                            "target": username
                                        }
                                    )
                                )
                            }
                        }
                            break;
                        case "followUser": {
                            const {target} = data;
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
                        }
                            break;
                        case "unFollowUser": {
                            const {target} = data;
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
                        }
                            break;
                        case "likePost": {
                            const {postID} = data;
                            const likePostQuery = `INSERT INTO likes (liker, post_id) VALUE ((SELECT id FROM users WHERE username="${username}"), ${postID});`;
                            connection.query(likePostQuery, (error, result) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    ws.send(
                                        JSON.stringify(
                                            {
                                                "messageType": "likeSuccessful",
                                                "postID": postID
                                            }
                                        )
                                    )
                                }
                            })
                        }
                            break;
                        case "unLikePost": {
                            const {postID} = data;
                            const unLikePostQuery = `DELETE FROM likes WHERE post_id=${postID} AND liker=(SELECT id FROM users WHERE username="${username}");`
                            connection.query(unLikePostQuery, (error) => {
                                if (error) {
                                    console.log(error);
                                } else {
                                    ws.send(
                                        JSON.stringify(
                                            {
                                                "messageType": "unLikeSuccessful",
                                                "postID": postID
                                            }
                                        )
                                    )
                                }
                            })
                        }
                            break;
                        case "fetchImage": {
                            const {imageID} = data;
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
                        }
                            break;
                        case "fetchChat": {
                            console.log("Fetch chat request has been made by %s", username);
                            const {target, oldestMessageID} = data;
                            const fetchedChat = await fetchChat(username, target, oldestMessageID, connection);
                            ws.send(JSON.stringify(
                                {
                                    "messageType": "fetchedChat",
                                    "target": target,
                                    "chats": fetchedChat
                                }
                            ));
                        }
                            break;
                        case "pingOnline": {
                            console.log("User pingedOnline()");
                            if (ws.readyState === ws.CONNECTING || ws.readyState === ws.OPEN) {
                                clients.set(username, ws);
                            }
                            sendOnlineStatus(username, clients, connection, online = true);
                        }
                    }
                }
                    break;
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


const sendFeedPosts = (username, oldestPostID, clientSocket, connection) => {
    fetchFeedPosts(username, oldestPostID, connection).then(posts => {
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
        const fetchFeedQuery = `SELECT p.post_id, p.post_caption, p.post_date, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) AS post_total_likes, u.username AS post_username, IF(l1.liker IS NOT NULL, 'true', 'false') AS has_liked FROM posts p JOIN users u ON p.post_user = u.id JOIN follows f ON f.followee = p.post_user LEFT JOIN likes l1 ON l1.post_id = p.post_id AND l1.liker = (SELECT id FROM users WHERE username = "${username}") WHERE f.follower = (SELECT id FROM users WHERE username = "${username}") ORDER BY p.post_date DESC LIMIT 25;`;
        connection.query(fetchFeedQuery, (error, results) => {
            if (error) {
                console.log(error);
            } else {
                resolve(results);
            }
        })
    })
}

const sendMessage = (username, target, messageContent, connection) => {
    const sendMessageQuery = `INSERT INTO chats (message_from, message_to, message_content, message_date) VALUE ((SELECT id FROM users WHERE username="${username}"), (SELECT id FROM users WHERE username="${target}"), "${messageContent}", NOW());`;
    console.log(sendMessageQuery);
    return new Promise((resolve, reject) => {
        connection.query(sendMessageQuery, (error, result) => {
            if (error) {
                console.log(error);
                resolve(false);
            } else {
                resolve(true);
            }
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
            }
            resolve(results);
        })
    })
}

const sendOnlineStatus = async (username, clients, connection, online) => {
    const recentChatUsers = await fetchRecentChatUsers(username, connection);
    // console.log("inside sendOnlineStatus");
    // console.log("clients connected right now are: ");
    // console.log(clients);
    recentChatUsers.map(user => {
        console.log("user is %s", user["target_usernames"]);
        // console.log(clients);
        if (clients.get(user["target_usernames"])) {
            console.log("%s is online", user["target_usernames"])
            console.log("sending online status to %s", user["target_usernames"]);
            clients.get(user["target_usernames"]).send(JSON.stringify(
                {
                    "messageType": online === true ? "userOnline" : "userOffline",
                    "username": username,
                    "statusTime": Date.now()
                }
            ))
        }
    })
}

const fetchLatestAllChats = (username, connection) => {
    const latestAllChatsQuery = `WITH latest_messages AS (SELECT chat_id, message_from, message_to, message_content, message_date, ROW_NUMBER() OVER (PARTITION BY LEAST(message_from, message_to), GREATEST(message_from, message_to) ORDER BY message_date DESC) AS rn FROM chats WHERE message_from = (SELECT id FROM users WHERE username="${username}") OR message_to = (SELECT id FROM users WHERE username="${username}")) SELECT CASE WHEN message_from =(SELECT id FROM users WHERE username="${username}") THEN (SELECT username FROM users WHERE id=message_to) ELSE (SELECT username FROM users WHERE id=message_from) END AS friend_name, message_content, message_date FROM latest_messages WHERE rn = 1 ORDER BY message_date DESC;`;

    console.log(latestAllChatsQuery);
    return new Promise((resolve) => {
        connection.query(latestAllChatsQuery, (error, results) => {
            if (error) {
                console.log(error);
                resolve(false);
            } else {
                console.log("All recent chats were loaded successfully!");
                resolve(results);
            }
        })
    });
}

const setAsClient = (clientSocket, username, clients) => {

}

const signOutUser = (req, connection) => {
    const username = cookie.parse(req.headers.cookie || "")["username"];
    return new Promise((resolve) => {
        connection.query(`DELETE FROM cookies WHERE user_id=(SELECT id FROM users WHERE username="${username}");`, (error) => {
            if (error) {
                console.log("Error while signing out the user");
                resolve(false);
            } else {
                resolve(true);
            }
        })
    })
}

const getCurrentDateTimeString = () => {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const seconds = currentDate.getSeconds().toString().padStart(2, '0');
    const milliseconds = currentDate.getMilliseconds().toString().padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}
module.exports = {handleWebSocketConnections, sendOnlineStatus, signOutUser}

