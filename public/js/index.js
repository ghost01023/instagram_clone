let appState = {
    currentMenu: "feed",
    oldestPostID: 0,
    currentChat: null,
    oldestMessageID: 0,
    lastPostReached: false,
    allChats: [],
}

//http (&&) websocket URL connections
const serverURL = "http://localhost:5000";
const webSocketURL = "http://localhost:5050";

// const serverURL = "http://192.168.145.235:5000";
// const webSocketURL = "ws://192.168.145.235:5050";


const containerDiv = document.querySelector(".app-container");
const bodyDiv = document.querySelector("body");
let logInForm;

/////////////////////////////////////////////
////////////////////////////////////////////
const createInstagramPost = (postID, postCaption, postLikes, postDate, postUser, self_liked) => {
    const post = document.createElement('div');
    post.id = 'post';
    post.className = "post" + postID;
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
    fetch(serverURL + "/profilePicture/" + postUser).then(res => res.json()).then(data => {
        if (!data["image_present"]) {
            profileImg.src = "./assets/default_profile.svg";
            return;
        }
        const base64ProfilePicture = data["base64ProfilePicture"];
        profileImg.src = base64ProfilePicture;
    })
    profileImg.alt = postUser + ' Profile Picture';
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
    // likeIcon.src = './assets/notLiked.svg';
    likeIcon.className = 'like-icon';
    if (self_liked === "true") {
        likeIcon.src = "./assets/liked.svg";
        likeIcon.classList.add("liked");
    } else {
        likeIcon.src = "./assets/notLiked.svg";
        likeIcon.classList.add("notLiked");
    }
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
    likeIcon.addEventListener("click", (event) => {
        console.log("Like status is %s", event.target.classList.contains("liked"));
        // if (event.target.classList.contains("liked")) {
        //
        // } else {
        //
        // }
        console.warn("MESSAGE TYPE IS %s", event.target.classList.contains("liked") ? "unLikePost" : "likePost");
        ws.send(
            JSON.stringify(
                {
                    "messageType": event.target.classList.contains("liked") ? "unLikePost" : "likePost",
                    "postID": postID,
                    "cookieContent": document.cookie
                }
            )
        )
    })
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
// LOGIN FORM EVENT LISTENER


//SET UP SWITCH CASE FOR WEB SOCKET PACKET RECEPTION NATURE
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data["messageType"]) {
        case "verificationStatus": {
            if (data["verificationStatus"] !== true) {
                console.log("Not verified, hence requesting logInPageInnerHTML");
                xhr.open("GET", serverURL + "/logInPageInnerHTML", true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        console.log("ARRIVED: LOGIN.HTML")
                        bodyDiv.innerHTML = xhr.responseText;
                        const logInForm = document.querySelector(".login-form");
                        logInForm.addEventListener("submit", logInFormSubmit);
                        const switchForm = document.querySelector(".switch-form-link");
                        switchForm.addEventListener("click", renderSignUpPageHTML);
                    }
                }
                xhr.send();
            } else {
                console.log("Verified server side, hence requesting /mainPage")
                xhr.open("GET", serverURL + "/mainPageInnerHTML", true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        console.log("ARRIVED: MAIN_PAGE.HTML");
                        bodyDiv.innerHTML = xhr.responseText;
                        const homeMenu = document.querySelector(".home-menu");
                        addMenuEventListeners();
                        homeMenu.dispatchEvent(new Event("click"));
                        appState.currentMenu = "mainPage";
                    }
                }
                xhr.send();
            }
        }
            break;
        case "userFeedContent": {
            console.log("Feed content received!");
            console.log(data["userFeedContent"]);
            if (data["userFeedContent"].length === 0) {
                const posts = document.createElement("div");
                posts.id = "posts";
                posts.innerHTML = "<h1>Empty Feed. Follow users to start getting your feed!</h1>"
                bodyDiv.appendChild(posts);
            }
            data["userFeedContent"].map(post => {
                console.log(post);
                const {post_id, post_caption, post_total_likes, post_username, post_date, has_liked} = post;
                createInstagramPost(post_id, post_caption, post_total_likes, post_date, post_username, has_liked);
            })
            console.log("Loaded all posts");
        }
            break;
        case "followedUser": {
            console.log("Followed %s", data["target"]);
        }
            break;
        case "unFollowedUser": {
            console.log("Unfollowed user is %s", data["target"]);
        }
            break;
        case "latestAllChats": {
            console.log(data["allChatsContent"]);
            appState.allChats = [];
            data["allChatsContent"].map(lastMessage => {
                const {friend_name, message_content, message_date} = lastMessage;
                appState.allChats.push(friend_name);
                console.log(friend_name, message_content, message_date);
                createContactDiv(friend_name, message_content, message_date);
            })
        }
            break;
        case "fetchedChat": {
            console.log("Chats with one user %s", data["target"]);
            console.log(data["chats"]);
            renderCurrentChatHTML("/assets/default_profile.svg", data["target"], data["chats"], false);
        }
            break;
        case "userOnline": {
            console.log("%s is now online", data["username"]);
        }
            break;
        case "userOffline": {
            console.log("%s is now offline", data["username"]);
        }
            break;
        case "userTyping": {
            console.log("%s is typing... a message to you", data["target"]);
        }
            break;
        case "userNotTyping": {
            console.log("%s has stopped typing a message to you", data["target"]);
        }
            break;
        case "messageSentStatus": {
            if (data["messageSentStatus"]) {
                console.log("message was sent successfully!");
                const currentChat = document.querySelector(".chat-window");
                if (currentChat) {
                    console.log("Will render self message");
                    const chatWindow = document.querySelector(".chat-window>." + data["target"]);
                    const messagesDiv = document.querySelector(".messages");
                    if (chatWindow) {
                        console.warn("chat is still open!")
                        data["msg_owner"] = "self";
                        data["message_content"] = data["messageContent"];
                        data["message_date"] = data["messageDate"];
                        renderMessageHTML(document.querySelector(".messages"), data, false);
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        if (appState.allChats.includes(data["target"]) && appState.currentMenu === "messages") {
                            const contactBlockDiv = document.querySelector(".contact." + data["target"]);
                            console.log(contactBlockDiv.innerHTML);
                            const contactLastChat = contactBlockDiv.querySelector(".contact-box>.contact-last-chat");
                            const lastChatTime = contactBlockDiv.querySelector(".contact-box>.chat-time");
                            contactLastChat.innerText = data["messageContent"];
                            lastChatTime.innerText = formatDateTime(data["messageDate"]);
                        }
                    } else {
                        //IF THERE IS PREVIOUS CHAT HISTORY

                    }
                }
            }
        }
            break;
        case "newMessage": {
            console.log("%s has sent a new message to you.", data["sender"]);
            console.log(data["messageContent"]);
            // IF CURRENT CHAT IS WITH SENDER, APPEND MESSAGE TO CURRENT CHAT
            // ELSE, REPLACE LAST CHAT OF CONTACTS LIST SIDEBAR WITH THIS ONE
            const currentChat = document.querySelector(".chat-window");
            const messagesDiv = document.querySelector(".messages");
            // IF CHAT WINDOW IS OPEN
            if (currentChat) {
                const chatWindow = document.querySelector(".chat-window>." + data["sender"]);
                // IF SENDER CHAT IS OPEN
                if (chatWindow) {
                    data["msg_owner"] = data["sender"];
                    data["message_content"] = data["messageContent"];
                    data["message_date"] = data["messageDate"];
                    renderMessageHTML(document.querySelector(".messages"), data, false);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
                const contactsDiv = document.querySelector(".contacts");
                //IF THERE IS PREVIOUS CHAT HISTORY
                if (appState.allChats.includes(data["sender"]) && appState.currentMenu === "messages") {
                    const contactBlockDiv = document.querySelector(".contact." + data["sender"]);
                    console.log(contactBlockDiv.innerHTML);
                    const contactLastChat = contactBlockDiv.querySelector(".contact-box>.contact-last-chat");
                    const lastChatTime = contactBlockDiv.querySelector(".contact-box>.chat-time");
                    contactLastChat.innerText = data["messageContent"];
                    lastChatTime.innerText = formatDateTime(data["messageDate"]);
                }
            }
        }
            break;
        case "likeSuccessful": {
            console.log("like was successful");
            const postID = data["postID"];
            const likeIcon = document.querySelector(`.post${postID}>#content>#icons>.like-icon`);
            // likeIcon.style.scale = "1.3";
            likeIcon.classList.remove("notLiked");
            likeIcon.classList.add("liked");
            likeIcon.src = "./assets/liked.svg";
            const likePara = document.querySelector(`.post${postID}>#content>#likes`);
            updateLikeCounter(1, likePara);
        }
            break;
        case "unLikeSuccessful": {
            console.log("unlike was successful");
            const postID = data["postID"];
            const likeIcon = document.querySelector(`.post${postID}>#content>#icons>.like-icon`);
            // likeIcon.style.scale = "1";
            likeIcon.classList.remove("liked");
            likeIcon.src = "./assets/notLiked.svg";
            likeIcon.classList.add("notLiked");
            const likePara = document.querySelector(`.post${postID}>#content>#likes`);
            updateLikeCounter(-1, likePara);
        }
            break;
        case "userSearchResults": {
            document.querySelector(".user-search-results").innerHTML = "";
            console.log(d["userSearchResults"]);
            d["userSearchResults"].map(user => {
                const {username, is_followed, profile_picture} = user;
                addUserToSearchResult(profile_picture, username, is_followed);
            })
        }
            break;
    }
}

