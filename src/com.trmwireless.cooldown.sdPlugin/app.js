/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />

const myAction = new Action('com.trmwireless.cooldown.cooldownTimer');
const CLEAR_SCREEN_DELAY_MS = 3000;

/**
 * The first event fired when Stream Deck starts
 */
$SD.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
	console.log('Stream Deck connected!');
});

myAction.onKeyUp(({ action, context, device, event, payload }) => {
	
	console.log('Your key code goes here!');
	var c = document.getElementById("cooldownCanvas");
	var ctx = c.getContext("2d");
	ctx.fillStyle = RGB(255, 0, 0);
	ctx.globalAlpha = 0.5;
	ctx.fillRect(0, 0, 144, 144);

	var timeout = timeoutPromise(CLEAR_SCREEN_DELAY_MS).then(() => {
		ctx.clearRect(0, 0, 144, 144);
	});
});

function timeoutPromise(duration) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}
