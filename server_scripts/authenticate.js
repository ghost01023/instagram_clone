const authenticateUser = (seltzer, username, connection) => {
    return new Promise((resolve) => {
        if (!seltzer || !username) {
            resolve(false);
        }
        const checkCookieQuery = `SELECT CASE WHEN COUNT(*)=1 THEN true ELSE false END AS authenticated FROM cookies WHERE seltzer="${seltzer}" AND user_id=(SELECT id FROM users WHERE username="${username}");`;
        connection.query(checkCookieQuery, (error, results) => {
            if (error) {
                console.log(error);
                resolve(false);
            } else if (results.length) {
                if (results[0]["authenticated"] === 1) {
                    console.log("Authenticated", username);
                    resolve(true);
                } else {
                    console.log("!Authenticated", username);
                    resolve(false);
                }
            }
        })
    })
}




module.exports = { authenticateUser }