const updateLikeCounter = (displacement, likePara) => {
    let likesInt = parseInt(likePara.innerHTML.split(" ")[0]);
    likesInt += displacement;
    let likesStr = likePara.innerHTML.split(" ")[1];
    if (likesInt === 1) {
        likesStr = " like";
    } else {
        likesStr = " likes";
    }
    likePara.innerHTML = likesInt + likesStr;
}
//A CONDITIONAL BASED ON WINDOW.LOCATION.HREF THAT MAKES APPROPRIATE REQUESTS{}

ws.onopen = () => {
    console.log("Connected to the server");
    ///ENTRY POINT OF THE ENTIRE WEBAPP
    //IF ALREADY LOGGED IN, SERVER WILL RE-VERIFY CURRENT SOCKET CONNECTION
    //ELIMINATING NEED FOR LOG-IN WHENEVER WE GO OFFLINE OR CLOSE THE PAGE
    //CASE CONDITIONAL ON VERIFICATION STATUS OF SOCKET FROM SERVER
    ws.send(JSON.stringify(
        {
            messageType: "verificationStatus",
            cookieContent: document.cookie
        }
    ));
}


const renderSignUpPageHTML = () => {
    xhr.open("GET", serverURL + "/signUpPageInnerHTML", true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const loginPage = document.createElement("div");
            loginPage.className = "login-page";
            loginPage.innerHTML = xhr.responseText;
            bodyDiv.innerHTML = "";
            bodyDiv.appendChild(loginPage);
            document.querySelector(".login-page").addEventListener("submit", (event) => {
                signUpFormSubmit(event);
            })
            document.querySelector(".switch-form-link").addEventListener("click", () => {
                    ws.send(
                        JSON.stringify(
                            {
                                "messageType": "verificationStatus",
                                "cookieContent": document.cookie
                            }
                        )
                    )
                }
            )
        }
    }
    xhr.send();
}

const signUpFormSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    fetch(serverURL + "/signup", {
        method: "post",
        body: formData
    }).then(res => res.json()).then(status => {
        if (status["registerStatus"] === true) {
            setTimeout(redirectToLogin, 3000);
        } else {
            console.log("Failed to sign up");
        }
    })
}

const redirectToLogin = () => {
    ws.send(JSON.stringify(
        {
            "messageType": "verificationStatus",
            "cookieContent": document.cookie
        })
    )
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
                    "messageType": "verificationStatus",
                    "cookieContent": document.cookie
                }
            ))
            console.log("Send verificationStatus confirmation");
        }
    })
}


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


const fetchFeedPosts = () => {
    ws.send(
        JSON.stringify({
            "messageType": "fetchFeedPosts",
            "postsOffset": appState.oldestPostID,
            "cookieContent": document.cookie
        })
    )
}


const fetchLatestAllChats = () => {
    ws.send(
        JSON.stringify(
            {
                "messageType": "latestAllChats",
                "cookieContent": document.cookie
            }
        )
    )
}

const uploadImageEvent = (fileInput) => {
    if (fileInput.files.length > 0) {
        const image_file = fileInput["files"][0];
        if (image_file && (image_file.type === "image/jpeg" || image_file.type === "image/png")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                let formData = new FormData();
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
                        document.querySelector(".create-menu").dispatchEvent(new Event("click"));
                    }
                }
                uploadRequest.send(JSON.stringify({
                    base64Image: e.target.result,
                    imageCaption: document.querySelector(".upload-caption").value,
                    cookies: document.cookie
                }));
            }
            reader.readAsDataURL(image_file);
        }
    } else {
        console.log("No image to upload");
    }
}

