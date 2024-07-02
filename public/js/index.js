let appState = {
    currentMenu: "feed",
    oldestPostID: 0,
    currentChat: "skylaryo",
    oldestMessageID: 0,
    lastPostReached: false
}

//http (&&) websocket URL connections
const serverURL = "http://localhost:5000";
const webSocketURL = "ws://localhost:5050";
// const serverURL = "http://192.168.145.235:5000";
// const webSocketURL = "ws://192.168.145.235:5050";


const containerDiv = document.querySelector(".app-container");
const body = document.querySelector("body");
let logInForm;

/////////////////////////////////////////////
////////////////////////////////////////////
const createInstagramPost = (postID, postCaption, postLikes, postDate, postUser, profilePicture) => {
    const post = document.createElement('div');
    post.id = 'post';
    const image = document.createElement('img');
    image.id = 'image';

    fetch(serverURL + `/postImage/${postID}`).then(res => res.json()).then(data => {
        const base64Image = data["postImage"];
        image.src = base64Image;
    })
    image.alt = 'Post Image';
    post.appendChild(image);

    // Create content container
    const content = document.createElement('div');
    content.id = 'content';
    post.appendChild(content);

    // Create header
    const header = document.createElement('div');
    header.id = 'header';
    content.appendChild(header);

    const profileImg = document.createElement('img');
    profileImg.src = profilePicture
    profileImg.alt = 'Profile Picture';
    header.appendChild(profileImg);

    const username = document.createElement('div');
    username.textContent = postUser;
    header.appendChild(username);

    // Create text container
    const text = document.createElement('div');
    text.id = 'text';
    content.appendChild(text);

    const paragraph = document.createElement('p');
    paragraph.textContent = postCaption;
    text.appendChild(paragraph);

    // Create icons container
    const icons = document.createElement('div');
    icons.id = 'icons';
    content.appendChild(icons);

    const likeIcon = document.createElement('img');
    likeIcon.src = './assets/heart.png';
    likeIcon.className = 'like-icon';
    likeIcon.alt = 'Like Icon';
    icons.appendChild(likeIcon);

    const shareIcon = document.createElement('img');
    shareIcon.src = './assets/share.png';
    shareIcon.className = 'share-icon';
    shareIcon.alt = 'Share Icon';
    icons.appendChild(shareIcon);

    // Create likes and date elements
    const likesDiv = document.createElement('div');
    likesDiv.id = 'likes';
    likesDiv.textContent = `${postLikes} likes`;
    content.appendChild(likesDiv);
    const dateDiv = document.createElement('div');
    dateDiv.id = 'date';
    dateDiv.textContent = postDate;
    content.appendChild(dateDiv);

    // Return the constructed post element
    let posts = document.querySelector("#posts");
    if (!posts) {
        posts = document.createElement("div");
        posts.id = "posts";
        document.querySelector("body").appendChild(posts);
    }
    posts.appendChild(post);
}


const constructChatBox = (messageContent, messageTime, source, old) => {
    const currentMessagesDiv = document.querySelector(".messages");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    // const currentChatContentDiv = document.querySelector(".current-chat-content");
    if (source === "self") {
        messageDiv.classList.add("sent");
    } else {
        messageDiv.classList.add("received");
    }
    const textDiv = document.createElement("div");
    textDiv.innerText = messageContent;
    textDiv.classList.add("text");
    const timePara = document.createElement("p");
    timePara.innerHTML = messageTime;
    timePara.classList.add("message-time");
    textDiv.appendChild(timePara);
    messageDiv.appendChild(textDiv);

    if (old === true) {
        currentMessagesDiv.insertBefore(messageDiv, currentMessagesDiv.firstChild);
    } else {
        currentMessagesDiv.appendChild(messageDiv);
    }
}


const ws = new WebSocket(webSocketURL);
const xhr = new XMLHttpRequest();
//A CONDITIONAL BASED ON WINDOW.LOCATION.HREF THAT MAKES APPROPRIATE REQUESTS{}

