let appState = {
    currentMenu: "home",
    loadedPosts: 0,
    currentChat: null,
}

const serverURL = "http://localhost:5000";
const webSocketURL = "ws://localhost:5050";
// let boldNavbarOption = document.querySelector("." + appState.currentMenu + "-menu-text");
// boldNavbarOption.style.fontWeight = "bold";
const containerDiv = document.querySelector(".app-container");

/////////////////////////////////////////////
////////////////////////////////////////////
const constructPost = (post) => {
    const postDiv = document.createElement("div");
    postDiv.classList.add("post");
    const postUserDiv = document.createElement("div");
    postUserDiv.classList.add("post-user");
    const postUserProfile = document.createElement("img");
    postUserProfile.classList.add("post-user-profile");
    const postUsername = document.createElement("p");
    postUserDiv.appendChild(postUserProfile);
    postUserDiv.appendChild(postUsername);
    postDiv.appendChild(postUserDiv);
    const postImageDiv = document.createElement("div");
    postImageDiv.classList.add("post-image-div");
    const postImage = document.createElement("img");
    postImage.classList("postImage");
    const imageInteractionDiv = document.createElement("div");
    imageInteractionDiv.classList.add("image-interaction");
    postImageDiv.appendChild(postImage);
    postImageDiv.appendChild(imageInteractionDiv);
    const likesDiv = document.createElement("div");
    likesDiv.classList("likes-div");
    const likesImg = document.createElement("img");
    likesDiv.appendChild(likesImg);
    const shareDiv = document.createElement("div");
    const shareImg = document.createElement("img");
    shareDiv.appendChild(shareImg);
    shareDiv.classList("share-div");
    imageInteractionDiv.appendChild(likesDiv);
    imageInteractionDiv.appendChild(shareDiv);
    const imgStatsDiv = document.createElement("img-stats");
    const likesParagraph = document.createElement("p");
    imgStatsDiv.appendChild(likesParagraph);
}




const ws = new WebSocket(webSocketURL);

ws.onopen = () => {
    console.log("Connected to the server");

    switch (appState.currentMenu) {
        case "home": {
            ws.send(JSON.stringify({
                messageType: "feedRequest",
                loadedPosts: appState.loadedPosts
            }))
        }
    }
}


/////////////////////////////////////////////
///on document load verify session status///
///if session status is verified, check
///appState.
///Then, construct page based on appState?///
window.addEventListener("onload", () => {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
            messageType: "verificationStatus"
        }));
    }
})
/////////////////////////////////////////////
/////////websocket received messages/////////
////////////////////////////////////////////
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.messageType === "verificationStatus") {
        const verificationStatus = data["verificationStatus"];
        console.log(verificationStatus);
        if (!verificationStatus) {
            console.log("Not logged in");
        } if (appState.currentMenu !== "logUp") {
            // appState.currentMenu = "logUp";
            containerDiv.innerHTML = "";
            ws.send(JSON.stringify(
                {
                    messageType: "innerHTML",
                    pageName: "logIn"
                }
            ));
        }
    }

    //other material with socket message
    else if (data.messageType === "pageInnerHTML") {
        console.log("Received material");
        const pageName = data.pageName;
        console.log(pageName);
        switch (pageName) {
            case "logIn": {
                console.log("Received logInPageContent");
                console.log(data.pageContent);
                containerDiv.innerHTML = "";
                containerDiv.innerHTML = data.pageContent
                const loginForm = document.querySelector("form");
                loginForm.addEventListener("submit", (event) => {
                    event.preventDefault();
                    const usernameEmail = event.target[0].value;
                    const password = event.target[1].value;
                    console.log(usernameEmail);
                    console.log(password);
                    fetch(serverURL + "/login", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            "usernameEmail": usernameEmail,
                            "password": password
                        })
                    }).then(res => res.json()).then(status => {
                        if (status["loginStatus"] === false) {
                            console.log("Failed to login...");
                        } else {
                            console.log("Logged in...")
                            console.log("Rendering main page in 3 seconds...");
                            setTimeout(renderMainPage, 3000);
                        }
                    })
                })
                const switchFormLink = document.querySelector(".switch-form-link");
                switchFormLink.addEventListener("click", (event) => {
                    ws.send(JSON.stringify(
                        {
                            messageType: "innerHTML",
                            pageName: "signUp"
                        }
                    ))
                })
            } break;
            case "signUp": {
                console.log("Received signUpPageContent");
                console.log(data.pageContent);
                containerDiv.innerHTML = "";
                containerDiv.innerHTML = data.pageContent;
                const switchFormLink = document.querySelector(".switch-form-link");
                switchFormLink.addEventListener("click", (event) => {
                    ws.send(JSON.stringify(
                        {
                            messageType: "innerHTML",
                            pageName: "logIn"
                        }
                    ))
                })
                const signUpForm = document.querySelector("form");
                signUpForm.addEventListener("submit", (event) => {
                    event.preventDefault();
                    const values = event.target;
                    console.log("Signing up...")
                    fetch(serverURL + "/signup", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: values[0].value,
                            fullName: values[1].value,
                            username: values[2].value,
                            password: values[3].value
                        })
                    }).then(res => res.json()).then(status => {
                        if (status["registerStatus"] === false) {

                        } else {
                            console.log("Successfully registered!");
                            console.log("Redirecting in 3 seconds...");
                            setTimeout(switchFormLink.click, 3000);
                            switchFormLink.click();
                        }
                    })
                })
            } break;
            case "mainPage": {
                console.log("Received main page content");
                containerDiv.innerHTML = "";
                containerDiv.innerHTML = data["pageContent"];
                containerDiv.classList.add("app-container-main-app");
                renderFeedPage();
                fetchFeedPosts();
            } break;
            case "userFeed": {
                // CONSTRUCT CONTAINERDIV FOR USER FEED

            }
        }
    } else if (data.messageType === "userFeedContent") {
        const posts = data["userFeedContent"];
        console.log("userFeedContent was successfully fetched")
    }
    // else if (data.messageType === "userFeedStatus") {
    //     if (data["userFeedStatus"] === true) {
    //         containerDiv.innerHTML = "";
    //         //MAKE FINAL FEED REQUEST
    //         ws.send(JSON.stringify(
    //             {

    //             }
    //         ))
    //     }
    // }
}

/////////////////////////////////////////////
/////////////////////////////////////////////
/////////////////////////////////////////////

const renderMainPage = () => {
    ws.send(JSON.stringify({
        "messageType": "innerHTML",
        "pageName": "mainPage",
        "cookieContent": document.cookie
    }))
}

const renderFeedPage = () => {
    ws.send(
        JSON.stringify({
            "messageType": "innerHTML",
            "pageName": "userFeed",
            "cookieContent": document.cookie
        })
    )
}


const fetchFeedPosts = () => {
    ws.send(
        JSON.stringify({
            "messageType": "fetchFeedPosts",
            "postsOffset": appState.loadedPosts,
            "cookieContent": document.cookie
        })
    )
}