const createFileInput = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.class = "input-image-upload";
    return fileInput;
}
const fileUploadListener = () => {
    const selectImageButton = document.querySelector('.select-image');
    const img = document.querySelector('.upload-image');
    if (selectImageButton.classList.contains('remove')) {
        console.log("Removing image from page");
        img.src = './assets/logo.svg';
        selectImageButton.textContent = 'Choose Image';
        selectImageButton.classList.remove('remove');
        //REMOVE IMAGE AND INSTEAD OF RESETTING ARRAY OF FILES IN FILE-INPUT, WE WILL DELETE THE FILE-INPUT ELEMENT AND CREATE A REPLICA OF IT WITHOUT THE LOADED FILE BUFFER
        return;
    }
    let fileInput = createFileInput();
    fileInput.addEventListener('change', (event) => {
        console.log("image uploaded")
        const file = event.target["files"][0];
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
    fileInput.click();
    return fileInput;
}
const addFeedMenuEventListener = () => {
    const feedMenu = document.querySelector(".home-menu");
    feedMenu.addEventListener("click", () => {
        console.log("clicked on feedMenu");
        //IF ANY OTHER MENU DIVS ARE PRESENT, REMOVE THEM
        const feedPostsDiv = document.querySelector("#posts");
        if (feedPostsDiv) {
            bodyDiv.removeChild(feedPostsDiv);
        }
        const messagesContentDiv = document.querySelector(".container");
        if (messagesContentDiv) {
            bodyDiv.removeChild(messagesContentDiv);
        }
        const uploadAreaDiv = document.querySelector(".upload-area");
        if (uploadAreaDiv) {
            bodyDiv.removeChild(uploadAreaDiv);
        }
        // REFRESH APP-STATE WITH OLDEST POST ID AND PAGE NAME
        appState.oldestPostID = 0;
        appState.currentMenu = "mainPage";
        // REQUEST LATEST 25 FEED POSTS
        ws.send(
            JSON.stringify(
                {
                    "messageType": "fetchFeedPosts",
                    "oldestPostID": appState.oldestPostID,
                    "cookieContent": document.cookie
                }
            ));
    })
}
const addChatMenuEventListener = () => {
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
                bodyDiv.insertAdjacentHTML("beforeend", xhr.responseText);
                document.querySelector(".chat-self-username").innerText = getCookieValue("username");
                fetchLatestAllChats();
                appState.currentMenu = "messages";
            }
        }
        xhr.send();
    })
}