ws.onopen = () => {
    console.log("Connected to the server");
    ///ENTRY POINT OF THE ENTIRE WEBAPP
    //IF ALREADY LOGGED IN, SERVER WILL REVERIFY CURRENT SOCKET CONNECTION
    //ELIMINATING NEED FOR LOG-IN WHENEVER WE GO OFFLINE OR CLOSE THE PAGE
    //CASE CONDITIONAL ON VERIFICATION STATUS OF SOCKET FROM SERVER
    ws.send(JSON.stringify(
        {
            messageType: "verificationStatus",
            cookieContent: document.cookie
        }
    ));
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data["messageType"]) {
            case "verificationStatus": {
                console.log(data);
                if (data["verificationStatus"] !== true) {
                    console.log("Not verified, hence requesting logInPageInnerHTML");
                    xhr.open("GET", serverURL + "/logInPageInnerHTML", true);
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4 && xhr.status === 200) {
                            console.log("ARRIVED: LOGIN.HTML")
                            // console.log(xhr.responseText);
                            body.innerHTML = xhr.responseText;
                            logInForm = document.querySelector(".login-form");
                            //WAIT UNTIL LOGINFORM HAS BEEN ADDED TO DOM
                            logInForm.addEventListener("submit", (event) => {
                                logInFormSubmit(event);
                            })
                        }
                    }
                    xhr.send();
                } else {
                    console.log("Verified server side, hence requesting /mainPage")
                    xhr.open("GET", serverURL + "/mainPageInnerHTML", true);
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4 && xhr.status === 200) {
                            console.log("ARRIVED: MAIN_PAGE.HTML");
                            body.innerHTML = xhr.responseText;
                            const homeMenu = document.querySelector(".home-menu");
                            addMenuEventListeners();
                            homeMenu.dispatchEvent(new Event("click"));
                            appState.currentMenu = "mainPage";
                        }
                    }
                    xhr.send();
                }
            } break;
            case "userFeedContent": {
                console.log("Feed content received!");
                console.log(data["userFeedContent"]);
                data["userFeedContent"].map(post => {
                    console.log(post);
                    const { post_id, post_caption, total_likes, post_username, post_date } = post;
                    createInstagramPost(post_id, post_caption, total_likes, post_date, post_username, "./assets/hijab.jpg");
                })
                console.log("Loaded all posts");
            } break;
            case "followedUser": {
                console.log("Followed %s", data["target"]);
            } break;
            case "unFollowedUser": {
                console.log("Unfolowed user is %s", data["target"]);
            }
        }
    }
}



const logInFormSubmit = (event) => {
    // const usernameEmail = event.target[0].value;
    // const password = event.target[1].value;
    event.preventDefault();
    const formData = new FormData(event.target);
    console.log(formData.get("usernameEmail"));
    console.log(formData.get("password"));
    fetch(serverURL + "/login", {
        method: "POST",
        body: formData
    }).then(res => res.json()).then(status => {
        console.log("loginStatus fetched");
        if (status["loginStatus"] === false) {
            console.log("Failed to login...");
        } else {
            console.log("Logged in...")
            console.log("Rendering main page in 3 seconds...");
            ws.send(JSON.stringify(
                {
                    messageType: "verificationStatus",
                    cookieContent: document.cookie
                }
            ));
        }
    })
}


/////////////////////////////////////////////
///on document load verify session status///
///if session status is verified, check
///appState.
///Then, construct page based on appState?///
// window.addEventListener("onload", () => {
//     if (ws.readyState === ws.OPEN) {
// ws.send(JSON.stringify({
//     messageType: "verificationStatus",
//     cookieContent: document.cookie
// }));
//     }
// })
/////////////////////////////////////////////
/////////websocket received messages/////////
////////////////////////////////////////////
// ws.onmessage = (event) => {
//     const data = JSON.parse(event.data);
//     // console.log(data);
//     //other material with socket message
//     if (data.messageType === "pageInnerHTML") {
//         console.log("Received material");
//         const pageName = data.pageName;
//         console.log(pageName);
//         switch (pageName) {
//             case "logIn": {
//                 console.log("Received logInPageContent");
//                 console.log(data.pageContent);
//                 document.querySelector("body").innerHTML = data["pageContent"];
//                 // containerDiv.innerHTML = "";
//                 // containerDiv.classList.remove("app-container-main-app");
//                 containerDiv.innerHTML = data.pageContent;
//                 const loginForm = document.querySelector("form");

