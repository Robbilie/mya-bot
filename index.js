const { driver } = require("@rocket.chat/sdk");
const fetch = require("node-fetch");
const { HOST, USER, PASS, BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD, ROOM_LIST } = process.env;
const SSL = true;
const ROOMS = ROOM_LIST.split(",");
const packageJson = require("./package.json");

const runbot = async () => {
    const conn = await driver.connect({ host: HOST, useSsl: SSL })
    const myuserid = await driver.login({ username: USER, password: PASS });
    const roomsJoined = await driver.joinRooms(ROOMS);
    console.log('joined rooms');

    // set up subscriptions - rooms we are interested in listening to
    const subscribed = await driver.subscribeToMessages();
    console.log('subscribed');

    // connect the processMessages callback
    const msgloop = await driver.reactToMessages(processMessages(myuserid));
    console.log('connected and waiting for messages');
}

// callback for incoming messages filter and processing
const processMessages = (myuserid) => async(err, message, messageOptions) => {
	if (err) {
		return;
	}
	// filter our own message
	if (message.u._id === myuserid) {
		//return;
	}
	// can filter further based on message.rid
	const roomname = await driver.getRoomName(message.rid);
	if (!message.msg.toLowerCase().startsWith("!")) {
		return;
	}
	const args = message.msg.slice(1).split(" ");
	switch (args[0]) {
		case "version":
			handleVersionCheck(roomname)(...args.slice(1));
			break;
		case "live":
			handleLiveCheck(roomname)();
			break;
		case "help":
			handleHelp(roomname)();
			break;
		case "health":
			handleHealth(roomname)(...args.slice(1));
			break;
	}
}

const handleVersionCheck = (roomname) => async (env, shortName = "mwa") => {
	const response = await fetch(
		`https://${env}.retailservices.audi.de/${shortName}/v1/management/info`,
		{
			headers: {
				"Authorization": `Basic ${Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString("base64")}`,
			},
		},
	);
	const data = await response.json();
	const sentmsg = await driver.sendToRoom(
		`${env} ${shortName} ${data.build.version}`,
		roomname,
	);
}

const handleLiveCheck = (roomname) => async () => {
	const response = await fetch("https://my.audi.com");
	const sentmsg = await driver.sendToRoom(
		`Current Live Env: live${response.headers.get('x-myaudi')}`,
		roomname,
	);
}

const handleHelp = (roomname) => async () => {
	const message = `Hello my name is ${packageJson.name} v${packageJson.version} and I can do the following things:
*!version [ENV] [SHORTNAME]*
Tells you the currently deployment version of a deployment in a given environment.
- ENV: currently intm1/intm2/qam1/qam2/livem1/livem2
- SHORTNAME: optional, defaulting to mwa, the webapp, can be any via the api gw accessible shortname 
*!live*
Tells you which livem environment is currently visible to the customer.
*!help*
Displays this output.
`;
	const sentmsg = await driver.sendToRoom(
		message,
		roomname,
	);
}

const handleHealth = (roomname) => async (env) => {
	// not doing anything rn
}

runbot();