const addExploreMenuEventListener = () => {
    const exploreMenu = document.querySelector(".explore-menu");
    exploreMenu.addEventListener("click", () => {
        if (["mainPage", "home", "messages", "create"].includes(appState.currentMenu)) {
            console.log("Explore Menu. Coming Soon");
        }
    });
}

const addUploadImageEventListener = () => {
    const selectImageButton = document.querySelector('.select-image');
    selectImageButton.addEventListener('click', () => {
        const newFileInput = fileUploadListener();
        const uploadButton = document.querySelector(".post-button");
        uploadButton.addEventListener("click", () => uploadImageEvent(newFileInput));
    });

}
const addCreateMenuEventListener = () => {
    const createMenu = document.querySelector(".create-menu");
    createMenu.addEventListener("click", () => {
        const containerDiv = document.querySelector(".container");
        const feedDiv = document.querySelector("#posts");
        const uploadArea = document.querySelector(".upload-area");
        //REMOVE BLUR FILTERS ON ALL ELEMENT WINDOWS IF UPLOAD AREA IS PRESENTS
        if (uploadArea) {
            document.querySelector("body").removeChild(uploadArea);
            if (containerDiv) {
                containerDiv.style.filter = "none";
            }
            if (feedDiv) {
                feedDiv.style.filter = "none";
            }
            return;
        }
        xhr.open("GET", serverURL + "/imageUploadInnerHTML", true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                document.querySelector("body").insertAdjacentHTML("beforeend", xhr.responseText);
                //SET OTHER ITEMS TO GREY COLOR IF THEY EXIST
                if (containerDiv) {
                    containerDiv.style.filter = "blur(2px)";
                }
                if (feedDiv) {
                    feedDiv.style.filter = "blur(2px)";
                }
                appState.currentMenu = "create";
                addUploadImageEventListener();
            }
        }
        xhr.send();
    })
}

const addMenuEventListeners = () => {
    addFeedMenuEventListener();
    addChatMenuEventListener();
    addExploreMenuEventListener();
    addCreateMenuEventListener();
    const bodyDiv = document.querySelector("body");
    document.querySelector(".sign-out").addEventListener("click", () => {
        console.log("Trying to sign out...");
        xhr.open("GET", serverURL + "/signOut", true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                ws.send(JSON.stringify(
                    {
                        messageType: "verificationStatus",
                        cookieContent: document.cookie
                    }
                ));
            }
        }
        xhr.send();

    })
}