//                             if (ws.readyState === ws.CONNECTING || ws.readyState === ws.OPEN) {
//                                 pingOnline();
//                             }
//                             // pingOnline();
//                         }
//                     })
//                 })
//                 const switchFormLink = document.querySelector(".switch-form-link");
//                 switchFormLink.addEventListener("click", (event) => {
//                     ws.send(JSON.stringify(
//                         {
//                             messageType: "innerHTML",
//                             pageName: "signUp"
//                         }
//                     ))
//                 })
//             } break;
//             case "signUp": {
//                 console.log("Received signUpPageContent");
//                 console.log(data.pageContent);
//                 containerDiv.innerHTML = "";
//                 containerDiv.classList.remove("app-container-main-app");
//                 containerDiv.innerHTML = data.pageContent;
//                 const switchFormLink = document.querySelector(".switch-form-link");
//                 switchFormLink.addEventListener("click", (event) => {
//                     ws.send(JSON.stringify(
//                         {
//                             messageType: "innerHTML",
//                             pageName: "logIn"
//                         }
//                     ))
//                 })
//                 const signUpForm = document.querySelector("form");
//                 signUpForm.addEventListener("submit", (event) => {
//                     event.preventDefault();
//                     const values = event.target;
//                     console.log("Signing up...")
//                     fetch(serverURL + "/signup", {
//                         method: "POST",
//                         headers: {
//                             "Content-Type": "application/json"
//                         },
//                         body: JSON.stringify({
//                             email: values[0].value,
//                             fullName: values[1].value,
//                             username: values[2].value,
//                             password: values[3].value
//                         })
//                     }).then(res => res.json()).then(status => {
//                         if (status["registerStatus"] === false) {

//                         } else {
//                             console.log("Successfully registered!");
//                             console.log("Redirecting in 3 seconds...");
//                             setTimeout(switchFormLink.click, 3000);
//                             switchFormLink.click();
//                         }
//                     })
//                 })
//             } break;
//             case "mainPage": {
//                 console.log("Received main page content");
//                 document.querySelector("body").innerHTML = "";
//                 document.querySelector("body").innerHTML = data["pageContent"];
//                 // containerDiv.innerHTML = "";
//                 // containerDiv.innerHTML = data["pageContent"];
//                 // containerDiv.classList.add("app-container-main-app");
//                 appState.currentMenu = "mainPage";
//                 addMenuEventListeners();
//                 fetchFeedPageHTML();
//             } break;
//             case "chat": {
//                 console.log("Chat page innerHTML received");
//                 console.log(data["pageContent"]);
//                 containerDiv.innerHTML = "";
//                 containerDiv.classList.remove("app-container-main-app");
//                 containerDiv.classList.add("app-chat-container");
//                 // containerDiv.innerHTML = data["pageContent"];
//                 document.querySelector("body").innerHTML = data["pageContent"];
//                 addMenuEventListeners();
//                 appState.currentMenu = "messages"
//                 const messagesMenu = document.querySelector(".messages-menu");
//                 messagesMenu.style.fontWeight = "bold";
//                 //loadChats
//                 //first, each last chat
//                 //then, addEventlistener to all blocks
//                 fetchAllRecentChats();
//             } break;
//             case "userFeed": {
//                 console.log("User Feed Received");
//                 // CONSTRUCT CONTAINERDIV FOR USER FEED
//                 document.querySelector("body").innerHTML = data["pageContent"];
//                 addMenuEventListeners();
//                 appState.currentMenu = "feed";
//                 appState.loadedPosts = 0;
//                 // const homeMenu = document.querySelector(".home-menu");
//                 // homeMenu.style.fontWeight = "bold";
//                 console.log("Making request for fetchFeedPosts()")
//                 fetchFeedPosts();
//             } break;
//         }
//     } else if (data.messageType === "userFeedContent") {
//         console.log("Feed Posts Received");
//         const posts = data["userFeedContent"]["posts"];
//         console.log(posts);
//         posts.map(post => {
//             const postUser = post["post_username"];
//             const postDate = post["post_date"];
//             const postID = post["post_id"];
//             console.log(postID);
//             const postCaption = post["post_caption"];
//             const postLikes = 334234;
//             const profilePicture = "./assets/3.png";
//             createInstagramPost(postID, postCaption, postLikes, postDate, "klively", profilePicture);
//         })
//         // console.log("userFeedContent was successfully fetched")
//     } else if (data.messageType === "fetchedChat") {
//         //THESE WILL BE FETCHED IN DESCENDING ORDER
//         //i.e., LATEST MESSAGE FIRST, AND SO ON
//         const { target, chats } = data;
//         console.log("Last 25 chats with %s were", target);
//         console.log(chats);
//         if (chats.length > 0) {
//             appState.oldestMessageID = parseInt(chats[chats.length - 1]["chat_id"]);
//         }
//         chats.map(chat => {
//             const messageContent = chat["message_content"];
//             const source = chat["msg_owner"];
//             const messageTime = chat["message_date"].split("T")[1].substring(0, 9);
//             let old = true;
//             constructChatBox(messageContent, messageTime, source, old);
//         })
//     } else if (data.messageType === "userOnline") {
//         const { username } = data;
//         console.log("%s is online", username);
//     } else if (data["messageType"] === "authenticationStatus") {
//         if (data["authenticationStatus"] === false) {
//             fetchLoginPageHTML();
//         }
//     }
// }


