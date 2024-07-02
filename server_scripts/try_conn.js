const mysql = require('mysql2');
const EventEmitter = require('events');

class MySQLConnectionManager extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.connection = null;
    }

    connect() {
        this.connection = mysql.createConnection(this.config);

        this.connection.connect((err) => {
            if (err) {
                console.error('Error connecting to the database:', err);
            } else {
                console.log('Connected to the database');
            }
        });

        this.connection.on('error', (err) => {
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('Connection lost, reconnecting...');
                this.connect();
            } else {
                console.error('Database error:', err);
                this.emit('error', err);
            }
        });

        this.connection.on('end', () => {
            console.log('Connection closed');
            this.emit('connectionClosed');
        });
    }

    close() {
        if (this.connection) {
            this.connection.end((err) => {
                if (err) {
                    console.error('Error closing the connection:', err);
                } else {
                    console.log('Connection closed');
                }
            });
        }
    }

    executeQuery(query) {
        if (this.connection) {
            this.connection.query(query, (err, results, fields) => {
                if (err) {
                    console.error('Error executing query:', err);
                } else {
                    console.log('Query executed successfully', results);
                }
            });
        } else {
            console.log('Connection is closed');
        }
    }
}

// Example usage
const config = {
    host: 'your_host',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database'
};

const manager = new MySQLConnectionManager(config);

// Set the connection closed event listener
manager.on('connectionClosed', () => {
    console.log('Connection closed event triggered');
});

// Connect to the database
manager.connect();

// Execute a query
manager.executeQuery('YOUR SQL QUERY HERE');

// Close the connection after some time (for demonstration purposes)
setTimeout(() => {
    manager.close();
}, 5000);

module.exports = { MySQLConnectionManager }