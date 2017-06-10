const startInterval = 1000*60*60;
const Nightmare = require('nightmare');
const path = require('path');
const fs = require ('fs');
const ms = require('pretty-ms');

const logDir = "./logs";
const debugDir = "./debug";

let nightmare = new Nightmare({
  waitTimeout: 5000, // in ms
  gotoTimeout: 5000,
  width: 1024,
  height: 768
})
if(!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}
if(!fs.existsSync(debugDir)){
    fs.mkdirSync(debugDir);
}
console.log("start");
function keepSessionAlive(){
    return nightmare
        .goto("https://blackboard.vcu.edu/webapps/bb-auth-provider-cas-bb_bb60/execute/casLogin?cmd=login&authProviderId=_106_1&redirectUrl=https%3A%2F%2Fblackboard.vcu.edu%2Fwebapps%2Fportal%2Fframeset.jsp")
        .wait('body');
}

function isLoggedIn(interval=0){
    nightmare.cookies.get({ url: null }).then( (cookies) => {
        fs.writeFile(`./logs/${ms(interval, {compact: true})}.cookie`, cookies.map( cookie => JSON.stringify(cookie)), (err) => {
            if(err){
                console.log(err);
            }
        })
    })
    return nightmare
        .goto('https://blackboard.vcu.edu/webapps/bb-auth-provider-cas-bb_bb60/execute/casLogin?cmd=login&authProviderId=_106_1&redirectUrl=https%3A%2F%2Fblackboard.vcu.edu%2Fwebapps%2Fportal%2Fframeset.jsp')
        .wait('body')
        .screenshot(`./logs/${ms(interval, {compact: true})}.png`)
        .exists("#topframe\\.logout\\.label");
}

function loginToCAS(){
    return nightmare
        .goto('https://login.vcu.edu/cas/login')
        .type('#username', process.env.username)
        .type('#password', process.env.password)
        .screenshot('./logs/loginPage.png')
        .click("button")
        .wait("div.msg.success")
        .screenshot('./logs/loggedIn.png');
}

function findUpper(interval){
    console.log(`Checking ${ms(interval, {verbose: true})} interval`);
    setTimeout(()=>{
        console.log(`${ms(interval, {verbose: true})} elapsed`);
        isLoggedIn(interval).then( (isLoggedIn) => {
            if(isLoggedIn){
                console.log(`    Still logged in`);
                findUpper(interval*2);
            } else {
                console.log(`    Login timed out`);
                loginToCAS().then( () => {
                    binarySearch(interval, interval*2);
                }).catch( err => {
                    console.log(err) 
                    console.log("resuming");
                    binarySearch(interval, interval*2);
                });
            }
        }).catch( err => console.log(err) );
    }, interval);
}

function binarySearch(lower, upper){
    let middle = (lower+upper)/2;
    if((upper-lower)<180000) {    //If we know the value within +- 3 minutes, we should be able to guess the real value
        console.log(`Timeout value is within 3 minutes of ${ms(middle,{long: true})}`);
    }
    console.log(`Check ${ms(middle, {verbose: true})} interval`);
    setTimeout(()=>{
        console.log(`${ms(middle, {verbose: true})} elapsed`);
        isLoggedIn(interval).then( (isLoggedIn) => {
            if(isLoggedIn){
                console.log(`    Still logged in`);
                binarySearch(lower,middle);
            } else {
                console.log(`    Login timed out`);
                loginToCAS().then( () => {
                    binarySearch(middle, upper);
                }).catch( err => {
                    console.log(err) 
                    console.log("resuming");
                    binarySearch(middle, upper);
                });
            }
        }).catch( err => console.log(err) );
    }, middle);
}
loginToCAS().then( () => {
    findUpper(startInterval);
}).catch ( (err) => {
        console.log("Could not log in:");
        console.log(err);
        console.log("Maybe your credentials were incorrect? Placing screenshot 'loginFailed' in debug folder");
        nightmare.screenshot('./debug/loginFailed.png').end().then( () => {});
});