// IF COOKIE IS AUTHENTICATED, OTHER USERS 
// ARE INFORMED OF ONLINE STATUS
const pingOnline = () => {
    ws.send(
        JSON.stringify(
            {
                "messageType": "pingOnline",
                "cookieContent": document.cookie
            }
        )
    )
}


/////////////////////////////////////////////
/////////////////////////////////////////////
////////////INNER HTML FETCHERS//////////////
/////////////////////////////////////////////
/////////////////////////////////////////////


// const fetchMainPageHTML = () => {
//     ws.send(JSON.stringify({
//         "messageType": "innerHTML",
//         "pageName": "mainPage",
//         "cookieContent": document.cookie
//     }));
// }

// const fetchFeedPageHTML = () => {
//     ws.send(
//         JSON.stringify({
//             "messageType": "innerHTML",
//             "pageName": "userFeed",
//             "cookieContent": document.cookie
//         })
//     )
// }

// const fetchChatPageHTML = () => {
//     ws.send(
//         JSON.stringify(
//             {
//                 "messageType": "innerHTML",
//                 "pageName": "chat"
//             }
//         )
//     )
// }


const fetchFeedPosts = () => {
    ws.send(
        JSON.stringify({
            "messageType": "fetchFeedPosts",
            "postsOffset": appState.oldestPostID,
            "cookieContent": document.cookie
        })
    )
}


const fetchLoginPageHTML = () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", serverURL + "/login", true);
    xhr.onreadystatechange = () => {
        document.querySelector("body").innerHTML = xhr.responseText;
    }
    xhr.send();
}

const fetchAllRecentChats = () => {
    ws.send(
        JSON.stringify(
            {
                "messageType": "allRecentChats",
                "cookieContent": document.cookie
            }
        )
    )
}

const fetchCurrentChat = () => {
    const currentChat = appState.currentChat;
    const oldestMessageID = appState.oldestMessageID;
    ws.send(JSON.stringify(
        {
            "messageType": "fetchChat",
            "target": currentChat,
            "cookieContent": document.cookie,
            "oldestMessageID": oldestMessageID
        }
    ))
}


