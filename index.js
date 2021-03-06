const startInterval = 1000*60*60*5;
const keepSessionAliveTime = 1000*60*20;
const Nightmare = require('nightmare');
const path = require('path');
const fs = require ('fs');
const ms = require('pretty-ms');

const startTime = Date.now();

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
// function keepSessionAlive(){
//     return nightmare
//         .goto("https://blackboard.vcu.edu/webapps/bb-auth-provider-cas-bb_bb60/execute/casLogin?cmd=login&authProviderId=_106_1&redirectUrl=https%3A%2F%2Fblackboard.vcu.edu%2Fwebapps%2Fportal%2Fframeset.jsp")
//         .wait('body');
// }
function keepSessionAlive(){
    return nightmare
        .goto("https://ssb.vcu.edu/proddad/twbkwbis.P_GenMenu?name=bmenu.P_GenMnu")
        .screenshot(`./logs/keepalive/${new Date().toUTCString().replace(/[,:]/g,'.')}.png`)
        .wait('body');
}

// function isLoggedIn(interval=0){
//     nightmare.cookies.get({ url: null }).then( (cookies) => {
//         fs.writeFile(`./logs/${ms(interval)}.cookie`, cookies.map( cookie => JSON.stringify(cookie)), (err) => {
//             if(err){
//                 console.log(err);
//             }
//         })
//     })
//     return nightmare
//         .goto('https://blackboard.vcu.edu/webapps/bb-auth-provider-cas-bb_bb60/execute/casLogin?cmd=login&authProviderId=_106_1&redirectUrl=https%3A%2F%2Fblackboard.vcu.edu%2Fwebapps%2Fportal%2Fframeset.jsp')
//         .wait('body')
//         .screenshot(`./logs/${ms(interval)}.png`)
//         .exists("#topframe\\.logout\\.label");
// }
function isLoggedIn(interval=0){
    nightmare.cookies.get({ url: null }).then( (cookies) => {
        fs.writeFile(`./logs/${ms(interval)}.cookie`, cookies.map( cookie => JSON.stringify(cookie)), (err) => {
            if(err){
                console.log(err);
            }
        })
    })
    return nightmare
        .goto('https://ssb.vcu.edu/proddad/twbkwbis.P_GenMenu?name=bmenu.P_GenMnu')
        .wait('body')
        .screenshot(`./logs/${ms(interval)}.png`)
        .exists("#ssbbackurl");
}

// function loginToCAS(){
//     return nightmare
//         .goto('https://login.vcu.edu/cas/login')
//         .type('#username', process.env.username)
//         .type('#password', process.env.password)
//         .screenshot('./logs/loginPage.png')
//         .click("button")
//         .wait("div.msg.success")
//         .screenshot('./logs/loggedIn.png');
// }

function loginToCAS(){
    return nightmare
        .goto('https://ssb.vcu.edu/proddad/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu')
        .type('#UserID', process.env.username)
        .type('input[name="PIN"]', process.env.password)
        .screenshot('./logs/loginPage.png')
        .click('input[type="submit"]')
        .wait("#ssbbackurl")
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
                    binarySearch(interval/2, interval);
                }).catch( err => {
                    console.log(err) 
                    console.log("resuming");
                    binarySearch(interval/2, interval);
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
    console.log(`Check ${ms(middle, {verbose: true})} interval between ${ms(lower)} and ${ms(upper)}`);
    setTimeout(()=>{
        console.log(`${ms(middle, {verbose: true})} elapsed`);
        isLoggedIn(middle).then( (loggedIn) => {
            if(loggedIn){
                console.log(`    Still logged in`);
                binarySearch(middle,upper);
            } else {
                console.log(`    Login timed out`);
                loginToCAS().then( () => {
                    binarySearch(lower, middle);
                }).catch( err => {
                    console.log(err) 
                    console.log("resuming");
                    binarySearch(lower, middle);
                });
            }
        }).catch( err => console.log(err) );
    }, middle);
}
function keepAlive(){
    setTimeout(()=>{
        keepSessionAlive().then( () => {
            console.log(`Keep session alive at ${new Date().toUTCString()}`);
            isLoggedIn().then( (loggedIn) => {
                if(loggedIn){
                    keepAlive();
                } else {
                    console.log(`   Login timed out`);
                    console.log(ms(Date.now()-startTime, {verbose: true}));
                }
            }).catch( err => console.log(err));
        });
    }, keepSessionAliveTime);
}
// if(keepSessionAliveTime){
//     keepAlive();
// }
// loginToCAS().then( () => {
//     findUpper(startInterval);
// }).catch ( (err) => {
//         console.log("Could not log in:");
//         console.log(err);
//         console.log("Maybe your credentials were incorrect? Placing screenshot 'loginFailed' in debug folder");
//         nightmare.screenshot('./debug/loginFailed.png').end().then( () => {});
// });
loginToCAS().then( () => {
    keepAlive();
}).catch ( (err) => {
        console.log("Could not log in:");
        console.log(err);
        console.log("Maybe your credentials were incorrect? Placing screenshot 'loginFailed' in debug folder");
        nightmare.screenshot('./debug/loginFailed.png').end().then( () => {});
});