/**
 * Functions related to bootstrapping the server: creating required folders etc.
 */

// Dependencies
const _data = require("./data");
const helpers = require("./helpers");

// Instantiate the library object
lib = {};

// Bootstrap the server
lib.do = async () => {
    // Create required folders
    helpers.createRequiredFolders();

    // Resolve HTTPS certificate and key files
    try {
        _data.getHttpsCertAndKey();
    } catch (e) {
        // throw Error("Could not find HTTPS key and certificate files");
        console.log("\x1b[31m%s\x1b[0m", "Could not find HTTPS key and certificate files, only running HTTP server");
    }

    // Read menu items into memory for faster access
    await _data.getMenuItems();

    return;
}

module.exports = lib;