const addMenuEventListeners = () => {
    const feedMenu = document.querySelector(".home-menu");
    const bodyDiv = document.querySelector("body");
    feedMenu.addEventListener("click", () => {
        console.log("clicked on feedMenu");
        const feedPostsDiv = document.querySelector("#posts");
        if (feedPostsDiv) {
            bodyDiv.removeChild(feedPostsDiv);
        }
        if (["mainPage", "explore", "messages", "create"].includes(appState.currentMenu)) {
            const messagesContentDiv = document.querySelector(".container");
            if (messagesContentDiv) {
                bodyDiv.removeChild(messagesContentDiv);
            }
            const uploadAreaDiv = document.querySelector(".upload-area");
            if (uploadAreaDiv) {
                bodyDiv.removeChild(uploadAreaDiv);
            }
            appState.oldestPostID = 0;
            appState.currentMenu = "mainPage";
            ws.send(
                JSON.stringify(
                    {
                        "messageType": "fetchFeedPosts",
                        "oldestPostID": appState.oldestPostID,
                        "cookieContent": document.cookie
                    }
                ));
        }
    })
    const chatMenu = document.querySelector(".messages-menu");
    chatMenu.addEventListener("click", () => {
        // IF CHAT MENU IS NOT CURRENT PAGE (AND) IS home || explore || create instead of the loginPage || signupPage
        console.log("chatMenu click event fired!");
        xhr.open("GET", serverURL + "/messagesInnerHTML", true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const bodyDiv = document.querySelector("body");
                const homeContentDiv = document.querySelector("#posts");
                if (homeContentDiv) {
                    bodyDiv.removeChild(homeContentDiv);
                }
                const containerDiv = document.querySelector(".container");
                if (containerDiv) {
                    bodyDiv.removeChild(containerDiv);
                }
                const uploadAreaDiv = document.querySelector(".upload-area");
                if (uploadAreaDiv) {
                    bodyDiv.removeChild(uploadAreaDiv);
                }
                console.log(xhr.responseText);
                bodyDiv.insertAdjacentHTML("beforeend", xhr.responseText);
                appState.currentMenu = "messages";
            }
        }
        xhr.send();
    })
    const exploreMenu = document.querySelector(".explore-menu");
    exploreMenu.addEventListener("click", () => {
        if (["mainPage", "home", "messages", "create"].includes(appState.currentMenu)) {
            console.log("Explore Menu. Coming Soon");
        }
    });
    const createMenu = document.querySelector(".create-menu");
    createMenu.addEventListener("click", () => {
        const containerDiv = document.querySelector(".container");
        const feedDiv = document.querySelector("#posts");
        const uploadArea = document.querySelector(".upload-area");
        if (uploadArea) {
            document.querySelector("body").removeChild(uploadArea);
            //REMOVE BLUR FILTERS ON ALL ELEMENT WINDOWS
            if (containerDiv) {
                containerDiv.style.filter = "none";
            } if (feedDiv) {
                feedDiv.style.filter = "none";
            }
            return;
        }
        xhr.open("GET", serverURL + "/imageUploadInnerHTML", true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                document.querySelector("body").insertAdjacentHTML("beforeend", xhr.responseText);
                //SET OTHER ITEMS TO GREY COLOR

                if (containerDiv) {
                    console.log("Applying blur to container div");
                    containerDiv.style.filter = "blur(2px)";
                }

                if (feedDiv) {
                    feedDiv.style.filter = "blur(2px)";
                }
                appState.currentMenu = "create";
                const selectImageButton = document.querySelector('.select-image');
                const img = document.querySelector('.upload-image');
                let fileInput = document.querySelector(".input-image-upload");
                const fileUploadListener = () => {
                    if (selectImageButton.classList.contains('remove')) {
                        img.src = './assets/logo.svg';
                        selectImageButton.textContent = 'Choose Image';
                        selectImageButton.classList.remove('remove');
                        document.querySelector(".upload-area").removeChild(fileInput);
                        fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/*';
                        fileInput.style.display = 'none';
                        fileInput.class = "input-image-upload";
                        document.querySelector(".upload-area").appendChild(fileInput);
                        fileInput.addEventListener('change', (event) => {
                            console.log("image uploaded")
                            const file = event.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    img.src = e.target.result;
                                    selectImageButton.textContent = 'Remove Image';
                                    selectImageButton.classList.add('remove');
                                };
                                reader.readAsDataURL(file);
                            }
                        })
                    } else {
                        if (!fileInput) {
                            fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/*';
                            fileInput.style.display = 'none';
                            fileInput.class = "input-image-upload";
                            document.querySelector(".upload-area").appendChild(fileInput);
                            fileInput.addEventListener('change', (event) => {
                                console.log("image uploaded")
                                const file = event.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        img.src = e.target.result;
                                        selectImageButton.textContent = 'Remove Image';
                                        selectImageButton.classList.add('remove');
                                    };
                                    reader.readAsDataURL(file);
                                }
                            })
                        }
                        // Trigger the file input click
                        fileInput.click();
                    }
                }
                selectImageButton.addEventListener('click', fileUploadListener);
                const uploadButton = document.querySelector(".post-button");
                uploadButton.addEventListener("click", () => {
                    if (fileInput) {
                        if (fileInput.files.length > 0) {
                            console.log("OK");
                            const image_file = fileInput["files"][0];
                            if (image_file && (image_file.type === "image/jpeg" || image_file.type === "image/png")) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    let formData = new FormData();
                                    // console.log(e.target.result);
                                    const imgData = {
                                        base64Image: e.target.result,
                                        imageCaption: document.querySelector(".upload-caption").value
                                    };
                                    formData.append("body", imgData);
                                    let uploadRequest = new XMLHttpRequest();
                                    console.log("Appended imageBlob of length %d to formData", formData.get("body").length);
                                    uploadRequest.open("POST", serverURL + "/uploadPost");
                                    uploadRequest.setRequestHeader("Content-Type", "application/json");
                                    uploadRequest.onload = () => {
                                        if (uploadRequest["status"] === 200) {
                                            console.log("Image uploaded successfully!");
                                        }
                                    }
                                    uploadRequest.send(JSON.stringify({
                                        base64Image: e.target.result,
                                        imageCaption: document.querySelector(".upload-caption").value,
                                        cookies: document.cookie
                                    }));
                                    console.log("Sent formData()");
                                }
                                reader.readAsDataURL(image_file);
                            }
                        } else {
                            console.log("No image to upload");
                        }
                    }
                })
            }
        }
        xhr.send();
    })
}


////RENDERING HTML PORTIONS OF THE WEBAPP
const renderCurrentChatHTML = (profilePicture, username, messages) => {
    var mainDiv = document.createElement('div');
    mainDiv.className = 'main';

    var headerDiv = document.createElement('div');
    headerDiv.className = 'header';

    var img = document.createElement('img');
    img.src = profilePicture;
    img.alt = username;

    var nameDiv = document.createElement('div');
    nameDiv.textContent = username;

    headerDiv.appendChild(img);
    headerDiv.appendChild(nameDiv);

    var messagesDiv = document.createElement('div');
    messagesDiv.className = 'messages scrollbar';

    var label = document.createElement('label');
    label.className = 'logup-field chat-text-label';

    var input = document.createElement('input');
    input.id = 'chat-text-input';
    input.name = 'current-chat-text';
    input.type = 'text';
    input.placeholder = ' ';

    var span = document.createElement('span');
    span.className = 'placeholder';
    span.textContent = 'Type a message';

    label.appendChild(input);
    label.appendChild(span);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'send-message submit-button';
    button.textContent = 'Send';

    mainDiv.appendChild(headerDiv);
    messages.map(message => {
        renderMessageHTML(message);
    })
    mainDiv.appendChild(messagesDiv);
    mainDiv.appendChild(label);
    mainDiv.appendChild(button);

    document.body.appendChild(mainDiv);
}

renderMessageHTML = (message) => {
    const messagesDiv = document.querySelector(".messages");
    const messageReceivedDiv = document.createElement('div');
    if (message["sender"] === "self") {
        messageReceivedDiv.className = 'message sent';
    } else {
        messageReceivedDiv.className = 'message received';
    }
    const textReceivedDiv = document.createElement('div');
    textReceivedDiv.className = 'text';
    textReceivedDiv.textContent = message["message_content"];

    const messageTimeReceived = document.createElement('p');
    messageTimeReceived.className = 'message-time';
    messageTimeReceived.textContent = message["message_date"];

    textReceivedDiv.appendChild(messageTimeReceived);
    messageReceivedDiv.appendChild(textReceivedDiv);

    messagesDiv.appendChild(messageReceivedDiv);
}

if (false) {
    const followUserBtn = document.querySelector(".follow-user");
    const target = document.querySelector(".profile-username");
    followUserBtn.addEventListener("click", () => {
        ws.send(
            JSON.stringify(
                {
                    "messageType": "followUser",
                    "target": target.innerText,
                    "cookieContent": document.cookie
                }
            )
        )
    })
}

if (false) {
    const unFollowUserBtn = document.querySelector(".unfollow-user");
    const target = document.querySelector(".profile-username");
    unFollowUserBtn.addEventListener("click", () => {
        ws.send(
            JSON.stringify(
                {
                    "messgageType": "unFollowUser",
                    "target": target.innerText,
                    "cookieContent": document.cookie
                }
            )
        )
    })
}

const getSignUpPage = () => {
    xhr.open("GET", serverURL + "/signUpPageInnerHTML", true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.querySelector(".login-page").innerHTML = xhr.responseText;
        }
    }
    xhr.send();
}