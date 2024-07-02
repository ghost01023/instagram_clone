let appState = {
    currentMenu: "feed",
    oldestPostID: 0,
    currentChat: null,
    oldestMessageID: 0,
    lastPostReached: false
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
const createInstagramPost = (postID, postCaption, postLikes, postDate, postUser) => {
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
            data["userFeedContent"].map(post => {
                console.log(post);
                const {post_id, post_caption, total_likes, post_username, post_date} = post;
                createInstagramPost(post_id, post_caption, total_likes, post_date, post_username);
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
            data["allChatsContent"].map(lastMessage => {
                const {friend_name, message_content, message_date} = lastMessage;
                console.log(friend_name, message_content, message_date);
                createContactDiv(friend_name, message_content, message_date);
            })
        }
    }
}
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
//                 fetchLatestAllChats();
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
                console.log(xhr.responseText);
                bodyDiv.insertAdjacentHTML("beforeend", xhr.responseText);
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
    let mainDiv = document.createElement('div');
    mainDiv.className = 'main';

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

const createContactDiv = (username, messageContent, messageDate) => {
    const contacts = document.querySelector(".contacts");
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact';

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
