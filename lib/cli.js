/*
 * CLI-related tasks
 *
 */

// Dependencies
const readline = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");
class _events extends events { };
const e = new _events();
const os = require("os");
const v8 = require("v8");
const _data = require("./data");
const helpers = require("./helpers");

// Instantiate the cli module object
const cli = {};

// Declare the interface at the top level so that we can re-init the prompt after each event is complete
let _interface;

// Input handlers
e.on("man", _ => {
    cli.responders.help();
});

e.on("help", _ => {
    cli.responders.help();
});

e.on("exit", _ => {
    cli.responders.exit();
});

e.on("stats", _ => {
    cli.responders.stats();
});

e.on("list users", async _ => {
    await cli.responders.listUsers();
});

e.on("more user info", str => {
    cli.responders.moreUserInfo(str);
});

e.on("responderDone", _ => {
    _interface.prompt();
});

// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = _ => {
    // Codify the commands and their explanations
    const commands = {
        "exit": "Kill the CLI (and the rest of the application)",
        "man": "Show this help page",
        "help": "Alias of the 'man' command",
        "stats": "Get statistics on the underlying operating system and resource utilization",
        "list users": "Show a list of all the registered (undeleted) users in the system",
        "more user info --{userId}": "Show details of a specified user",
    };

    // Show a header for the help page that is as wide as the screen
    cli.horizontalLine();
    cli.centered("CLI MANUAL");
    cli.horizontalLine();
    cli.verticalSpace(2);

    // Show each command, followed by its explanation, in white and yellow respectively
    Object.keys(commands).forEach(key => {
        const description = commands[key];
        const command = ` \x1b[33m${key}\x1b[0m`;
        const padding = " ".repeat(60 - command.length);
        const line = command + padding + description;
        console.log(line);
        cli.verticalSpace();
    });
    cli.verticalSpace(1);

    // End with another horizontal line
    cli.horizontalLine();

    // Signal that the work is done, which will re-init the prompt
    e.emit("responderDone");
};

// Exit
cli.responders.exit = _ => {
    process.exit(0);
};

// Stats
cli.responders.stats = _ => {
    // Compile an object of stats
    const stats = {
        "Load Average": os.loadavg().join(" "),
        "CPU Count": os.cpus().length,
        "Free Memory": os.freemem(),
        "Current Malloced Memory": v8.getHeapStatistics().malloced_memory,
        "Peak Malloced Memory": v8.getHeapStatistics().peak_malloced_memory,
        "Allocated Heap Used (%)": Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
        "Available Heap Allocated (%)": Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
        "Uptime": os.uptime() + " Seconds"
    };

    // Create a header for the stats
    cli.horizontalLine();
    cli.centered("SYSTEM STATISTICS");
    cli.horizontalLine();
    cli.verticalSpace(2);

    // Log out each stat
    Object.keys(stats).forEach(key => {
        const stat = stats[key];
        const command = ` \x1b[33m${key}\x1b[0m`;
        const padding = " ".repeat(60 - command.length);
        const line = command + padding + stat;
        console.log(line);
        cli.verticalSpace();
    });

    // Create a footer for the stats
    cli.verticalSpace();
    cli.horizontalLine();

    // Signal that the work is done, which will re-init the prompt
    e.emit("responderDone");
};

// List Users
cli.responders.listUsers = async _ => {
    const userIds = await _data.list("users");
    if (userIds.length <= 0) {
        return;
    }

    // Wait for all listings to complete before exiting this function
    await Promise.all(userIds.map(async userId => {
        const userData = await _data.read("users", userId);
        const numberOfOrders = typeof (userData.orders) == "object" && userData.orders instanceof Array && userData.orders.length > 0 ? userData.orders.length : 0;
        const line = `Name: ${userData.firstName} ${userData.lastName} E-mail: ${userData.email} Orders: ${numberOfOrders}`;
        console.log(line);
        cli.verticalSpace();
    }));

    // Signal that the work is done, which will re-init the prompt
    e.emit("responderDone");
};

// More user info
cli.responders.moreUserInfo = function (str) {
    // Get ID from string
    /* var arr = str.split('--');
    var userId = typeof (arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
    if (userId) {
        // Lookup the user
        _data.read('users', userId, function (err, userData) {
            if (!err && userData) {
                // Remove the hashed password
                delete userData.hashedPassword;

                // Print their JSON object with text highlighting
                cli.verticalSpace();
                console.dir(userData, { 'colors': true });
                cli.verticalSpace();
            }
        });
    } */

    // Signal that the work is done, which will re-init the prompt
    e.emit("responderDone");
};

// Create a vertical space
cli.verticalSpace = lines => {
    lines = typeof (lines) == "number" && lines > 0 ? lines : 1;

    // Print the number of newlines equal to 'lines'
    // Subtract by one because console.log itself adds a newline
    console.log("\n".repeat(lines - 1));
};

// Create a horizontal line across the screen
cli.horizontalLine = _ => {
    // Get the available screen size
    const width = process.stdout.columns;

    // Put in enough dashes to go across the screen
    console.log("-".repeat(width));
};

// Create centered text on the screen
cli.centered = str => {
    str = typeof (str) == "string" && str.trim().length > 0 ? str.trim() : "";

    // Get the available screen size
    const width = process.stdout.columns;

    // Calculate the left padding there should be
    const leftPaddingSize = Math.floor((width - str.length) / 2);

    // Put in left padded spaces before the string itself
    const padding = " ".repeat(leftPaddingSize);
    console.log(padding + str);
};

// Input processor
cli.processInput = str => {
    str = typeof (str) == "string" && str.trim().length > 0 ? str.trim() : false;
    // Only process the input if the user actually wrote something, otherwise ignore it
    if (str) {
        // Codify the unique strings that identify the different unique questions allowed be the asked
        const uniqueInputs = [
            "man",
            "help",
            "exit",
            "stats",
            "list users",
            "more user info",
        ];

        // Go through the possible inputs, emit event when a match is found
        const matchFound = uniqueInputs.some(input => {
            if (str.toLowerCase().indexOf(input) > -1) {
                // Emit event matching the unique input, and include the full string given
                e.emit(input, str);
                return true;
            }
        });

        // If no match is found, tell the user to try again
        if (!matchFound) {
            console.log("Sorry, try again");
            return false;
        }
    }
};

// Init script
cli.init = _ => {

    // Send to console, in dark blue
    console.log("\x1b[34m%s\x1b[0m", "The CLI is running");

    // Start the interface
    _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> "
    });

    // Create an initial prompt
    _interface.prompt();

    // Handle each line of input separately
    _interface.on("line", async str => {
        // Send to the input processor
        cli.processInput(str);
    });

    // If the user stops the CLI, kill the associated process
    _interface.on("close", function () {
        process.exit(0);
    });

};

// Export the module
module.exports = cli;