////RENDERING HTML PORTIONS OF THE WEBAPP
const renderCurrentChatHTML = (profilePicture, username, messages) => {
    let mainDiv = document.querySelector(".main");
    const chatWindow = document.querySelector(".chat-window");
    if (mainDiv) {
        chatWindow.removeChild(mainDiv);
    }
    mainDiv = document.createElement('div');
    mainDiv.className = 'main ' + username;

    let headerDiv = document.createElement('div');
    headerDiv.className = 'header';

    let img = document.createElement('img');
    img.src = profilePicture;
    img.alt = username;

    let nameDiv = document.createElement('div');
    nameDiv.textContent = username;

    headerDiv.appendChild(img);
    headerDiv.appendChild(nameDiv);

    let messagesDiv = document.createElement('div');
    messagesDiv.className = 'messages scrollbar';

    let label = document.createElement('label');
    label.className = 'logup-field chat-text-label';

    let input = document.createElement('input');
    input.id = 'chat-text-input';
    input.name = 'current-chat-text';
    input.type = 'text';
    input.placeholder = ' ';

    let span = document.createElement('span');
    span.className = 'placeholder';
    span.textContent = 'Type a message';
    label.appendChild(input);
    label.appendChild(span);

    let button = document.createElement('button');
    button.type = 'button';
    button.className = 'send-message submit-button';
    button.textContent = 'Send';
    input.addEventListener("input", (event) => {
        if (event.target["value"].trim().length > 0) {
            button.classList.add("button-enabled");
        } else {
            button.classList.remove("button-enabled");
        }
    })
    // INSERT ALL MESSAGE BLOCKS FROM EARLIEST TO LATEST
    console.log(messages);
    mainDiv.appendChild(headerDiv);
    if (messages) {
        messages.map(message => {
            console.log(message);
            renderMessageHTML(messagesDiv, message, true);
        })
    }
    appState.currentChat = username;
    mainDiv.appendChild(messagesDiv);
    mainDiv.appendChild(label);
    mainDiv.appendChild(button);
    chatWindow.appendChild(mainDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    const chatTextInput = document.querySelector("#chat-text-input");
    chatTextInput.addEventListener("focus", () => {
            ws.send(
                JSON.stringify(
                    {
                        "messageType": "typing",
                        "target": username,
                        "cookieContent": document.cookie
                    }
                )
            )
        }
    );
    chatTextInput.addEventListener("blur", () => {
        ws.send(
            JSON.stringify(
                {
                    "messageType": "notTyping",
                    "target": username,
                    "cookieContent": document.cookie
                }
            )
        )
    })
    //CHAT SENT BUTTON
    const chatSendButton = document.querySelector(".send-message");
    chatSendButton.addEventListener("click", () => {
        const messageContent = chatTextInput.value.trim();
        if (messageContent.length > 0) {
            ws.send(
                JSON.stringify(
                    {
                        "messageType": "sendMessage",
                        "receiver": username,
                        "messageContent": messageContent,
                        "cookieContent": document.cookie
                    }
                )
            )
            chatTextInput.value = "";
            chatSendButton.classList.remove("button-enabled");
        }
    })
    chatTextInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            chatSendButton.dispatchEvent(new Event("click"));
        } else if (event.key === "Enter" && event.shiftKey) {
            event.target.value += "\n";
        }
    })
    // chatSendButton.innerHTML = "Send";
    // chatSendButton.className = "send-message";
    // messagesDiv.appendChild(chatSendButton);
}

