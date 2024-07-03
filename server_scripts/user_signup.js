const registerUser = (req, res, connection) => {
    console.log("Inside registerUser()");
    // let { email, fullName, username, password } = req.body;
    // let credentials = [email, fullName, username, password];
    const credentials = Object.values(req.body).map(val => {
        console.log(val);
        val = val.trim();
        if (val.length === 0) {
            return "NULL";
        } else {
            return val;
        }
    });
    const [email, fullName, username, password] = credentials;
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


module.exports = { registerUser };