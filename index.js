/**
 * Primary file of the REST API
 */

// Dependencies
const bootstrap = require("./lib/bootstrap");
const server = require("./lib/server");
const cli = require("./lib/cli");

// Declare the app
let app = {};

// Init function
app.init = async () => {
    try {
        // Bootstrap the server
        await bootstrap.do();
        // Start the server
        await server.init();
        // Start the CLI
        cli.init();    
    } catch (error) {
        // Explode if we get here because then something is wrong
        throw error;
    }
};

// Execute
app.init();

// Export the app
module.exports = app;