renderMessageHTML = (messagesDiv, message, before) => {
    const messageReceivedDiv = document.createElement('div');
    if (message["msg_owner"] === "self") {
        messageReceivedDiv.className = 'message sent';
    } else {
        messageReceivedDiv.className = 'message received';
    }
    if (!before) {
        messageReceivedDiv.className += ' new-message';
    }
    const textReceivedDiv = document.createElement('div');
    textReceivedDiv.className = 'text';
    textReceivedDiv.textContent = message["message_content"];

    const messageTimeReceived = document.createElement('p');
    messageTimeReceived.className = 'message-time';
    messageTimeReceived.textContent = message["message_date"];

    textReceivedDiv.appendChild(messageTimeReceived);
    messageReceivedDiv.appendChild(textReceivedDiv);
    if (before) {
        messagesDiv.insertBefore(messageReceivedDiv, messagesDiv.firstChild);
    } else {
        messagesDiv.appendChild(messageReceivedDiv);
    }
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

const createContactDiv = (username, messageContent, messageDate) => {
    const contacts = document.querySelector(".contacts");
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact ' + username;

// Create the img element
    const profileImg = document.createElement('img');
    // img.src = './assets/hijab.jpg';
    fetch(serverURL + "/profilePicture/" + username).then(res => res.json()).then(data => {
        if (!data["image_present"]) {
            profileImg.src = "./assets/default_profile.svg";
            return;
        }
        const base64ProfilePicture = data["base64ProfilePicture"];
        profileImg.src = base64ProfilePicture;
    })
    profileImg.alt = username + " profile picture";

// Create the contact-box div
    const contactBox = document.createElement('div');
    contactBox.className = 'contact-box';

// Create the contact-name div
    const contactName = document.createElement('div');
    contactName.className = 'contact-name';
    contactName.textContent = username;

// Create the contact-last-chat div
    const contactLastChat = document.createElement('div');
    contactLastChat.className = 'contact-last-chat';
    if (messageContent.length > 100) {
        messageContent = messageContent.substring(0, 100) + "...";
    }
    contactLastChat.textContent = messageContent.substring(0, 103);

// Create the chat-time div
    const chatTime = document.createElement('div');
    chatTime.className = 'chat-time';
    chatTime.textContent = formatDateTime(messageDate);

// Append elements to their respective parents
    contactBox.appendChild(contactName);
    contactBox.appendChild(contactLastChat);
    contactBox.appendChild(chatTime);
    contactDiv.appendChild(profileImg);
    contactDiv.appendChild(contactBox);
    contactDiv.class = username;
    contactDiv.addEventListener("click", () => {
        ws.send(
            JSON.stringify(
                {
                    "messageType": "fetchChat",
                    "oldestMessageID": 0,
                    "target": username,
                    "cookieContent": document.cookie
                }
            )
        )
    })
    contacts.appendChild(contactDiv);
}

const formatDateTime = (datetimeString) => {
    const inputDate = new Date(datetimeString);
    const currentDate = new Date();

    const diffInMilliseconds = currentDate - inputDate;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

    if (diffInHours > 12 && currentDate.getDate() === inputDate.getDate() + 1) {
        return "Yesterday";
    } else if (diffInHours < 24) {
        const hours = inputDate.getHours();
        const minutes = inputDate.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes}${ampm}`;
    } else {
        const day = inputDate.getDate().toString().padStart(2, '0');
        const month = (inputDate.getMonth() + 1).toString().padStart(2, '0');
        const year = inputDate.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
    }
}

const openNewChat = (username) => {
    const chatMenu = document.querySelector(".messages-menu");
    chatMenu.dispatchEvent(new Event("click"));
    setTimeout(() => {
        renderCurrentChatHTML("/assets/default_profile.svg", username, null)
    }, 100);
}

const getCookieValue = (cookieName) => {
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=').map(part => part.trim());
        if (key === cookieName) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

const addUserSearchEventListener = () => {
    document.querySelector(".user-search").addEventListener("input", (event) => {
        ws.send(
            JSON.stringify(
                {
                    "messageType": "userSearch",
                    "name": event.target["value"]
                }
            )
        )
    })
}

const addUserToSearchResult = (profileSrc, username, follows) => {
    const searchResultUser = document.createElement("div");
    //ADD ACTUAL USERNAME AS ID UPON WS.ONMESSAGEREQ
    searchResultUser.className = "search-result user " + username;
    const searchResultProfile = document.createElement("img");
    //SET SRC UPON WS.ONMESSAGEREQ
    if (profileSrc === null) {
        searchResultProfile.src = "/public/user/Instagram.jpg";
    } else {
        searchResultProfile.src = profileSrc;
    }
    searchResultProfile.className = "search-result-profile";
    const searchResultUsername = document.createElement("h3");
    // SET FROM WS.ONMESSAGE AS WELL
    searchResultUsername.innerHTML = username
    const followButton = document.createElement("button");
    // MODIFY ON BASIS OF FOLLOWING OR NOT FOLLOWING
    // SET ONCLICK LISTENER ACCORDINGLY
    if (!follows) {
        followButton.innerHTML = "Follow";
    } else {
        followButton.innerHTML = "Unfollow";
    }
    searchResultUser.appendChild(searchResultProfile);
    searchResultUser.appendChild(searchResultUsername);
    searchResultUser.appendChild(followButton);
    document.querySelector(".user-search-results").appendChild(searchResultUser);
}


const addSearchChatEventListener = () => {
    const searchChats = document.querySelector(".chat-search");
    const filteredContacts = [];
    searchChats.addEventListener("input", (event) => {
        const filteredContactNames = appState.allChats.filter(contactName => contactName.indexOf(event.target[value]) > -1);
        // for (let i = 0; i < )
    });
    createContactDiv(friend_name, message_content, message_date);
}